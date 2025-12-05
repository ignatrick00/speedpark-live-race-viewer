import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RaceSessionV0 from '@/models/RaceSessionV0';

export const dynamic = 'force-dynamic';

/**
 * GET /api/race-results-v0?sessionId=...
 * Obtener carrera completa con todos los pilotos y vueltas
 */
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    console.log(`🏁 [RACE-RESULTS-V0] Fetching race: ${sessionId}`);

    // Buscar carrera completa
    const race = await RaceSessionV0.findOne({ sessionId }).lean();

    if (!race) {
      return NextResponse.json(
        { success: false, error: 'Race not found' },
        { status: 404 }
      );
    }

    console.log(`📊 [RACE-RESULTS-V0] Found race with ${race.drivers.length} drivers`);

    // Formatear datos para frontend
    const formattedRace = {
      sessionId: race.sessionId,
      sessionName: race.sessionName,
      sessionDate: race.sessionDate.toISOString(),
      sessionType: race.sessionType,
      totalDrivers: race.totalDrivers,
      totalLaps: race.totalLaps,
      drivers: race.drivers
        .map(driver => ({
          driverName: driver.driverName,
          finalPosition: driver.finalPosition,
          kartNumber: driver.kartNumber,
          totalLaps: driver.totalLaps,
          bestTime: driver.bestTime,
          lastTime: driver.lastTime,
          averageTime: driver.averageTime,
          gapToLeader: driver.gapToLeader,
          laps: driver.laps.map(lap => ({
            lapNumber: lap.lapNumber,
            time: lap.time,
            position: lap.position,
            timestamp: lap.timestamp,
            gapToLeader: lap.gapToLeader,
            isPersonalBest: lap.isPersonalBest
          }))
        }))
        .sort((a, b) => a.finalPosition - b.finalPosition) // Ordenar por posición
    };

    return NextResponse.json({
      success: true,
      race: formattedRace,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [RACE-RESULTS-V0] Error fetching race results:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch race results V0',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
