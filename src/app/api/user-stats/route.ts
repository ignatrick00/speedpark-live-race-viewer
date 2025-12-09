import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RaceSessionV0 from '@/models/RaceSessionV0';
import WebUser from '@/models/WebUser';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const webUserId = searchParams.get('webUserId');

    if (!webUserId) {
      return NextResponse.json({
        success: false,
        error: 'webUserId is required'
      }, { status: 400 });
    }

    console.log(`📊 [USER-STATS] Fetching stats for user: ${webUserId}`);

    // 1️⃣ Get user info and check linking status (SINGLE SOURCE OF TRUTH)
    const user = await WebUser.findById(webUserId).lean();

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // Check if user is linked to a driver name
    const kartingLink = (user as any).kartingLink;
    if (!kartingLink || kartingLink.status !== 'linked' || !kartingLink.driverName) {
      console.log(`⚠️ [USER-STATS] User ${webUserId} is not linked to any driver`);
      return NextResponse.json({
        success: true,
        stats: null,
        sessions: [],
        message: 'User not linked to any driver'
      });
    }

    const driverName = kartingLink.driverName;
    console.log(`🔗 [USER-STATS] User linked to driver: "${driverName}"`);

    // 2️⃣ Find all sessions by driverName (case-insensitive)
    const sessions = await RaceSessionV0.aggregate([
      // Unwind drivers array
      { $unwind: '$drivers' },

      // Match sessions where driverName matches (case-insensitive)
      {
        $match: {
          'drivers.driverName': { $regex: new RegExp(`^${driverName}$`, 'i') }
        }
      },

      // Sort by date descending (most recent first)
      { $sort: { sessionDate: -1 } },

      // Project relevant fields
      {
        $project: {
          sessionId: 1,
          sessionDate: 1,
          sessionType: 1,
          driverName: '$drivers.driverName',
          kartNumber: '$drivers.kartNumber',
          position: '$drivers.position',
          totalLaps: '$drivers.totalLaps',
          bestTime: '$drivers.bestTime',
          totalTime: '$drivers.totalTime',
          avgTime: '$drivers.avgTime',
          gap: '$drivers.gap',
          laps: '$drivers.laps'
        }
      }
    ]);

    console.log(`📊 [USER-STATS] Found ${sessions.length} sessions for user`);

    if (sessions.length === 0) {
      return NextResponse.json({
        success: true,
        stats: null,
        sessions: [],
        message: 'No sessions found for this user'
      });
    }

    // 3️⃣ Calculate aggregate statistics
    const totalRaces = sessions.length;
    const totalLaps = sessions.reduce((sum, s) => sum + (s.totalLaps || 0), 0);

    // Best time (minimum valid time)
    const validTimes = sessions.map(s => s.bestTime).filter(t => t && t > 0);
    const bestTime = validTimes.length > 0 ? Math.min(...validTimes) : 0;

    // Average time
    const avgTime = validTimes.length > 0
      ? validTimes.reduce((sum, t) => sum + t, 0) / validTimes.length
      : 0;

    // Best position
    const validPositions = sessions.map(s => s.position).filter(p => p && p > 0);
    const bestPosition = validPositions.length > 0 ? Math.min(...validPositions) : 1;

    // Podium finishes (positions 1, 2, 3)
    const podiumFinishes = sessions.filter(s => s.position && s.position <= 3).length;

    // Favorite kart (most used)
    const kartCounts: { [key: number]: number } = {};
    sessions.forEach(s => {
      if (s.kartNumber) {
        kartCounts[s.kartNumber] = (kartCounts[s.kartNumber] || 0) + 1;
      }
    });
    const favoriteKart = Object.keys(kartCounts).length > 0
      ? parseInt(Object.keys(kartCounts).reduce((a, b) => kartCounts[parseInt(a)] > kartCounts[parseInt(b)] ? a : b))
      : 1;

    // Calculate total spent (17000 per clasificacion, 0 for carreras)
    const totalSpent = sessions.reduce((sum, s) => {
      return sum + (s.sessionType === 'clasificacion' ? 17000 : 0);
    }, 0);

    // Date range
    const dates = sessions.map(s => new Date(s.sessionDate)).sort((a, b) => a.getTime() - b.getTime());
    const firstRace = dates[0];
    const lastRace = dates[dates.length - 1];

    // 4️⃣ Generate monthly progression
    const monthlyData = new Map();
    sessions.forEach(session => {
      const date = new Date(session.sessionDate);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
          races: 0,
          bestTime: 999999,
          bestPosition: 999,
          totalLaps: 0,
          lapTimes: []
        });
      }

      const monthData = monthlyData.get(monthKey);
      monthData.races += 1;
      monthData.bestTime = Math.min(monthData.bestTime, session.bestTime || 999999);
      monthData.bestPosition = Math.min(monthData.bestPosition, session.position || 999);
      monthData.totalLaps += session.totalLaps || 0;

      // Collect lap times if available
      if (session.laps && session.laps.length > 0) {
        session.laps.forEach((lap: any) => {
          if (lap.time && lap.time > 0) {
            monthData.lapTimes.push(lap.time);
          }
        });
      }
    });

    const monthlyProgression = Array.from(monthlyData.values()).map(data => ({
      month: data.month,
      races: data.races,
      bestTime: data.bestTime === 999999 ? 0 : data.bestTime,
      position: data.bestPosition === 999 ? 1 : data.bestPosition,
      avgTime: data.lapTimes.length > 0
        ? data.lapTimes.reduce((sum: number, t: number) => sum + t, 0) / data.lapTimes.length
        : data.bestTime
    }));

    // 5️⃣ Format recent races (last 10)
    const recentRaces = sessions.slice(0, 10).map(session => ({
      date: session.sessionDate,
      sessionName: session.sessionId,
      sessionType: session.sessionType,
      position: session.position,
      kartNumber: session.kartNumber,
      bestTime: session.bestTime,
      totalTime: session.totalTime,
      avgTime: session.avgTime,
      totalLaps: session.totalLaps,
      gap: session.gap,
      laps: session.laps || []
    }));

    const stats = {
      totalRaces,
      totalLaps,
      totalSpent,
      bestTime,
      avgTime,
      bestPosition,
      podiumFinishes,
      favoriteKart,
      firstRace,
      lastRace,
      monthlyProgression,
      recentRaces,
      driverName: sessions[0]?.driverName || null
    };

    console.log(`✅ [USER-STATS] Stats calculated:`, {
      totalRaces,
      totalLaps,
      bestTime,
      bestPosition,
      podiumFinishes
    });

    return NextResponse.json({
      success: true,
      stats,
      sessions: recentRaces
    });

  } catch (error) {
    console.error('❌ [USER-STATS] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
