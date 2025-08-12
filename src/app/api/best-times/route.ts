import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import BestDriverTime from '@/models/BestDriverTimes';

export async function GET(request: NextRequest) {
  try {
    console.log('🏆 GET /api/best-times - SUPER FAST VERSION - START');
    
    console.log('🔗 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ MongoDB connected');
    
    console.log('⚡ Fetching pre-calculated best times (INSTANT QUERY)...');
    
    // SUPER FAST: Direct query to pre-calculated records (max 10 documents)
    const records = await BestDriverTime.find().sort({ position: 1 }).limit(10);
    
    const bestTimes = records.map(record => ({
      pos: record.position,
      name: record.driverName,
      time: `${Math.floor(record.bestTime / 60000)}:${Math.floor((record.bestTime % 60000) / 1000).toString().padStart(2, '0')}.${(record.bestTime % 1000).toString().padStart(3, '0')}`,
      details: `Kart #${record.kartNumber} • ${record.sessionTime}`
    }));
    
    console.log(`🏁 INSTANT RESULT: Found ${bestTimes.length} best driver times`);
    
    return NextResponse.json({
      success: true,
      bestTimes: bestTimes,
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