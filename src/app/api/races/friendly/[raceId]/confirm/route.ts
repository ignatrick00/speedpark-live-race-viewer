import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import FriendlyRace from '@/models/FriendlyRace';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// POST - Confirmar carrera (solo el creador)
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

    // Validate raceId format
    if (!mongoose.Types.ObjectId.isValid(raceId)) {
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

    // Check if user is the creator
    if (race.createdBy.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: 'Solo el creador puede confirmar esta carrera' },
        { status: 403 }
      );
    }

    // Check if race already confirmed
    if (race.status === 'confirmed') {
      return NextResponse.json(
        { success: false, error: 'La carrera ya está confirmada' },
        { status: 400 }
      );
    }

    // Update race status to confirmed
    race.status = 'confirmed';
    await race.save();

    console.log(`✅ [CONFIRM-RACE] Race ${raceId} confirmed by user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Evento confirmado con Speedpark. Los participantes pueden seguir uniéndose si hay cupos.',
    });

  } catch (error) {
    console.error('❌ [CONFIRM-RACE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al confirmar la carrera',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
