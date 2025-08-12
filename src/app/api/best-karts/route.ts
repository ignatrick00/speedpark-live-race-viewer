import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import BestKartTime from '@/models/BestKartTimes';

export async function GET(request: NextRequest) {
  try {
    console.log('🏎️ GET /api/best-karts - SUPER FAST VERSION - START');
    
    console.log('🔗 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ MongoDB connected');
    
    console.log('⚡ Fetching pre-calculated best karts (INSTANT QUERY)...');
    
    // SUPER FAST: Direct query to pre-calculated records (max 20 documents)
    const bestKarts = await BestKartTime.getTop20ForDisplay();
    
    console.log(`🏁 INSTANT RESULT: Found ${bestKarts.length} best kart times`);
    
    return NextResponse.json({
      success: true,
      bestKarts: bestKarts,
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