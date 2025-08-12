import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import BestDriverTime from '@/models/BestDriverTimes';
import BestKartTime from '@/models/BestKartTimes';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Checking collections status...');
    
    await connectDB();
    console.log('✅ Connected to MongoDB');
    
    // Check best_driver_times collection
    const driverCount = await BestDriverTime.countDocuments();
    const driverSample = await BestDriverTime.find().limit(3);
    
    // Check best_kart_times collection  
    const kartCount = await BestKartTime.countDocuments();
    const kartSample = await BestKartTime.find().limit(3);
    
    console.log(`📊 Collections status:
    - best_driver_times: ${driverCount} documents
    - best_kart_times: ${kartCount} documents`);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      database: 'Connected successfully',
      collections: {
        best_driver_times: {
          count: driverCount,
          sample: driverSample
        },
        best_kart_times: {
          count: kartCount,
          sample: kartSample
        }
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
        MONGODB_URI_PREFIX: process.env.MONGODB_URI?.substring(0, 20) + '...'
      }
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}