import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import RaceSessionV0 from '@/models/RaceSessionV0';
import Squadron from '@/models/Squadron';
import SquadronEvent from '@/models/SquadronEvent';
import WebUser from '@/models/WebUser';

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

    // Obtener el evento
    const event = await SquadronEvent.findById(params.id);
    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    // Obtener la carrera
    const raceSession = await RaceSessionV0.findOne({ sessionId: raceSessionId });
    if (!raceSession) {
      return NextResponse.json({ error: 'Carrera no encontrada' }, { status: 404 });
    }

    console.log(`📊 Calculando puntos para evento: ${event.name}`);
    console.log(`🏁 Carrera: ${raceSession.sessionName}`);
    console.log(`👥 Pilotos en carrera: ${raceSession.drivers.length}`);

    // Guardar linkedRaceSessionId en el evento
    event.linkedRaceSessionId = raceSessionId;

    // Tabla de puntos individuales (1° = 25pts ... 20° = 1pt)
    const getIndividualPoints = (position: number): number => {
      const pointsTable: Record<number, number> = {
        1: 25, 2: 22, 3: 20, 4: 18, 5: 16, 6: 15, 7: 14, 8: 13, 9: 12, 10: 11,
        11: 10, 12: 9, 13: 8, 14: 7, 15: 6, 16: 5, 17: 4, 18: 3, 19: 2, 20: 1
      };
      return pointsTable[position] || 0;
    };

    // APLICAR SANCIONES SI EXISTEN
    const adjustedDrivers = [...raceSession.drivers];
    const sanctions = event.sanctions || [];
    const adjustedResults: Array<{
      driverName: string;
      webUserId?: string;
      originalPosition: number;
      adjustedPosition: number;
      sanctionApplied: boolean;
    }> = [];

    if (sanctions.length > 0) {
      console.log(`\n⚠️  Aplicando ${sanctions.length} sanción(es)...`);

      // Aplicar penalizaciones de posición
      for (const sanction of sanctions) {
        if (sanction.sanctionType === 'position_penalty' && sanction.positionPenalty) {
          const driverIndex = adjustedDrivers.findIndex(
            (d: any) => d.driverName.toLowerCase() === sanction.driverName.toLowerCase()
          );

          if (driverIndex !== -1) {
            const driver = adjustedDrivers[driverIndex];
            const originalPosition = driver.finalPosition;
            const newPosition = originalPosition + sanction.positionPenalty;

            console.log(`   ${sanction.driverName}: ${originalPosition}° → ${newPosition}° (+${sanction.positionPenalty} posiciones)`);

            // Actualizar posición del piloto sancionado
            adjustedDrivers[driverIndex] = {
              ...driver,
              finalPosition: newPosition
            };

            // Recalcular posiciones de otros pilotos afectados
            for (let i = 0; i < adjustedDrivers.length; i++) {
              if (i !== driverIndex) {
                const otherDriver = adjustedDrivers[i];
                const otherOriginalPos = raceSession.drivers[i].finalPosition;

                // Si el piloto estaba después del sancionado, sube una posición
                if (otherOriginalPos > originalPosition && otherOriginalPos <= newPosition) {
                  adjustedDrivers[i] = {
                    ...otherDriver,
                    finalPosition: otherOriginalPos - 1
                  };
                }
              }
            }
          }
        } else if (sanction.sanctionType === 'disqualification') {
          // Descalificado = última posición
          const driverIndex = adjustedDrivers.findIndex(
            (d: any) => d.driverName.toLowerCase() === sanction.driverName.toLowerCase()
          );

          if (driverIndex !== -1) {
            const driver = adjustedDrivers[driverIndex];
            const originalPosition = driver.finalPosition;
            const lastPosition = adjustedDrivers.length;

            console.log(`   ${sanction.driverName}: DESCALIFICADO (${originalPosition}° → ${lastPosition}°)`);

            adjustedDrivers[driverIndex] = {
              ...driver,
              finalPosition: lastPosition
            };
          }
        }
      }

      // Guardar resultados ajustados
      for (let i = 0; i < adjustedDrivers.length; i++) {
        const adjustedDriver = adjustedDrivers[i];
        const originalDriver = raceSession.drivers[i];
        const hasSanction = sanctions.some(
          (s: any) => s.driverName.toLowerCase() === adjustedDriver.driverName.toLowerCase()
        );

        adjustedResults.push({
          driverName: adjustedDriver.driverName,
          webUserId: undefined, // Se llenará después
          originalPosition: originalDriver.finalPosition,
          adjustedPosition: adjustedDriver.finalPosition,
          sanctionApplied: hasSanction
        });
      }

      event.adjustedResults = adjustedResults as any;
    } else {
      console.log(`\n✅ No hay sanciones aplicadas, usando posiciones originales`);
    }

    // Agrupar pilotos por escudería
    const squadronMap = new Map<string, {
      squadronId: string;
      squadronName: string;
      totalPoints: number;
      pilots: Array<{
        webUserId: string;
        driverName: string;
        finalPosition: number;
        individualPoints: number;
        kartNumber: number;
      }>;
    }>();

    // Procesar cada piloto de la carrera (usar posiciones ajustadas si hay sanciones)
    const driversToProcess = sanctions.length > 0 ? adjustedDrivers : raceSession.drivers;

    for (const driver of driversToProcess) {
      // 🔗 NUEVO: Buscar webUserId desde WebUser (SINGLE SOURCE OF TRUTH)
      const webUser = await WebUser.findOne({
        'kartingLink.status': 'linked',
        'kartingLink.driverName': { $regex: new RegExp(`^${driver.driverName}$`, 'i') }
      }).select('_id');

      if (!webUser) {
        console.log(`⚠️  Piloto no vinculado a ningún usuario: ${driver.driverName}`);
        continue;
      }

      const webUserId = webUser._id.toString();

      // Actualizar adjustedResults con webUserId
      if (sanctions.length > 0) {
        const resultIndex = adjustedResults.findIndex(
          (r: any) => r.driverName.toLowerCase() === driver.driverName.toLowerCase()
        );
        if (resultIndex !== -1) {
          adjustedResults[resultIndex].webUserId = webUserId;
        }
      }

      // Buscar la escudería del piloto
      const squadron = await Squadron.findOne({
        members: webUserId,
        isActive: true
      });

      if (!squadron) {
        console.log(`⚠️  Piloto sin escudería: ${driver.driverName} (${webUserId})`);
        continue;
      }

      const individualPoints = getIndividualPoints(driver.finalPosition);

      if (!squadronMap.has(squadron._id.toString())) {
        squadronMap.set(squadron._id.toString(), {
          squadronId: squadron._id.toString(),
          squadronName: squadron.name,
          totalPoints: 0,
          pilots: []
        });
      }

      const squadronData = squadronMap.get(squadron._id.toString())!;
      squadronData.totalPoints += individualPoints;
      squadronData.pilots.push({
        webUserId: webUserId,
        driverName: driver.driverName,
        finalPosition: driver.finalPosition,
        individualPoints,
        kartNumber: driver.kartNumber
      });

      const positionLabel = sanctions.length > 0
        ? `${driver.finalPosition}° (ajustado)`
        : `${driver.finalPosition}°`;
      console.log(`✅ ${driver.driverName} (${positionLabel}) → ${squadron.name} (+${individualPoints} pts)`);
    }

    // Convertir a array y ordenar por puntos totales
    const squadrons = Array.from(squadronMap.values())
      .sort((a, b) => b.totalPoints - a.totalPoints);

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

      console.log(`${position}° ${squadron.squadronName}: ${squadron.totalPoints} pts → +${pointsAwarded} pts (${percentage}%)`);

      return {
        ...squadron,
        position,
        percentageAwarded: percentage,
        pointsAwarded
      };
    });

    // Guardar el evento con linkedRaceSessionId y adjustedResults
    await event.save();

    console.log(`\n💾 Evento guardado con carrera vinculada: ${raceSessionId}`);
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
