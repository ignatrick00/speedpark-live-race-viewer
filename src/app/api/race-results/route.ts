import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DriverRaceData from '@/models/DriverRaceData';

export const dynamic = 'force-dynamic';

interface DriverResult {
  driverName: string;
  position: number;
  bestTime: number;
  lastTime: number;
  averageTime: number;
  totalLaps: number;
  kartNumber: number;
  laps: any[];
}

/**
 * Get final results for a specific race session
 * Query params:
 *  - sessionId: required (e.g. "[HEAT] 82 - Carrera Premium_Mon Dec 01 2025")
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

    console.log(`🏁 [RACE-RESULTS] Fetching results for session: ${sessionId}`);

    // Find all drivers who participated in this session
    const drivers = await DriverRaceData.find({
      'sessions.sessionId': sessionId
    }).lean();

    console.log(`👥 Found ${drivers.length} drivers in this session`);

    const results: DriverResult[] = [];

    drivers.forEach((driver: any) => {
      // Find the specific session
      const session = driver.sessions.find((s: any) => s.sessionId === sessionId);

      if (session) {
        results.push({
          driverName: driver.driverName,
          position: session.finalPosition || session.bestPosition || 999,
          bestTime: session.bestTime || 0,
          lastTime: session.lastTime || 0,
          averageTime: session.averageTime || 0,
          totalLaps: session.totalLaps || 0,
          kartNumber: session.kartNumber || 0,
          laps: session.laps || []
        });
      }
    });

    // Sort by final position
    const sortedResults = results.sort((a, b) => a.position - b.position);

    // Extract session info from first result
    const sessionInfo = drivers.length > 0 && drivers[0].sessions.find((s: any) => s.sessionId === sessionId);

    console.log(`🏆 Returning ${sortedResults.length} driver results`);

    return NextResponse.json({
      success: true,
      sessionId,
      sessionName: sessionInfo?.sessionName || '',
      sessionDate: sessionInfo?.sessionDate || new Date(),
      sessionType: sessionInfo?.sessionType || 'otro',
      results: sortedResults,
      totalDrivers: sortedResults.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching race results:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch race results',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
