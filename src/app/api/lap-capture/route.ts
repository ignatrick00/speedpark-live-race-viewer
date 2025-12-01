import { NextRequest, NextResponse } from 'next/server';
import LapCaptureService from '@/lib/lapCaptureService';
import DriverRaceDataService from '@/lib/driverRaceDataService';

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
      
      // REACTIVATED: Processing enabled with new real-time records system
      console.log('✅ PROCESSING ENABLED: Calling LapCaptureService with real-time records');
      
      await LapCaptureService.processLapData(sessionData);
      
      return NextResponse.json({
        success: true,
        message: 'Data processed successfully with real-time records system',
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

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const webUserId = searchParams.get('webUserId');

    console.log('📋 GET action:', action, 'webUserId:', webUserId);

    // GET driver summary - returns stats from linked DriverRaceData
    if (action === 'get_driver_summary' && webUserId) {
      const connectDB = (await import('@/lib/mongodb')).default;
      const WebUser = (await import('@/models/WebUser')).default;
      const DriverRaceData = (await import('@/models/DriverRaceData')).default;

      await connectDB();

      // Find user and check if linked
      const user = await WebUser.findById(webUserId).lean();

      if (!user || user.kartingLink?.status !== 'linked' || !user.kartingLink?.personId) {
        console.log('❌ User not linked or not found');
        return NextResponse.json({
          success: false,
          message: 'Usuario no vinculado',
          driverData: null
        });
      }

      // Get driver data
      const driver = await DriverRaceData.findById(user.kartingLink.personId).lean();

      if (!driver) {
        console.log('❌ Driver not found');
        return NextResponse.json({
          success: false,
          message: 'Datos del corredor no encontrados',
          driverData: null
        });
      }

      console.log('✅ Driver found:', driver.driverName, 'Total races:', driver.stats?.totalRaces);

      // Get recent sessions (up to 20)
      const recentSessions = (driver.sessions || [])
        .sort((a: any, b: any) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
        .slice(0, 20);

      return NextResponse.json({
        success: true,
        driverData: driver,
        stats: driver.stats || null,
        recentSessions: recentSessions
      });
    }

    // GET recent sessions
    if (action === 'get_recent_sessions' && webUserId) {
      const connectDB = (await import('@/lib/mongodb')).default;
      const WebUser = (await import('@/models/WebUser')).default;
      const DriverRaceData = (await import('@/models/DriverRaceData')).default;

      await connectDB();

      const limit = parseInt(searchParams.get('limit') || '20');

      // Find user and check if linked
      const user = await WebUser.findById(webUserId).lean();

      if (!user || user.kartingLink?.status !== 'linked' || !user.kartingLink?.personId) {
        return NextResponse.json({
          success: false,
          sessions: [],
          message: 'Usuario no vinculado'
        });
      }

      // Get driver with sessions
      const driver = await DriverRaceData.findById(user.kartingLink.personId)
        .select('sessions')
        .lean();

      if (!driver || !driver.sessions) {
        return NextResponse.json({
          success: false,
          sessions: [],
          message: 'No hay sesiones'
        });
      }

      // Sort sessions by date (newest first) and limit
      const recentSessions = driver.sessions
        .sort((a: any, b: any) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime())
        .slice(0, limit);

      console.log('✅ Found', recentSessions.length, 'recent sessions');

      return NextResponse.json({
        success: true,
        sessions: recentSessions
      });
    }

    // GET driver progression - lap-by-lap data for a specific session
    if (action === 'get_driver_progression' && webUserId) {
      console.log('🔍🔍🔍 PROGRESSION START - webUserId:', webUserId);

      try {
        console.log('STEP 1: Getting sessionId from params');
        const sessionId = searchParams.get('sessionId');
        console.log('STEP 1 DONE: sessionId =', sessionId);

        if (!sessionId) {
          console.log('❌ No sessionId provided');
          return NextResponse.json({
            success: false,
            message: 'Session ID requerido'
          }, { status: 400 });
        }

        console.log('STEP 2: Importing modules');
        const connectDB = (await import('@/lib/mongodb')).default;
        const WebUser = (await import('@/models/WebUser')).default;
        const DriverRaceData = (await import('@/models/DriverRaceData')).default;
        console.log('STEP 2 DONE: Modules imported');

        console.log('STEP 3: Connecting to DB');
        await connectDB();
        console.log('STEP 3 DONE: DB connected');

        console.log('STEP 4: Finding user with ID:', webUserId);
        const user = await WebUser.findById(webUserId).lean();
        console.log('STEP 4 DONE: User found:', !!user, 'Link status:', user?.kartingLink?.status);

        if (!user || user.kartingLink?.status !== 'linked' || !user.kartingLink?.personId) {
          console.log('❌ User not linked');
          return NextResponse.json({
            success: false,
            message: 'Usuario no vinculado',
            progression: []
          });
        }

        console.log('STEP 5: Finding driver with ID:', user.kartingLink.personId);
        const driver = await DriverRaceData.findById(user.kartingLink.personId).lean();
        console.log('STEP 5 DONE: Driver found:', !!driver, 'Sessions count:', driver?.sessions?.length);

        if (!driver || !driver.sessions) {
          console.log('❌ No driver or sessions');
          return NextResponse.json({
            success: false,
            message: 'No hay sesiones',
            progression: []
          });
        }

        console.log('STEP 6: Searching for session with sessionId:', sessionId);
        console.log('STEP 6: Total sessions to search:', driver.sessions.length);

        let session = null;
        for (let i = 0; i < driver.sessions.length; i++) {
          const s = driver.sessions[i] as any;
          console.log(`STEP 6: Checking session ${i}:`, s.sessionId);
          if (s.sessionId === sessionId) {
            session = s;
            console.log('STEP 6: MATCH FOUND at index', i);
            break;
          }
        }

        console.log('STEP 6 DONE: Session found:', !!session);

        if (!session) {
          console.log('❌ Session not found');
          console.log('Available sessions:', driver.sessions.slice(0, 5).map((s: any) => s.sessionId));
          return NextResponse.json({
            success: false,
            message: 'Sesión no encontrada',
            progression: []
          });
        }

        console.log('STEP 7: Session details:', {
          sessionId: session.sessionId,
          sessionName: session.sessionName,
          totalLaps: session.totalLaps,
          lapsArrayLength: session.laps?.length,
          bestTime: session.bestTime,
          sessionType: session.sessionType
        });
        console.log('STEP 7: Converting laps. Total laps:', session.laps?.length);
        const progression = (session.laps || []).map((lap: any, index: number) => {
          console.log(`STEP 7: Processing lap ${index + 1}`);
          return {
            lapNumber: lap.lapNumber || index + 1,
            position: lap.position || 0,
            lapTime: lap.time || 0,
            bestTime: session.bestTime || 0,
            gapToLeader: lap.gapToLeader || '0.000',
            timestamp: lap.timestamp || session.sessionDate,
            isPersonalBest: lap.isPersonalBest || false
          };
        });
        console.log('STEP 7 DONE: Progression array length:', progression.length);

        console.log('STEP 8: Building response');
        const response = {
          success: true,
          progression,
          sessionInfo: {
            sessionName: session.sessionName,
            sessionDate: session.sessionDate,
            totalLaps: session.totalLaps,
            bestLapTime: session.bestTime
          }
        };
        console.log('STEP 8 DONE: Response built');

        console.log('✅✅✅ PROGRESSION SUCCESS');
        return NextResponse.json(response);

      } catch (progressionError) {
        console.error('💥💥💥 ERROR IN PROGRESSION:', progressionError);
        console.error('Stack:', progressionError instanceof Error ? progressionError.stack : 'No stack');
        throw progressionError;
      }
    }

    // GET leaderboard - top drivers by best lap time
    if (action === 'get_leaderboard') {
      const connectDB = (await import('@/lib/mongodb')).default;
      const DriverRaceData = (await import('@/models/DriverRaceData')).default;

      await connectDB();

      const limit = parseInt(searchParams.get('limit') || '10');

      // Get top drivers sorted by allTimeBestLap
      const topDrivers = await DriverRaceData.find({
        'stats.allTimeBestLap': { $gt: 0 } // Only drivers with valid lap times
      })
        .sort({ 'stats.allTimeBestLap': 1 }) // Ascending (fastest first)
        .limit(limit)
        .select('_id driverName webUserId stats.allTimeBestLap stats.totalRaces stats.podiumFinishes stats.bestPosition')
        .lean();

      console.log('✅ Found', topDrivers.length, 'top drivers for leaderboard');

      return NextResponse.json({
        success: true,
        leaderboard: topDrivers.map((driver, index) => ({
          position: index + 1,
          driverName: driver.driverName,
          bestLapTime: driver.stats?.allTimeBestLap || 0,
          totalRaces: driver.stats?.totalRaces || 0,
          podiums: driver.stats?.podiumFinishes || 0,
          bestPosition: driver.stats?.bestPosition || 999,
          webUserId: driver.webUserId || null
        }))
      });
    }

    // GET track records - best times for each kart
    if (action === 'get_track_records') {
      const connectDB = (await import('@/lib/mongodb')).default;
      const BestKartTimes = (await import('@/models/BestKartTimes')).default;

      await connectDB();

      // Get all kart records sorted by time
      const kartRecords = await BestKartTimes.find({})
        .sort({ bestTime: 1 })
        .limit(20)
        .lean();

      console.log('✅ Found', kartRecords.length, 'kart records');

      return NextResponse.json({
        success: true,
        records: kartRecords
      });
    }

    // GET user's leaderboard position (for users not in top 10)
    if (action === 'get_user_leaderboard_position' && webUserId) {
      const connectDB = (await import('@/lib/mongodb')).default;
      const WebUser = (await import('@/models/WebUser')).default;
      const DriverRaceData = (await import('@/models/DriverRaceData')).default;

      await connectDB();

      // Find user and check if linked
      const user = await WebUser.findById(webUserId).lean();

      if (!user || user.kartingLink?.status !== 'linked' || !user.kartingLink?.personId) {
        return NextResponse.json({
          success: false,
          message: 'Usuario no vinculado'
        });
      }

      // Get driver data
      const driver = await DriverRaceData.findById(user.kartingLink.personId).lean();

      if (!driver || !driver.stats?.allTimeBestLap || driver.stats.allTimeBestLap === 0) {
        return NextResponse.json({
          success: false,
          message: 'Sin datos de tiempos'
        });
      }

      // Find position in global leaderboard
      const betterDriversCount = await DriverRaceData.countDocuments({
        'stats.allTimeBestLap': { $gt: 0, $lt: driver.stats.allTimeBestLap }
      });

      const position = betterDriversCount + 1;

      return NextResponse.json({
        success: true,
        position,
        userEntry: {
          position,
          driverName: driver.driverName,
          bestLapTime: driver.stats.allTimeBestLap,
          totalRaces: driver.stats?.totalRaces || 0,
          podiums: driver.stats?.podiumFinishes || 0,
          bestPosition: driver.stats?.bestPosition || 999,
          webUserId: driver.webUserId || null
        }
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Acción GET no válida',
      availableActions: ['get_driver_summary', 'get_recent_sessions', 'get_driver_progression', 'get_leaderboard', 'get_track_records']
    });

  } catch (error) {
    console.error('❌ Error in lap-capture GET:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      {
        error: 'Error getting lap capture data',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}