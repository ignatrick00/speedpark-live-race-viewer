import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DriverRaceData from '@/models/DriverRaceData';

export const dynamic = 'force-dynamic';

interface KartRecord {
  driverName: string;
  bestTime: number;
  sessionName: string;
  sessionDate: Date;
  position?: number;
}

/**
 * Get best times for a specific kart number with date filters
 * Query params:
 *  - kartNumber: required (e.g. 18)
 *  - filter: day|week|month|alltime (default: day)
 */
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const kartNumberParam = searchParams.get('kartNumber');
    const filter = searchParams.get('filter') || 'day';

    if (!kartNumberParam) {
      return NextResponse.json(
        { success: false, error: 'kartNumber is required' },
        { status: 400 }
      );
    }

    const kartNumber = parseInt(kartNumberParam);

    console.log(`🏎️ [KART-RECORDS] Fetching records for Kart #${kartNumber} - filter: ${filter}`);

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

    // Build MongoDB query - find sessions with this kart
    const query: any = {
      'sessions.kartNumber': kartNumber
    };

    if (dateFilter) {
      query['sessions.sessionDate'] = { $gte: dateFilter };
    }

    // Get all drivers who used this kart
    const drivers = await DriverRaceData.find(query).lean();

    console.log(`👥 Found ${drivers.length} drivers who used Kart #${kartNumber}`);

    const kartRecords: KartRecord[] = [];

    // Process each driver to find their best time with this kart
    drivers.forEach((driver: any) => {
      // Filter sessions: must be this kart AND within date range
      const relevantSessions = driver.sessions.filter((session: any) => {
        const isCorrectKart = session.kartNumber === kartNumber;
        const isInDateRange = dateFilter ? new Date(session.sessionDate) >= dateFilter : true;
        return isCorrectKart && isInDateRange;
      });

      if (relevantSessions.length === 0) return;

      // Find driver's best time with this kart
      let driverBestTime = Infinity;
      let bestSession: any = null;

      relevantSessions.forEach((session: any) => {
        if (session.bestTime > 0 && session.bestTime < driverBestTime) {
          driverBestTime = session.bestTime;
          bestSession = session;
        }
      });

      if (bestSession && driverBestTime !== Infinity) {
        kartRecords.push({
          driverName: driver.driverName,
          bestTime: driverBestTime,
          sessionName: bestSession.sessionName,
          sessionDate: bestSession.sessionDate
        });
      }
    });

    // Sort by best time and add positions
    const sortedRecords = kartRecords
      .sort((a, b) => a.bestTime - b.bestTime)
      .map((record, index) => ({
        ...record,
        position: index + 1
      }));

    console.log(`🏆 Returning ${sortedRecords.length} records for Kart #${kartNumber} (${filterDescription})`);

    return NextResponse.json({
      success: true,
      kartNumber,
      filter: filterDescription,
      records: sortedRecords,
      totalRecords: sortedRecords.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching kart records:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch kart records',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
