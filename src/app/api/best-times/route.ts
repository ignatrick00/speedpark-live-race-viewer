import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import BestDriverTime from '@/models/BestDriverTimes';

export async function GET(request: NextRequest) {
  try {
    console.log('🏆 GET /api/best-times - SUPER FAST VERSION - START');

    // Get filter parameter (day, week, month)
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'week';

    console.log(`🔗 Connecting to MongoDB... Filter: ${filter}`);
    await connectDB();
    console.log('✅ MongoDB connected');

    console.log('⚡ Fetching pre-calculated best times (INSTANT QUERY)...');

    // Calculate date filter
    const now = new Date();
    let dateFilter: Date;

    switch (filter) {
      case 'day':
        dateFilter = new Date(now.setHours(0, 0, 0, 0)); // Start of today
        break;
      case 'week':
        dateFilter = new Date(now.setDate(now.getDate() - 7)); // 7 days ago
        break;
      case 'month':
        dateFilter = new Date(now.setMonth(now.getMonth() - 1)); // 1 month ago
        break;
      default:
        dateFilter = new Date(now.setDate(now.getDate() - 7)); // Default to week
    }

    // Query with date filter
    const records = await BestDriverTime.find({
      sessionDate: { $gte: dateFilter }
    }).sort({ bestTime: 1 }).limit(10);
    
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