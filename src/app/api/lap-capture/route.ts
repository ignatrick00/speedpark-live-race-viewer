import { NextRequest, NextResponse } from 'next/server';
// import LapCaptureService from '@/lib/lapCaptureService';
// import DriverRaceDataService from '@/lib/driverRaceDataService';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 POST /api/lap-capture - Request received');
    
    let body;
    try {
      body = await request.json();
      console.log('✅ Request body parsed successfully:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error('❌ Error parsing request body:', parseError);
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body',
        details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
      }, { status: 400 });
    }
    
    const { action, sessionData } = body;
    
    // TEST: Simple action that doesn't require complex imports
    if (action === 'test') {
      console.log('🧪 Test action received');
      return NextResponse.json({
        success: true,
        message: 'Test endpoint working',
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === 'process_lap_data' && sessionData) {
      console.log('📥 Received lap data processing request:', {
        sessionName: sessionData.N,
        driversCount: sessionData.D?.length || 0
      });
      
      // TEMPORARY: Return success without processing to test if imports are the issue
      console.log('⚠️ TEMPORARY: Skipping actual processing to test endpoint');
      
      return NextResponse.json({
        success: true,
        message: 'TEMPORARY: Endpoint working, processing skipped for debugging',
        sessionName: sessionData.N,
        driversCount: sessionData.D?.length || 0,
        timestamp: new Date().toISOString()
      });
    }
    
    // All other actions temporarily disabled for debugging
    return NextResponse.json({
      success: false,
      message: 'TEMPORARY: All other actions disabled for debugging',
      availableActions: ['test', 'process_lap_data']
    });
    
  } catch (error) {
    console.error('❌ Error in lap-capture API:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Error processing lap capture request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/lap-capture - Request received');
    
    return NextResponse.json({
      success: true,
      message: 'TEMPORARY: GET endpoint working, all functionality disabled for debugging',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in lap-capture GET:', error);
    return NextResponse.json(
      { 
        error: 'Error getting lap capture data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}