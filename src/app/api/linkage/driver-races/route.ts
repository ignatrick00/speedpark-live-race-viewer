import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RaceSessionV0 from '@/models/RaceSessionV0';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * POST /api/linkage/driver-races
 * Get all races where a specific driver participated
 *
 * Body: { driverName: string }
 * Returns: Array of race sessions where this driver participated
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
    const { driverName } = body;

    if (!driverName || driverName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nombre del corredor es requerido' },
        { status: 400 }
      );
    }

    await connectDB();

    const searchTerm = driverName.trim();

    console.log(`🏁 [DRIVER-RACES] Searching races for driver: "${searchTerm}"`);

    // Find all race sessions where this driver participated
    const sessions = await RaceSessionV0.find({
      sessionType: 'carrera',
      sessionName: {
        $not: {
          $regex: /f1|f2|f3|k 1|k 2|k 3|k1|k2|k3|gt|mujeres|women|junior| m(?!\w)/i
        }
      },
      'drivers.driverName': {
        $regex: new RegExp(`^${searchTerm}$`, 'i')
      }
    })
      .select('sessionId sessionName sessionDate totalDrivers')
      .sort({ sessionDate: -1 })
      .limit(50)
      .lean();

    console.log(`✅ [DRIVER-RACES] Found ${sessions.length} races for driver "${searchTerm}"`);

    // Format response
    const formattedSessions = sessions.map((session: any) => ({
      sessionId: session.sessionId,
      sessionName: session.sessionName,
      sessionDate: session.sessionDate,
      participantCount: session.totalDrivers || 0,
    }));

    return NextResponse.json({
      success: true,
      driverName: searchTerm,
      sessions: formattedSessions,
      count: formattedSessions.length,
    });

  } catch (error: any) {
    console.error('Driver races fetch error:', error);
    return NextResponse.json(
      { error: 'Error al obtener carreras del corredor', details: error.message },
      { status: 500 }
    );
  }
}
