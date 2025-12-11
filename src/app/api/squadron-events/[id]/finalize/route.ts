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
  try {
    await connectDB();

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

    console.log(`\n🔍 [ANTES] event.raceStatus: ${event.raceStatus}`);

    event.raceStatus = 'finalized';
    event.finalizedAt = new Date();

    console.log(`🔍 [DESPUÉS de asignar] event.raceStatus: ${event.raceStatus}`);

    event.results = calculatedResults.squadrons.map((s: any, index: number) => ({
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
    })) as any;

    console.log(`\n📊 [DEBUG] Datos a guardar en event.results:`);
    console.log(`📊 raceStatus: ${event.raceStatus}`);
    console.log(`📊 Total results: ${event.results.length}`);
    console.log(`📊 Primer resultado:`, {
      squadronId: event.results[0].squadronId,
      squadronIdType: event.results[0].squadronId.constructor.name,
      position: event.results[0].position,
      pointsEarned: event.results[0].pointsEarned,
      pilots: event.results[0].pilots.length
    });

    // Force Mongoose to detect changes
    event.markModified('raceStatus');
    event.markModified('results');
    event.markModified('finalizedAt');

    console.log(`🔍 [ANTES de save] event.raceStatus: ${event.raceStatus}`);

    await event.save();

    console.log(`🔍 [DESPUÉS de save] Releyendo evento de BD...`);
    const savedEvent = await SquadronEvent.findById(event._id);
    console.log(`🔍 raceStatus en BD: ${savedEvent?.raceStatus}`);

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
