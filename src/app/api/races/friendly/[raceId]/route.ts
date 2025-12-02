import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import WebUser from '@/models/WebUser';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Schema
const FriendlyRaceSchema = new mongoose.Schema({
  name: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'WebUser' },
  date: Date,
  time: String,
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'WebUser' },
    kartNumber: Number,
    joinedAt: Date,
  }],
  maxParticipants: Number,
  status: String,
  createdAt: Date,
});

const FriendlyRace = mongoose.models.FriendlyRace || mongoose.model('FriendlyRace', FriendlyRaceSchema);

// DELETE - Eliminar carrera (solo el creador)
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
        { success: false, error: 'Solo el creador puede eliminar esta carrera' },
        { status: 403 }
      );
    }

    // Delete race
    await FriendlyRace.findByIdAndDelete(raceId);

    console.log(`✅ [DELETE-RACE] Race ${raceId} deleted by user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Carrera eliminada exitosamente',
    });

  } catch (error) {
    console.error('❌ [DELETE-RACE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar la carrera',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
