import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DriverRaceData from '@/models/DriverRaceData';

export const dynamic = 'force-dynamic';

interface RaceSession {
  sessionId: string;
  sessionName: string;
  sessionDate: Date;
  sessionType: string;
  driverCount: number;
  totalLaps: number;
}

/**
 * Get all unique race sessions, optionally filtered by date
 * Query params:
 *  - date: YYYY-MM-DD (optional) - get races for specific date
 */
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    let dateFilter: any = {};

    if (dateParam) {
      // Parse date and create range for the entire day
      const startDate = new Date(dateParam);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(dateParam);
      endDate.setHours(23, 59, 59, 999);

      dateFilter = {
        'sessions.sessionDate': {
          $gte: startDate,
          $lte: endDate
        }
      };

      console.log(`🏁 [RACES] Fetching races for date: ${dateParam}`);
    } else {
      console.log(`🏁 [RACES] Fetching all races`);
    }

    // Get all drivers with sessions matching the filter
    const drivers = await DriverRaceData.find(dateFilter).lean();

    console.log(`👥 Found ${drivers.length} drivers with sessions`);

    // Collect all unique sessions
    const sessionMap = new Map<string, any>();

    drivers.forEach((driver: any) => {
      driver.sessions.forEach((session: any) => {
        const sessionDate = new Date(session.sessionDate);

        // Apply date filter if specified
        if (dateParam) {
          const startDate = new Date(dateParam);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(dateParam);
          endDate.setHours(23, 59, 59, 999);

          if (sessionDate < startDate || sessionDate > endDate) {
            return; // Skip sessions outside the date range
          }
        }

        const sessionId = session.sessionId;

        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, {
            sessionId: session.sessionId,
            sessionName: session.sessionName,
            sessionDate: session.sessionDate,
            sessionType: session.sessionType,
            driverCount: 1,
            totalLaps: session.laps?.length || 0
          });
        } else {
          const existing = sessionMap.get(sessionId);
          existing.driverCount++;
          existing.totalLaps += session.laps?.length || 0;
        }
      });
    });

    // Convert to array and sort by date (most recent first)
    const races = Array.from(sessionMap.values())
      .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
      .map(race => ({
        ...race,
        sessionDate: new Date(race.sessionDate).toISOString(),
        displayDate: new Date(race.sessionDate).toLocaleDateString('es-CL', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        displayTime: new Date(race.sessionDate).toLocaleTimeString('es-CL', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }));

    console.log(`🏆 Returning ${races.length} unique races`);

    return NextResponse.json({
      success: true,
      races,
      totalRaces: races.length,
      date: dateParam || 'all',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching races:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch races',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
