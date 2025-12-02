import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import BestDriverTime from '@/models/BestDriverTimes';
import LapRecord from '@/models/LapRecord';

export async function GET(request: NextRequest) {
  try {
    console.log('🏆 GET /api/best-times - START');

    // Get filter parameter (day, week, month, alltime)
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'week';

    console.log(`🔗 Connecting to MongoDB... Filter: ${filter}`);
    await connectDB();
    console.log('✅ MongoDB connected');

    // Special handling for "day" - query lap_records for today's best times
    if (filter === 'day') {
      console.log('📅 Fetching best times of TODAY from lap_records...');

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // Get all lap records from today
      const todayRecords = await LapRecord.find({
        timestamp: { $gte: startOfToday },
        bestTime: { $gt: 0 }
      }).lean();

      console.log(`📊 Found ${todayRecords.length} lap records from today`);

      // Group by driver and find their best time
      const driverBestTimes = new Map();

      todayRecords.forEach((record: any) => {
        const existing = driverBestTimes.get(record.driverName);
        if (!existing || record.bestTime < existing.bestTime) {
          driverBestTimes.set(record.driverName, {
            driverName: record.driverName,
            bestTime: record.bestTime,
            kartNumber: record.kartNumber,
            sessionName: record.sessionName,
            sessionTime: new Date(record.timestamp).toLocaleTimeString('es-CL', {
              hour: '2-digit',
              minute: '2-digit'
            })
          });
        }
      });

      // Sort by best time and take top 10
      const records = Array.from(driverBestTimes.values())
        .sort((a, b) => a.bestTime - b.bestTime)
        .slice(0, 10);

      console.log(`🏁 Top 10 of today: ${records.length} drivers`);

      // Format for response
      const bestTimes = records.map((record, index) => ({
        position: index + 1,
        driverName: record.driverName,
        bestTime: record.bestTime,
        kartNumber: record.kartNumber,
        sessionName: record.sessionName,
        sessionDate: new Date(),
        sessionTime: record.sessionTime
      }));

      const bestTimesOldFormat = records.map((record, index) => ({
        pos: index + 1,
        name: record.driverName,
        time: `${Math.floor(record.bestTime / 60000)}:${Math.floor((record.bestTime % 60000) / 1000).toString().padStart(2, '0')}.${(record.bestTime % 1000).toString().padStart(3, '0')}`,
        details: `Kart #${record.kartNumber} • ${record.sessionTime}`
      }));

      return NextResponse.json({
        success: true,
        bestTimes: bestTimesOldFormat,
        bestTimesNew: bestTimes,
        timestamp: new Date().toISOString(),
        totalDrivers: bestTimes.length,
        queryMethod: 'lap_records_today'
      });
    }

    // For week, month, alltime - use pre-calculated BestDriverTime
    console.log('⚡ Fetching pre-calculated best times...');

    const now = new Date();
    let dateFilter: Date | null = null;

    switch (filter) {
      case 'week':
        dateFilter = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        dateFilter = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case 'alltime':
        dateFilter = null;
        break;
      default:
        dateFilter = new Date(now.setDate(now.getDate() - 7));
    }

    const query = dateFilter ? { sessionDate: { $gte: dateFilter } } : {};
    const records = await BestDriverTime.find(query).sort({ bestTime: 1 }).limit(10);
    
    // New format (for new components)
    const bestTimes = records.map((record, index) => ({
      position: index + 1,
      driverName: record.driverName,
      bestTime: record.bestTime,
      kartNumber: record.kartNumber,
      sessionName: record.sessionName,
      sessionDate: record.sessionDate,
      sessionTime: record.sessionTime
    }));

    // Old format (for backwards compatibility with live timing)
    const bestTimesOldFormat = records.map(record => ({
      pos: record.position,
      name: record.driverName,
      time: `${Math.floor(record.bestTime / 60000)}:${Math.floor((record.bestTime % 60000) / 1000).toString().padStart(2, '0')}.${(record.bestTime % 1000).toString().padStart(3, '0')}`,
      details: `Kart #${record.kartNumber} • ${record.sessionTime}`
    }));

    console.log(`🏁 INSTANT RESULT: Found ${bestTimes.length} best driver times`);

    return NextResponse.json({
      success: true,
      bestTimes: bestTimesOldFormat, // Keep old format for live timing
      bestTimesNew: bestTimes, // New format for new components
      timestamp: new Date().toISOString(),
      totalDrivers: bestTimes.length,
      queryMethod: 'real_time_records',
      queryTime: 'instant'
    });
    
  } catch (error) {
    console.error('❌ CRITICAL ERROR in /api/best-times:');
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error constructor:', error?.constructor?.name);
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error fetching best times from database',
        details: error instanceof Error ? error.message : String(error),
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}