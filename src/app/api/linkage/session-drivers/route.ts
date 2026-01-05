import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RaceSessionV0 from '@/models/RaceSessionV0';
import WebUser from '@/models/WebUser';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * POST /api/linkage/session-drivers
 * Get all drivers who participated in a specific session from race_sessions_v0
 *
 * Body: { sessionId: string }
 * Returns: Array of drivers with their performance in that session
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    try {
      jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId es requerido' },
        { status: 400 }
      );
    }

    await connectDB();

    console.log(`🔍 [SESSION-DRIVERS] Looking for session: ${sessionId}`);

    // Find the race session
    const raceSession = await RaceSessionV0.findOne({ sessionId }).lean();

    if (!raceSession) {
      return NextResponse.json(
        { error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    console.log(`✅ [SESSION-DRIVERS] Found session with ${raceSession.drivers?.length || 0} drivers`);

    // Get all linked users to check who is already linked
    const linkedUsers = await WebUser.find({
      'kartingLink.status': 'linked',
      'kartingLink.driverName': { $exists: true }
    }).select('kartingLink.driverName _id').lean();

    // Create map of driverName -> userId
    const linkedDriversMap = new Map();
    linkedUsers.forEach((user: any) => {
      if (user.kartingLink?.driverName) {
        linkedDriversMap.set(
          user.kartingLink.driverName.toLowerCase(),
          user._id.toString()
        );
      }
    });

    // Extract participants from race session
    const participants = (raceSession.drivers || []).map((driver: any) => {
      const isAlreadyLinked = linkedDriversMap.has(driver.driverName.toLowerCase());

      return {
        driverRaceDataId: null, // Not using legacy system
        driverName: driver.driverName,
        firstName: undefined, // race_sessions_v0 doesn't store first/last names separately
        lastName: undefined,
        isAlreadyLinked,
        totalRaces: 1, // We'd need to count across all sessions to get accurate total
        sessionData: {
          sessionId: raceSession.sessionId,
          sessionName: raceSession.sessionName,
          sessionDate: raceSession.sessionDate,
          bestTime: driver.bestTime || 0,
          bestPosition: driver.finalPosition || 999,
          finalPosition: driver.finalPosition,
          kartNumber: driver.kartNumber,
          totalLaps: driver.totalLaps || 0,
        }
      };
    });

    // Sort by final position (best first)
    participants.sort((a, b) => {
      const posA = a.sessionData.finalPosition || 999;
      const posB = b.sessionData.finalPosition || 999;
      return posA - posB;
    });

    console.log(`📋 [SESSION-DRIVERS] Returning ${participants.length} participants`);

    return NextResponse.json({
      success: true,
      sessionId,
      participants,
      count: participants.length,
    });

  } catch (error: any) {
    console.error('Session drivers fetch error:', error);
    return NextResponse.json(
      { error: 'Error al obtener corredores de la sesión', details: error.message },
      { status: 500 }
    );
  }
}
