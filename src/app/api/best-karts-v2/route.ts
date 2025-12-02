import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DriverRaceData from '@/models/DriverRaceData';

export const dynamic = 'force-dynamic';

interface BestKartEntry {
  kartNumber: number;
  bestTime: number;
  driverName: string;
  sessionName: string;
  sessionTime: string;
}

/**
 * NEW API - Reads from driver_race_data collection
 * Finds best kart times across all drivers
 */
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'day';

    console.log(`🏎️ [BEST-KARTS-V2] Fetching best kart times - filter: ${filter}`);

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

    // Map to track best time per kart
    const kartBestTimes = new Map<number, BestKartEntry>();

    // Process each driver's sessions
    drivers.forEach((driver: any) => {
      // Filter sessions by date
      const filteredSessions = driver.sessions.filter((session: any) => {
        if (!dateFilter) return true;
        return new Date(session.sessionDate) >= dateFilter;
      });

      filteredSessions.forEach((session: any) => {
        const kartNumber = session.kartNumber;
        const bestTime = session.bestTime;

        if (!kartNumber || !bestTime || bestTime <= 0) return;

        const existing = kartBestTimes.get(kartNumber);

        if (!existing || bestTime < existing.bestTime) {
          kartBestTimes.set(kartNumber, {
            kartNumber,
            bestTime,
            driverName: driver.driverName,
            sessionName: session.sessionName,
            sessionTime: new Date(session.sessionDate).toLocaleTimeString('es-CL', {
              hour: '2-digit',
              minute: '2-digit'
            })
          });
        }
      });
    });

    // Sort by best time and take top 10
    const sortedKarts = Array.from(kartBestTimes.values())
      .sort((a, b) => a.bestTime - b.bestTime)
      .slice(0, 10);

    console.log(`🏆 Returning ${sortedKarts.length} best kart times for ${filterDescription}`);

    // Format time helper
    const formatTime = (timeMs: number) => {
      if (!timeMs || timeMs === 0) return '--:--';
      const minutes = Math.floor(timeMs / 60000);
      const seconds = ((timeMs % 60000) / 1000).toFixed(3);
      return `${minutes}:${parseFloat(seconds).toFixed(3).padStart(6, '0')}`;
    };

    // Format for old API compatibility (what LiveRaceViewer expects)
    const bestKartsOldFormat = sortedKarts.map((entry, index) => ({
      _id: `kart_${entry.kartNumber}_${filter}`,
      kart: entry.kartNumber,           // Old format field name
      kartNumber: entry.kartNumber,      // Keep both for compatibility
      driver: entry.driverName,          // Old format field name
      driverName: entry.driverName,      // Keep both
      time: formatTime(entry.bestTime),  // Old format: formatted string
      bestTime: entry.bestTime,          // Keep raw ms value
      sessionName: entry.sessionName,
      position: index + 1,
      timestamp: new Date().toISOString()
    }));

    return NextResponse.json({
      success: true,
      bestKarts: bestKartsOldFormat, // Old format for compatibility
      bestKartsNew: sortedKarts, // New format
      filter: filterDescription,
      timestamp: new Date().toISOString(),
      totalKarts: sortedKarts.length,
      source: 'driver_race_data',
      version: 'v2'
    });

  } catch (error) {
    console.error('❌ Error fetching best kart times:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch best kart times',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
