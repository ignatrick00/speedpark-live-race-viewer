import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';
import FriendlyRace from '@/models/FriendlyRace';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

    // Get user
    const user = await WebUser.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const { raceId } = await params;
    const { kartNumber } = await req.json();

    console.log('🏁 [JOIN-RACE] RaceId received:', raceId);
    console.log('🏁 [JOIN-RACE] KartNumber received:', kartNumber);

    // Validate raceId format
    if (!mongoose.Types.ObjectId.isValid(raceId)) {
      console.error('❌ [JOIN-RACE] Invalid raceId format:', raceId);
      return NextResponse.json(
        { success: false, error: 'ID de carrera inválido' },
        { status: 400 }
      );
    }

    // Validate kart number
    if (!kartNumber || kartNumber < 1 || kartNumber > 20) {
      return NextResponse.json(
        { success: false, error: 'Número de kart inválido (1-20)' },
        { status: 400 }
      );
    }

    // Get race
    const race = await FriendlyRace.findById(raceId);
    if (!race) {
      return NextResponse.json(
        { success: false, error: 'Carrera no encontrada' },
        { status: 404 }
      );
    }

    // Check if race is full
    if (race.participants.length >= race.maxParticipants) {
      return NextResponse.json(
        { success: false, error: 'La carrera está llena' },
        { status: 400 }
      );
    }

    // Check if user is already in the race
    const alreadyJoined = race.participants.some(
      (p: any) => p.userId.toString() === userId
    );
    if (alreadyJoined) {
      return NextResponse.json(
        { success: false, error: 'Ya estás inscrito en esta carrera' },
        { status: 400 }
      );
    }

    // Check if kart is already taken
    const kartTaken = race.participants.some(
      (p: any) => p.kartNumber === kartNumber
    );
    if (kartTaken) {
      return NextResponse.json(
        { success: false, error: 'Este kart ya está ocupado' },
        { status: 400 }
      );
    }

    // Add user to race
    race.participants.push({
      userId,
      kartNumber,
      joinedAt: new Date(),
    });

    // Update status if full
    if (race.participants.length >= race.maxParticipants) {
      race.status = 'full';
    }

    await race.save();

    console.log(`✅ [JOIN-RACE] User ${userId} joined race ${raceId} with kart ${kartNumber}`);

    return NextResponse.json({
      success: true,
      message: 'Te has unido a la carrera exitosamente',
      race: {
        _id: race._id,
        name: race.name,
        kartNumber,
      },
    });

  } catch (error) {
    console.error('❌ [JOIN-RACE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al unirse a la carrera',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
