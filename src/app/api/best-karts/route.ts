import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import BestKartTime from '@/models/BestKartTimes';
import LapRecord from '@/models/LapRecord';

export async function GET(request: NextRequest) {
  try {
    console.log('🏎️ GET /api/best-karts - START');

    // Get filter and limit parameters
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'week';
    const limit = parseInt(searchParams.get('limit') || '20');

    console.log(`🔗 Connecting to MongoDB... Filter: ${filter}, Limit: ${limit}`);
    await connectDB();
    console.log('✅ MongoDB connected');

    // Special handling for "day" - query lap_records for today's best karts
    if (filter === 'day') {
      console.log('📅 Fetching best karts of TODAY from lap_records...');

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      // Get all lap records from today
      const todayRecords = await LapRecord.find({
        timestamp: { $gte: startOfToday },
        bestTime: { $gt: 0 },
        kartNumber: { $exists: true, $ne: null }
      }).lean();

      console.log(`📊 Found ${todayRecords.length} lap records from today`);

      // Group by kart and find their best time
      const kartBestTimes = new Map();

      todayRecords.forEach((record: any) => {
        const existing = kartBestTimes.get(record.kartNumber);
        if (!existing || record.bestTime < existing.bestTime) {
          kartBestTimes.set(record.kartNumber, {
            kartNumber: record.kartNumber,
            driverName: record.driverName,
            bestTime: record.bestTime,
            sessionName: record.sessionName,
            sessionTime: new Date(record.timestamp).toLocaleTimeString('es-CL', {
              hour: '2-digit',
              minute: '2-digit'
            })
          });
        }
      });

      // Sort by best time and take top limit
      const records = Array.from(kartBestTimes.values())
        .sort((a, b) => a.bestTime - b.bestTime)
        .slice(0, limit);

      console.log(`🏁 Top ${limit} karts of today: ${records.length} karts`);

      // Format for response
      const bestKarts = records.map((record, index) => ({
        position: index + 1,
        kartNumber: record.kartNumber,
        driverName: record.driverName,
        bestTime: record.bestTime,
        sessionName: record.sessionName,
        sessionDate: new Date(),
        sessionTime: record.sessionTime
      }));

      const bestKartsOldFormat = records.map((record, index) => ({
        kart: record.kartNumber,
        time: `${Math.floor(record.bestTime / 60000)}:${Math.floor((record.bestTime % 60000) / 1000).toString().padStart(2, '0')}.${(record.bestTime % 1000).toString().padStart(3, '0')}`,
        driver: record.driverName,
        details: `${record.sessionTime} • Hoy`
      }));

      return NextResponse.json({
        success: true,
        bestKarts: bestKartsOldFormat,
        bestKartsNew: bestKarts,
        timestamp: new Date().toISOString(),
        totalKarts: bestKarts.length,
        queryMethod: 'lap_records_today'
      });
    }

    // For week, month - use pre-calculated BestKartTime
    console.log('⚡ Fetching pre-calculated best karts...');

    const now = new Date();
    let dateFilter: Date;

    switch (filter) {
      case 'week':
        dateFilter = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        dateFilter = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        dateFilter = new Date(now.setDate(now.getDate() - 7));
    }

    const records = await BestKartTime.find({
      sessionDate: { $gte: dateFilter }
    }).sort({ bestTime: 1 }).limit(limit);

    // New format (for new components)
    const bestKarts = records.map((record, index) => ({
      position: index + 1,
      kartNumber: record.kartNumber,
      driverName: record.driverName,
      bestTime: record.bestTime,
      sessionName: record.sessionName,
      sessionDate: record.sessionDate,
      sessionTime: record.sessionTime
    }));

    // Old format (for backwards compatibility with live timing)
    const bestKartsOldFormat = records.map(record => ({
      kart: record.kartNumber,
      time: `${Math.floor(record.bestTime / 60000)}:${Math.floor((record.bestTime % 60000) / 1000).toString().padStart(2, '0')}.${(record.bestTime % 1000).toString().padStart(3, '0')}`,
      driver: record.driverName,
      details: `${record.sessionTime} • ${record.sessionDate.toLocaleDateString('es-CL')}`
    }));

    console.log(`🏁 INSTANT RESULT: Found ${bestKarts.length} best kart times`);

    return NextResponse.json({
      success: true,
      bestKarts: bestKartsOldFormat, // Keep old format for live timing
      bestKartsNew: bestKarts, // New format for new components
      timestamp: new Date().toISOString(),
      totalKarts: bestKarts.length,
      queryMethod: 'real_time_records',
      queryTime: 'instant'
    });
    
  } catch (error) {
    console.error('❌ CRITICAL ERROR in /api/best-karts:');
    console.error('❌ Error type:', typeof error);
    console.error('❌ Error constructor:', error?.constructor?.name);
    console.error('❌ Error message:', error instanceof Error ? error.message : String(error));
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Error fetching best karts from database',
        details: error instanceof Error ? error.message : String(error),
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}