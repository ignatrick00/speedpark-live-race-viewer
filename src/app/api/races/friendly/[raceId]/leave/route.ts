import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';
import FriendlyRace from '@/models/FriendlyRace';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function DELETE(
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

    console.log('🚪 [LEAVE-RACE] RaceId received:', raceId);
    console.log('🚪 [LEAVE-RACE] UserId:', userId);

    // Validate raceId format
    if (!mongoose.Types.ObjectId.isValid(raceId)) {
      console.error('❌ [LEAVE-RACE] Invalid raceId format:', raceId);
      return NextResponse.json(
        { success: false, error: 'ID de carrera inválido' },
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

    // Check if race is already linked or finalized
    if (race.linkedRaceSessionId || race.raceStatus === 'linked' || race.raceStatus === 'finalized') {
      return NextResponse.json(
        { success: false, error: 'No puedes desinscribirte de una carrera que ya ha sido corrida' },
        { status: 400 }
      );
    }

    // Check if user is actually in the race
    const isParticipant = race.participants.some(
      (p: any) => p.userId.toString() === userId
    );

    if (!isParticipant) {
      return NextResponse.json(
        { success: false, error: 'No estás inscrito en esta carrera' },
        { status: 400 }
      );
    }

    // Use atomic update to remove participant
    const updatedRace = await FriendlyRace.findOneAndUpdate(
      {
        _id: raceId,
        'participants.userId': userId, // User must be in race
      },
      {
        $pull: { participants: { userId } },
      },
      { new: true }
    );

    if (!updatedRace) {
      return NextResponse.json(
        { success: false, error: 'No se pudo salir de la carrera' },
        { status: 400 }
      );
    }

    // Note: We don't change status here anymore
    // The 'full' state is determined by participants.length >= maxParticipants
    // Status only tracks confirmation state: 'open' or 'confirmed'

    console.log(`✅ [LEAVE-RACE] User ${userId} left race ${raceId}`);

    return NextResponse.json({
      success: true,
      message: 'Te has desinscrito de la carrera exitosamente',
      race: {
        _id: updatedRace._id,
        name: updatedRace.name,
        participants: updatedRace.participants.length,
      },
    });

  } catch (error) {
    console.error('❌ [LEAVE-RACE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al salir de la carrera',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
