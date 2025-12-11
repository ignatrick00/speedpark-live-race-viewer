import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import RaceSessionV0 from '@/models/RaceSessionV0';
import Squadron from '@/models/Squadron';
import SquadronEvent from '@/models/SquadronEvent';
import WebUser from '@/models/WebUser';
import RaceSanction from '@/models/RaceSanction';

// POST - Calcular puntos basado en una carrera seleccionada
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };

    const user = await WebUser.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const userRoles = (user as any).roles && Array.isArray((user as any).roles)
      ? (user as any).roles
      : ((user as any).role ? [(user as any).role] : ['user']);

    if (!userRoles.includes('organizer')) {
      return NextResponse.json(
        { error: 'Solo los organizadores pueden calcular puntos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { raceSessionId } = body;

    if (!raceSessionId) {
      return NextResponse.json({ error: 'raceSessionId es requerido' }, { status: 400 });
    }

    // Obtener el evento (forzar lectura fresca desde BD)
    const event = await SquadronEvent.findOne({ _id: params.id });
    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    console.log(`\n🔍 [CALCULATE-POINTS] Estado actual del evento: ${event.raceStatus}`);
    console.log(`🔍 [CALCULATE-POINTS] Event ID: ${event._id}`);

    // Si el evento ya está finalizado, no hacer nada
    if (event.raceStatus === 'finalized') {
      console.log(`⚠️  [CALCULATE-POINTS] Evento YA FINALIZADO - Abortando cálculo`);
      return NextResponse.json({
        error: 'El evento ya está finalizado. No se pueden recalcular puntos.',
        raceStatus: 'finalized'
      }, { status: 400 });
    }

    // Obtener la carrera
    const raceSession = await RaceSessionV0.findOne({ sessionId: raceSessionId });
    if (!raceSession) {
      return NextResponse.json({ error: 'Carrera no encontrada' }, { status: 404 });
    }

    console.log(`📊 Calculando puntos para evento: ${event.name}`);
    console.log(`🏁 Carrera: ${raceSession.sessionName}`);
    console.log(`👥 Pilotos en carrera: ${raceSession.drivers.length}`);

    // Guardar linkedRaceSessionId y cambiar status a in_review
    event.linkedRaceSessionId = raceSessionId;
    event.raceStatus = 'in_review';

    console.log(`🔍 Estado de carrera: in_review (esperando aplicación de sanciones)`);

    // Tabla de puntos individuales (1° = 25pts ... 20° = 1pt)
    const getIndividualPoints = (position: number): number => {
      const pointsTable: Record<number, number> = {
        1: 25, 2: 22, 3: 20, 4: 18, 5: 16, 6: 15, 7: 14, 8: 13, 9: 12, 10: 11,
        11: 10, 12: 9, 13: 8, 14: 7, 15: 6, 16: 5, 17: 4, 18: 3, 19: 2, 20: 1
      };
      return pointsTable[position] || 0;
    };

    // APLICAR SANCIONES SI EXISTEN
    // Buscar sanciones desde RaceSanction collection (fuente de verdad)
    const mongoose = require('mongoose');
    const eventObjectId = new mongoose.Types.ObjectId(params.id);
    const sanctionsFromDB = await RaceSanction.find({ eventId: eventObjectId }).lean();

    console.log(`🔍 Sanciones encontradas en RaceSanction: ${sanctionsFromDB.length}`);
    console.log(`🔍 Sanciones en event.sanctions: ${event.sanctions?.length || 0}`);

    const sanctions = sanctionsFromDB;

    console.log(`🔍 Sanciones a aplicar: ${sanctions.length}`);

    // Crear mapa de posiciones ajustadas por nombre de piloto
    const positionAdjustments = new Map<string, {
      originalPosition: number;
      adjustedPosition: number;
      sanctionApplied: boolean;
    }>();

    // Inicializar todas las posiciones originales
    for (const driver of raceSession.drivers) {
      positionAdjustments.set(driver.driverName.toLowerCase(), {
        originalPosition: driver.finalPosition,
        adjustedPosition: driver.finalPosition,
        sanctionApplied: false
      });
    }

    if (sanctions.length > 0) {
      console.log(`\n⚠️  Aplicando ${sanctions.length} sanción(es)...`);

      // Primero, aplicar todas las penalizaciones
      for (const sanction of sanctions) {
        const driverKey = sanction.driverName.toLowerCase();
        const adjustment = positionAdjustments.get(driverKey);

        if (!adjustment) {
          console.log(`   ⚠️ Piloto no encontrado: ${sanction.driverName}`);
          continue;
        }

        if (sanction.sanctionType === 'position_penalty' && sanction.positionPenalty) {
          const originalPos = adjustment.originalPosition;
          const newPos = originalPos + sanction.positionPenalty;

          adjustment.adjustedPosition = newPos;
          adjustment.sanctionApplied = true;

          console.log(`   ${sanction.driverName}: ${originalPos}° → ${newPos}° (+${sanction.positionPenalty} posiciones)`);
        } else if (sanction.sanctionType === 'disqualification') {
          const originalPos = adjustment.originalPosition;
          const lastPosition = raceSession.drivers.length;

          adjustment.adjustedPosition = lastPosition;
          adjustment.sanctionApplied = true;

          console.log(`   ${sanction.driverName}: DESCALIFICADO (${originalPos}° → ${lastPosition}°)`);
        }
      }

      // Ahora, ajustar las posiciones de los pilotos que suben
      for (const sanction of sanctions) {
        if (sanction.sanctionType === 'position_penalty' || sanction.sanctionType === 'disqualification') {
          const sanctionedKey = sanction.driverName.toLowerCase();
          const sanctionedAdj = positionAdjustments.get(sanctionedKey);

          if (!sanctionedAdj) continue;

          const originalPos = sanctionedAdj.originalPosition;
          const newPos = sanctionedAdj.adjustedPosition;

          // Todos los pilotos entre originalPos y newPos suben una posición
          for (const [driverKey, adj] of positionAdjustments) {
            if (driverKey !== sanctionedKey && !adj.sanctionApplied) {
              if (adj.originalPosition > originalPos && adj.originalPosition <= newPos) {
                adj.adjustedPosition = adj.originalPosition - 1;
                console.log(`   ${driverKey}: ${adj.originalPosition}° → ${adj.adjustedPosition}° (beneficiado por sanción)`);
              }
            }
          }
        }
      }

      console.log(`\n📋 Resultados ajustados calculados`);
    } else {
      console.log(`\n✅ No hay sanciones aplicadas, usando posiciones originales`);
    }

    // Agrupar pilotos por escudería
    const squadronMap = new Map<string, {
      squadronId: string;
      squadronName: string;
      totalPoints: number;
      bestPosition: number;
      pilots: Array<{
        webUserId: string;
        driverName: string;
        finalPosition: number;
        individualPoints: number;
        kartNumber: number;
      }>;
    }>();

    // Procesar cada piloto de la carrera con posiciones ajustadas
    for (const driver of raceSession.drivers) {
      // 🔗 Buscar webUserId desde WebUser (SINGLE SOURCE OF TRUTH)
      const webUser = await WebUser.findOne({
        'kartingLink.status': 'linked',
        'kartingLink.driverName': { $regex: new RegExp(`^${driver.driverName}$`, 'i') }
      }).select('_id');

      if (!webUser) {
        console.log(`⚠️  Piloto no vinculado a ningún usuario: ${driver.driverName}`);
        continue;
      }

      const webUserId = webUser._id.toString();

      // Buscar la escudería del piloto
      const squadron = await Squadron.findOne({
        members: webUserId,
        isActive: true
      });

      if (!squadron) {
        console.log(`⚠️  Piloto sin escudería: ${driver.driverName} (${webUserId})`);
        continue;
      }

      // Obtener posición ajustada del mapa
      const adjustment = positionAdjustments.get(driver.driverName.toLowerCase());
      const finalPosition = adjustment ? adjustment.adjustedPosition : driver.finalPosition;

      // Verificar si el piloto fue descalificado
      const isDisqualified = sanctions.some(
        (s: any) => s.driverName.toLowerCase() === driver.driverName.toLowerCase() && s.sanctionType === 'disqualification'
      );

      // Si está descalificado, 0 puntos. Si no, puntos según posición
      const individualPoints = isDisqualified ? 0 : getIndividualPoints(finalPosition);

      if (!squadronMap.has(squadron._id.toString())) {
        squadronMap.set(squadron._id.toString(), {
          squadronId: squadron._id.toString(),
          squadronName: squadron.name,
          totalPoints: 0,
          bestPosition: Infinity,
          pilots: []
        });
      }

      const squadronData = squadronMap.get(squadron._id.toString())!;
      squadronData.totalPoints += individualPoints;
      squadronData.pilots.push({
        webUserId: webUserId,
        driverName: driver.driverName,
        finalPosition: finalPosition,
        individualPoints,
        kartNumber: driver.kartNumber
      });

      // Actualizar mejor posición de la escudería
      squadronData.bestPosition = Math.min(squadronData.bestPosition, finalPosition);

      const positionLabel = isDisqualified
        ? `DSQ (descalificado)`
        : adjustment && adjustment.sanctionApplied
        ? `${finalPosition}° (sancionado: ${adjustment.originalPosition}° → ${finalPosition}°)`
        : adjustment && adjustment.adjustedPosition !== adjustment.originalPosition
        ? `${finalPosition}° (beneficiado: ${adjustment.originalPosition}° → ${finalPosition}°)`
        : `${finalPosition}°`;
      console.log(`✅ ${driver.driverName} (${positionLabel}) → ${squadron.name} (${individualPoints} pts)`);
    }

    // Guardar resultados ajustados en el evento
    let adjustedResults: Array<{
      driverName: string;
      webUserId: string;
      originalPosition: number;
      adjustedPosition: number;
      sanctionApplied: boolean;
    }> = [];

    if (sanctions.length > 0) {

      for (const driver of raceSession.drivers) {
        const webUser = await WebUser.findOne({
          'kartingLink.status': 'linked',
          'kartingLink.driverName': { $regex: new RegExp(`^${driver.driverName}$`, 'i') }
        }).select('_id');

        if (webUser) {
          const adjustment = positionAdjustments.get(driver.driverName.toLowerCase());
          if (adjustment) {
            adjustedResults.push({
              driverName: driver.driverName,
              webUserId: webUser._id.toString(),
              originalPosition: adjustment.originalPosition,
              adjustedPosition: adjustment.adjustedPosition,
              sanctionApplied: adjustment.sanctionApplied
            });
          }
        }
      }

      event.adjustedResults = adjustedResults as any;
    }

    // Convertir a array y ordenar por puntos totales (con desempate por mejor posición)
    const squadrons = Array.from(squadronMap.values())
      .sort((a, b) => {
        // Primer criterio: Mayor puntaje total
        if (b.totalPoints !== a.totalPoints) {
          return b.totalPoints - a.totalPoints;
        }

        // Segundo criterio (desempate): Mejor posición individual
        const bestPositionA = Math.min(...a.pilots.map(p => p.finalPosition));
        const bestPositionB = Math.min(...b.pilots.map(p => p.finalPosition));
        return bestPositionA - bestPositionB; // Menor posición = mejor
      });

    console.log(`\n🏆 Escuderías participantes: ${squadrons.length}`);

    // Calcular puntos otorgados según % del reglamento
    const getPercentageForPosition = (position: number): number => {
      if (position === 1) return 100;
      if (position === 2) return 65;
      if (position === 3) return 45;
      if (position === 4) return 30;
      if (position >= 5 && position <= 8) return 20;
      if (position >= 9 && position <= 16) return 10;
      return 5;
    };

    const basePoints = event.pointsForWinner; // Puntos base del evento según categoría

    const results = squadrons.map((squadron, index) => {
      const position = index + 1;
      const percentage = getPercentageForPosition(position);
      const pointsAwarded = Math.round((basePoints * percentage) / 100);

      console.log(`${position}° ${squadron.squadronName}: ${squadron.totalPoints} pts → +${pointsAwarded} pts (${percentage}%) [Mejor pos: ${squadron.bestPosition}°]`);

      return {
        ...squadron,
        position,
        percentageAwarded: percentage,
        pointsAwarded,
        bestPosition: squadron.bestPosition
      };
    });

    // Guardar el evento con linkedRaceSessionId y adjustedResults
    // IMPORTANTE: Solo guardar si NO está finalizado (para no sobrescribir el estado 'finalized')
    if (event.raceStatus !== 'finalized') {
      await event.save();
      console.log(`\n💾 Evento guardado con carrera vinculada: ${raceSessionId}`);
    } else {
      console.log(`\n⚠️  Evento YA FINALIZADO - NO se guarda para evitar sobrescribir estado`);
    }
    if (sanctions.length > 0) {
      console.log(`   Resultados ajustados guardados (${adjustedResults.length} pilotos)`);
    }

    return NextResponse.json({
      success: true,
      results: {
        raceSessionId,
        raceSessionName: raceSession.sessionName,
        squadrons: results,
        totalSquadrons: results.length,
        sanctionsApplied: sanctions.length,
        adjustedResults: sanctions.length > 0 ? adjustedResults : null
      }
    });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
    console.error('Error calculating points:', error);
    return NextResponse.json({ error: 'Error al calcular puntos' }, { status: 500 });
  }
}
