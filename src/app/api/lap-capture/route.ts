import { NextRequest, NextResponse } from 'next/server';
import LapCaptureService from '@/lib/lapCaptureService';

export async function POST(request: NextRequest) {
  try {
    const { action, sessionData } = await request.json();
    
    if (action === 'process_lap_data' && sessionData) {
      console.log(`🏁 API: Processing lap data for "${sessionData.N}"`);
      
      // Process the lap-by-lap data
      await LapCaptureService.processLapData(sessionData);
      
      return NextResponse.json({
        success: true,
        message: 'Lap data processed successfully',
        sessionName: sessionData.N,
        driversCount: sessionData.D?.length || 0,
        recordsCreated: sessionData.D?.length || 0 // Each driver creates one record per update
      });
    }
    
    if (action === 'get_driver_progression') {
      const { webUserId, sessionId } = await request.json();
      
      if (!webUserId || !sessionId) {
        return NextResponse.json(
          { error: 'webUserId and sessionId are required' },
          { status: 400 }
        );
      }
      
      const progression = await LapCaptureService.getDriverLapProgression(webUserId, sessionId);
      
      return NextResponse.json({
        success: true,
        progression,
        totalLaps: progression.length
      });
    }
    
    if (action === 'get_recent_sessions') {
      const { webUserId, limit } = await request.json();
      
      if (!webUserId) {
        return NextResponse.json(
          { error: 'webUserId is required' },
          { status: 400 }
        );
      }
      
      const recentSessions = await LapCaptureService.getRecentSessionLaps(webUserId, limit || 5);
      
      return NextResponse.json({
        success: true,
        sessions: recentSessions
      });
    }
    
    if (action === 'get_session_progression') {
      const { sessionId } = await request.json();
      
      if (!sessionId) {
        return NextResponse.json(
          { error: 'sessionId is required' },
          { status: 400 }
        );
      }
      
      const progression = await LapCaptureService.getSessionPositionProgression(sessionId);
      
      return NextResponse.json({
        success: true,
        progression
      });
    }
    
    if (action === 'cleanup_old_records') {
      const deletedCount = await LapCaptureService.cleanupOldRecords();
      
      return NextResponse.json({
        success: true,
        message: `Cleaned up ${deletedCount} old records`,
        deletedCount
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('❌ Error in lap-capture API:', error);
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
    const searchParams = request.nextUrl.searchParams;
    const webUserId = searchParams.get('webUserId');
    const sessionId = searchParams.get('sessionId');
    const action = searchParams.get('action') || 'get_recent_sessions';
    
    if (action === 'get_recent_sessions' && webUserId) {
      const limit = parseInt(searchParams.get('limit') || '5');
      const recentSessions = await LapCaptureService.getRecentSessionLaps(webUserId, limit);
      
      return NextResponse.json({
        success: true,
        sessions: recentSessions
      });
    }
    
    if (action === 'get_driver_progression' && webUserId && sessionId) {
      const progression = await LapCaptureService.getDriverLapProgression(webUserId, sessionId);
      
      return NextResponse.json({
        success: true,
        progression,
        totalLaps: progression.length
      });
    }
    
    if (action === 'get_session_progression' && sessionId) {
      const progression = await LapCaptureService.getSessionPositionProgression(sessionId);
      
      return NextResponse.json({
        success: true,
        progression
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid parameters. Provide webUserId and/or sessionId based on action.' },
      { status: 400 }
    );
    
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