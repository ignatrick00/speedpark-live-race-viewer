import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import FriendlyRace from '@/models/FriendlyRace';
import RaceSessionV0 from '@/models/RaceSessionV0';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * POST /api/races/friendly/[raceId]/link-session
 * Vincula una carrera amistosa con una sesión de carrera corrida (RaceSessionV0)
 * Body: { raceSessionId: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ raceId: string }> }
) {
  try {
    await connectDB();

    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let userId: string;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      );
    }

    const { raceId } = await params;
    const { raceSessionId } = await req.json();

    if (!raceSessionId) {
      return NextResponse.json(
        { success: false, error: 'raceSessionId es requerido' },
        { status: 400 }
      );
    }

    console.log(`🔗 [LINK-SESSION] Linking friendly race ${raceId} with session ${raceSessionId}`);

    // Get friendly race
    const friendlyRace = await FriendlyRace.findById(raceId);
    if (!friendlyRace) {
      return NextResponse.json(
        { success: false, error: 'Carrera amistosa no encontrada' },
        { status: 404 }
      );
    }

    // Check if user is the creator
    if (friendlyRace.createdBy.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: 'Solo el creador puede vincular esta carrera' },
        { status: 403 }
      );
    }

    // Check if race is already linked
    if (friendlyRace.linkedRaceSessionId) {
      return NextResponse.json(
        { success: false, error: 'Esta carrera ya está vinculada a una sesión' },
        { status: 400 }
      );
    }

    // Get race session to validate it exists
    const raceSession = await RaceSessionV0.findOne({ sessionId: raceSessionId });
    if (!raceSession) {
      return NextResponse.json(
        { success: false, error: 'Sesión de carrera no encontrada' },
        { status: 404 }
      );
    }

    console.log(`✅ [LINK-SESSION] Found race session: ${raceSession.sessionName}`);
    console.log(`📊 [LINK-SESSION] Session has ${raceSession.drivers.length} drivers`);

    // Update friendly race with link
    friendlyRace.linkedRaceSessionId = raceSessionId;
    friendlyRace.raceStatus = 'linked';
    friendlyRace.status = 'finished'; // Mark as finished so it doesn't appear in upcoming/past filters
    friendlyRace.results = {
      sessionId: raceSession.sessionId,
      sessionName: raceSession.sessionName,
      sessionDate: raceSession.sessionDate,
      linkedAt: new Date(),
    };

    await friendlyRace.save();

    console.log(`✅ [LINK-SESSION] Successfully linked race ${raceId} with session ${raceSessionId}`);

    return NextResponse.json({
      success: true,
      message: 'Carrera vinculada exitosamente',
      linkedRaceSessionId: raceSessionId,
      results: friendlyRace.results,
    });

  } catch (error) {
    console.error('❌ [LINK-SESSION] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al vincular la carrera',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
