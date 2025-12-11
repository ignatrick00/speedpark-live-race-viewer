import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import SquadronEvent from '@/models/SquadronEvent';
import Squadron from '@/models/Squadron';
import SquadronPointsHistory from '@/models/SquadronPointsHistory';
import WebUser from '@/models/WebUser';
import Notification from '@/models/Notification';
import RaceSessionV0 from '@/models/RaceSessionV0';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// POST - Finalizar resultados y aplicar puntos a las escuderías
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log(`\n\n🚨🚨🚨 [FINALIZE ENDPOINT] CALLED - Event ID: ${params.id}`);
  console.log(`🚨 Process ID: ${process.pid}`);
  console.log(`🚨 Timestamp: ${new Date().toISOString()}`);

  try {
    await connectDB();
    console.log(`✅ [FINALIZE] DB connected`);

    // Verificar autenticación
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let userId: string;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Verificar que sea organizador
    const user = await WebUser.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const userRoles = (user as any).roles && Array.isArray((user as any).roles)
      ? (user as any).roles
      : ((user as any).role ? [(user as any).role] : ['user']);

    if (!userRoles.includes('organizer')) {
      return NextResponse.json(
        { error: 'Solo los organizadores pueden finalizar eventos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { calculatedResults } = body;

    if (!calculatedResults || !calculatedResults.squadrons) {
      return NextResponse.json(
        { error: 'calculatedResults es requerido' },
        { status: 400 }
      );
    }

    // Obtener el evento
    const event = await SquadronEvent.findById(params.id);
    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    if (event.raceStatus !== 'in_review') {
      return NextResponse.json(
        { error: `El evento debe estar en estado 'in_review' para finalizar (actual: ${event.raceStatus})` },
        { status: 400 }
      );
    }

    console.log(`🏁 Finalizando resultados del evento: ${event.name}`);
    console.log(`📊 Aplicando puntos a ${calculatedResults.squadrons.length} escuderías`);

    const appliedPoints: any[] = [];

    // Aplicar puntos a cada escudería
    for (const squadronResult of calculatedResults.squadrons) {
      const squadron = await Squadron.findById(squadronResult.squadronId);
      if (!squadron) {
        console.warn(`⚠️  Escudería no encontrada: ${squadronResult.squadronId}`);
        continue;
      }

      const previousTotal = squadron.totalPoints || 0;
      const pointsToAdd = squadronResult.pointsAwarded;
      const newTotal = previousTotal + pointsToAdd;

      // Actualizar puntos de la escudería
      squadron.totalPoints = newTotal;
      await squadron.save();

      // Crear registro de auditoría
      await SquadronPointsHistory.create({
        squadronId: squadron._id,
        raceEventId: event._id,
        pointsChange: pointsToAdd,
        previousTotal,
        newTotal,
        reason: `Evento: ${event.name} - Posición ${squadronResult.position}° (${squadronResult.percentageAwarded}%)`,
        changeType: 'race_event',
        modifiedBy: userId,
        metadata: {
          eventName: event.name,
          eventCategory: event.category,
          position: squadronResult.position,
          raceSessionId: event.linkedRaceSessionId
        }
      });

      appliedPoints.push({
        squadronId: squadron._id.toString(),
        squadronName: squadron.name,
        position: squadronResult.position,
        pointsAwarded: pointsToAdd,
        previousTotal,
        newTotal
      });

      console.log(`✅ ${squadron.name}: +${pointsToAdd} pts (${previousTotal} → ${newTotal})`);
    }

    // Enviar notificaciones a pilotos sancionados
    if (event.sanctions && event.sanctions.length > 0) {
      console.log(`📧 Enviando ${event.sanctions.length} notificaciones de sanciones...`);

      const raceSession = await RaceSessionV0.findOne({ sessionId: event.linkedRaceSessionId });

      for (const sanction of event.sanctions) {
        await Notification.create({
          userId: sanction.webUserId,
          type: 'race_sanction',
          title: '⚠️ Sanción aplicada en carrera',
          message: `Se te ha aplicado una sanción en el evento "${event.name}": ${sanction.description}`,
          metadata: {
            eventId: event._id.toString(),
            eventName: event.name,
            raceSessionId: event.linkedRaceSessionId,
            raceSessionName: raceSession?.sessionName || 'Carrera',
            sanctionType: sanction.sanctionType,
            positionPenalty: sanction.positionPenalty,
            pointsPenalty: sanction.pointsPenalty,
            description: sanction.description
          },
          read: false
        });

        console.log(`  📨 Notificación enviada a: ${sanction.driverName}`);
      }
    }

    // Actualizar estado del evento
    const mongoose = require('mongoose');

    console.log(`\n🔍 [DEBUG] Datos recibidos de calculatedResults:`);
    console.log(`📊 Total squadrons: ${calculatedResults.squadrons.length}`);
    console.log(`📊 Primer squadron:`, {
      squadronId: calculatedResults.squadrons[0].squadronId,
      squadronName: calculatedResults.squadrons[0].squadronName,
      pointsAwarded: calculatedResults.squadrons[0].pointsAwarded,
      pilots: calculatedResults.squadrons[0].pilots.length
    });

    console.log(`\n🔍 [CRITICAL DEBUG] Estado ANTES de modificar:`);
    console.log(`   - event.raceStatus: ${event.raceStatus}`);
    console.log(`   - event._id: ${event._id}`);
    console.log(`   - event.isModified('raceStatus'): ${event.isModified('raceStatus')}`);

    // Actualizar estado del evento usando set() explícito
    event.set('raceStatus', 'finalized');
    event.set('finalizedAt', new Date());

    console.log(`\n🔍 [CRITICAL DEBUG] Estado DESPUÉS de set():`);
    console.log(`   - event.raceStatus: ${event.raceStatus}`);
    console.log(`   - event.get('raceStatus'): ${event.get('raceStatus')}`);
    console.log(`   - event.isModified('raceStatus'): ${event.isModified('raceStatus')}`);

    // Construir results
    const resultsData = calculatedResults.squadrons.map((s: any, index: number) => ({
      squadronId: new mongoose.Types.ObjectId(s.squadronId),
      position: index + 1,
      pointsEarned: s.pointsAwarded,
      totalTime: 0,
      bestLapTime: 0,
      pilots: s.pilots.map((p: any) => ({
        pilotId: new mongoose.Types.ObjectId(p.webUserId),
        lapTimes: [],
        bestLap: 0,
        position: p.finalPosition
      }))
    }));

    event.set('results', resultsData);

    console.log(`\n📊 [DEBUG] Datos a guardar:`);
    console.log(`   - raceStatus: ${event.raceStatus}`);
    console.log(`   - Total results: ${resultsData.length}`);
    console.log(`   - event.isModified('results'): ${event.isModified('results')}`);
    console.log(`   - event.isModified('finalizedAt'): ${event.isModified('finalizedAt')}`);
    console.log(`   - event.modifiedPaths():`, event.modifiedPaths());

    console.log(`\n🔍 [ANTES de save]:`);
    console.log(`   - event.raceStatus: ${event.raceStatus}`);
    console.log(`   - Validating document...`);

    // Validar antes de guardar
    const validationError = event.validateSync();
    if (validationError) {
      console.error(`❌ [VALIDATION ERROR]:`, validationError);
      throw validationError;
    }
    console.log(`✅ [VALIDATION] Documento válido`);

    // Guardar con opciones explícitas
    const savedDoc = await event.save({ validateBeforeSave: true });

    console.log(`\n🔍 [DESPUÉS de save]:`);
    console.log(`   - savedDoc.raceStatus: ${savedDoc.raceStatus}`);
    console.log(`   - savedDoc._id: ${savedDoc._id}`);

    // Releer de BD con query fresca
    const freshEvent = await SquadronEvent.findById(event._id).lean();
    console.log(`\n🔍 [FRESH FROM DB - usando .lean()]:`);
    console.log(`   - raceStatus: ${freshEvent?.raceStatus}`);
    console.log(`   - finalizedAt: ${freshEvent?.finalizedAt}`);
    console.log(`   - results.length: ${freshEvent?.results?.length || 0}`);

    // Verificar conexión a BD
    console.log(`\n🔍 [DB CONNECTION]:`);
    console.log(`   - Connection name: ${mongoose.connection.name}`);
    console.log(`   - Connection host: ${mongoose.connection.host}`);
    console.log(`   - Connection state: ${mongoose.connection.readyState}`); // 1 = connected

    // Hacer una query DIRECTA sin usar el modelo para verificar
    const directQuery = await mongoose.connection.db.collection('squadronevents').findOne(
      { _id: new mongoose.Types.ObjectId(event._id) },
      { projection: { _id: 1, name: 1, raceStatus: 1, finalizedAt: 1 } }
    );
    console.log(`\n🔍 [DIRECT DB QUERY - sin Mongoose model]:`);
    console.log(`   - _id: ${directQuery?._id}`);
    console.log(`   - name: ${directQuery?.name}`);
    console.log(`   - raceStatus: ${directQuery?.raceStatus}`);
    console.log(`   - finalizedAt: ${directQuery?.finalizedAt}`);

    console.log(`\n✅ Evento guardado exitosamente`);
    console.log(`📌 raceStatus después de save: ${event.raceStatus}`);

    return NextResponse.json({
      success: true,
      message: 'Resultados finalizados y puntos aplicados exitosamente',
      appliedPoints,
      sanctionsNotified: event.sanctions?.length || 0
    });

  } catch (error: any) {
    console.error('Error finalizing event:', error);
    return NextResponse.json(
      { error: 'Error al finalizar evento', details: error.message },
      { status: 500 }
    );
  }
}
