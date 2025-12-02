import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DriverRaceData from '@/models/DriverRaceData';

export const dynamic = 'force-dynamic';

interface BestTimeEntry {
  driverName: string;
  bestTime: number;
  kartNumber: number;
  sessionName: string;
  sessionTime: string;
}

/**
 * NEW API - Reads from driver_race_data collection
 * Replaces legacy lap_records approach
 */
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'day';

    console.log(`🏁 [BEST-TIMES-V2] Fetching best times - filter: ${filter}`);

    let dateFilter: Date | undefined;
    let filterDescription = '';

    // Determine date filter
    if (filter === 'day') {
      dateFilter = new Date();
      dateFilter.setHours(0, 0, 0, 0);
      filterDescription = 'today';
    } else if (filter === 'week') {
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 7);
      filterDescription = 'last 7 days';
    } else if (filter === 'month') {
      dateFilter = new Date();
      dateFilter.setDate(dateFilter.getDate() - 30);
      filterDescription = 'last 30 days';
    } else if (filter === 'alltime') {
      dateFilter = undefined;
      filterDescription = 'all time';
    }

    console.log(`📅 Date filter: ${filterDescription} (${dateFilter ? dateFilter.toISOString() : 'none'})`);

    // Build MongoDB query
    const query: any = {};
    if (dateFilter) {
      query['sessions.sessionDate'] = { $gte: dateFilter };
    }

    // Get all drivers with sessions in the date range
    const drivers = await DriverRaceData.find(query).lean();

    console.log(`👥 Found ${drivers.length} drivers with sessions in range`);

    const bestTimes: BestTimeEntry[] = [];

    // Process each driver to find their best time in the date range
    drivers.forEach((driver: any) => {
      // Filter sessions by date
      const filteredSessions = driver.sessions.filter((session: any) => {
        if (!dateFilter) return true;
        return new Date(session.sessionDate) >= dateFilter;
      });

      if (filteredSessions.length === 0) return;

      // Find best time across all filtered sessions
      let driverBestTime = Infinity;
      let bestSession: any = null;

      filteredSessions.forEach((session: any) => {
        if (session.bestTime > 0 && session.bestTime < driverBestTime) {
          driverBestTime = session.bestTime;
          bestSession = session;
        }
      });

      if (bestSession && driverBestTime !== Infinity) {
        bestTimes.push({
          driverName: driver.driverName,
          bestTime: driverBestTime,
          kartNumber: bestSession.kartNumber || 0,
          sessionName: bestSession.sessionName,
          sessionTime: new Date(bestSession.sessionDate).toLocaleTimeString('es-CL', {
            hour: '2-digit',
            minute: '2-digit'
          })
        });
      }
    });

    // Sort by best time and take top 10
    const sortedTimes = bestTimes
      .sort((a, b) => a.bestTime - b.bestTime)
      .slice(0, 10)
      .map((entry, index) => ({
        ...entry,
        position: index + 1
      }));

    console.log(`🏆 Returning ${sortedTimes.length} best times for ${filterDescription}`);

    // Format for old API compatibility
    const bestTimesOldFormat = sortedTimes.map((entry, index) => ({
      _id: `${entry.driverName}_${filter}`,
      driverName: entry.driverName,
      bestTime: entry.bestTime,
      kartNumber: entry.kartNumber,
      sessionName: entry.sessionName,
      position: index + 1,
      timestamp: new Date().toISOString()
    }));

    return NextResponse.json({
      success: true,
      bestTimes: bestTimesOldFormat, // Old format for compatibility
      bestTimesNew: sortedTimes, // New format
      filter: filterDescription,
      timestamp: new Date().toISOString(),
      totalDrivers: sortedTimes.length,
      source: 'driver_race_data',
      version: 'v2'
    });

  } catch (error) {
    console.error('❌ Error fetching best times:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch best times',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
