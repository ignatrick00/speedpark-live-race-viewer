import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DriverRaceData from '@/models/DriverRaceData';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * POST /api/linkage/session-drivers
 * Get all drivers who participated in a specific session
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

    // Find all drivers who participated in this session
    const drivers = await DriverRaceData.find({
      'sessions.sessionId': sessionId
    })
      .select('driverName firstName lastName sessions linkingStatus webUserId stats _id')
      .lean();

    // Extract session data for each driver
    const participants = drivers.map((driver: any) => {
      const session = driver.sessions.find((s: any) => s.sessionId === sessionId);

      return {
        driverRaceDataId: driver._id,
        driverName: driver.driverName,
        firstName: driver.firstName,
        lastName: driver.lastName,
        isAlreadyLinked: driver.linkingStatus === 'linked' || !!driver.webUserId,
        totalRaces: driver.stats.totalRaces,
        // Session-specific data
        sessionData: {
          sessionId: session.sessionId,
          sessionName: session.sessionName,
          sessionDate: session.sessionDate,
          bestTime: session.bestTime,
          bestPosition: session.bestPosition,
          finalPosition: session.finalPosition,
          kartNumber: session.kartNumber,
          totalLaps: session.totalLaps,
        }
      };
    });

    // Sort by position (best first)
    participants.sort((a, b) => {
      const posA = a.sessionData.bestPosition || 999;
      const posB = b.sessionData.bestPosition || 999;
      return posA - posB;
    });

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
