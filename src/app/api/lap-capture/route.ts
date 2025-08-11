import { NextRequest, NextResponse } from 'next/server';
import LapCaptureService from '@/lib/lapCaptureService';
import DriverRaceDataService from '@/lib/driverRaceDataService';

export async function POST(request: NextRequest) {
  try {
    const { action, sessionData } = await request.json();
    
    if (action === 'process_lap_data' && sessionData) {
      
      // Process the lap-by-lap data with new driver-centric structure
      await LapCaptureService.processLapData(sessionData);
      
      return NextResponse.json({
        success: true,
        message: 'Lap data processed successfully with new driver-centric structure',
        sessionName: sessionData.N,
        driversCount: sessionData.D?.length || 0,
        recordsCreated: sessionData.D?.length || 0,
        dataStructure: 'driver_centric_with_lap_by_lap'
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
      
      // Try NEW driver-centric structure first, fallback to legacy system
      let progression = [];
      
      try {
        const sessionLaps = await DriverRaceDataService.getSessionLaps(webUserId, sessionId);
        
        if (sessionLaps.length > 0) {
          // Convert to progression format expected by chart
          progression = sessionLaps.map(lap => ({
            lapNumber: lap.lapNumber,
            position: lap.position,
            lapTime: lap.time,
            bestTime: lap.time,
            gapToLeader: lap.gapToLeader,
            positionChange: 0,
            isPersonalBest: lap.isPersonalBest,
            timestamp: lap.timestamp
          }));
        }
      } catch (error) {
        console.error('Error getting session laps from new structure:', error);
      }
      
      // Fallback to legacy system if no data found in new structure
      if (progression.length === 0) {
        progression = await LapCaptureService.getDriverLapProgression(webUserId, sessionId);
      }
      
      return NextResponse.json({
        success: true,
        progression,
        totalLaps: progression.length,
        dataSource: progression.length > 0 ? 'hybrid' : 'none'
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
    
    if (action === 'get_lap_by_lap_data') {
      const { webUserId, sessionId } = await request.json();
      
      if (!webUserId || !sessionId) {
        return NextResponse.json(
          { error: 'webUserId and sessionId are required for lap-by-lap data' },
          { status: 400 }
        );
      }
      
      const lapByLapResult = await LapCaptureService.getSessionLapByLap(webUserId, sessionId);
      
      return NextResponse.json({
        success: lapByLapResult.success,
        dataSource: lapByLapResult.source || 'unknown',
        laps: lapByLapResult.laps,
        totalLaps: lapByLapResult.laps?.length || 0,
        error: lapByLapResult.error
      });
    }
    
    if (action === 'get_driver_race_summary') {
      const { webUserId } = await request.json();
      
      if (!webUserId) {
        return NextResponse.json(
          { error: 'webUserId is required' },
          { status: 400 }
        );
      }
      
      const driverData = await DriverRaceDataService.getDriverDataByWebUserId(webUserId);
      
      if (!driverData) {
        return NextResponse.json({
          success: true,
          message: 'No race data found for this driver',
          driverData: null,
          stats: null
        });
      }
      
      return NextResponse.json({
        success: true,
        driverData: {
          driverName: driverData.driverName,
          firstName: driverData.firstName,
          lastName: driverData.lastName,
          alias: driverData.alias,
          linkingStatus: driverData.linkingStatus,
          totalSessions: driverData.sessions.length
        },
        stats: driverData.stats,
        recentSessions: driverData.sessions.slice(-10).reverse() // Last 10 sessions, most recent first
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
    console.error('Error in lap-capture API:', error);
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
        sessions: recentSessions,
        dataStructure: 'enhanced_with_lap_by_lap'
      });
    }
    
    if (action === 'get_lap_by_lap_data' && webUserId && sessionId) {
      const lapByLapResult = await LapCaptureService.getSessionLapByLap(webUserId, sessionId);
      
      return NextResponse.json({
        success: lapByLapResult.success,
        dataSource: lapByLapResult.source || 'unknown',
        laps: lapByLapResult.laps,
        totalLaps: lapByLapResult.laps?.length || 0,
        error: lapByLapResult.error
      });
    }
    
    if (action === 'get_driver_summary' && webUserId) {
      
      const driverData = await DriverRaceDataService.getDriverDataByWebUserId(webUserId);
      
      if (!driverData) {
        const allDrivers = await DriverRaceDataService.getAllDrivers();
        
        return NextResponse.json({
          success: true,
          message: 'No race data found for this driver',
          driverData: null,
          debug: {
            searchedWebUserId: webUserId,
            totalDriversInSystem: allDrivers.length,
            driversWithWebUserId: allDrivers.filter(d => d.webUserId).length
          }
        });
      }
      
      return NextResponse.json({
        success: true,
        driverData: {
          driverName: driverData.driverName,
          firstName: driverData.firstName,
          lastName: driverData.lastName,
          alias: driverData.alias,
          linkingStatus: driverData.linkingStatus,
          totalSessions: driverData.sessions.length
        },
        stats: driverData.stats,
        recentSessions: driverData.sessions.slice(-5), // Include recent sessions with lap data
        sessionsCount: driverData.sessions.length
      });
    }
    
    if (action === 'get_driver_progression' && webUserId && sessionId) {
      // Try NEW driver-centric structure first, fallback to legacy system
      let progression = [];
      
      try {
        const sessionLaps = await DriverRaceDataService.getSessionLaps(webUserId, sessionId);
        
        if (sessionLaps.length > 0) {
          // Convert to progression format expected by chart
          progression = sessionLaps.map(lap => ({
            lapNumber: lap.lapNumber,
            position: lap.position,
            lapTime: lap.time,
            bestTime: lap.time,
            gapToLeader: lap.gapToLeader,
            positionChange: 0,
            isPersonalBest: lap.isPersonalBest,
            timestamp: lap.timestamp
          }));
        }
      } catch (error) {
        console.error('Error getting session laps from new structure:', error);
      }
      
      // Fallback to legacy system if no data found in new structure
      if (progression.length === 0) {
        progression = await LapCaptureService.getDriverLapProgression(webUserId, sessionId);
      }
      
      return NextResponse.json({
        success: true,
        progression,
        totalLaps: progression.length,
        dataSource: progression.length > 0 ? 'hybrid' : 'none'
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
    console.error('Error in lap-capture GET:', error);
    return NextResponse.json(
      { 
        error: 'Error getting lap capture data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}