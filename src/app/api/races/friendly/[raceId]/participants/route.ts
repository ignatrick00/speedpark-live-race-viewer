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

export async function GET(
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

    try {
      jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      );
    }

    const { raceId } = await params;

    // Get race
    const race = await FriendlyRace.findById(raceId)
      .populate('participants.userId', 'email profile')
      .lean();

    if (!race) {
      return NextResponse.json(
        { success: false, error: 'Carrera no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      participants: race.participants.map((p: any) => ({
        userId: p.userId?._id,
        kartNumber: p.kartNumber,
        name: p.userId?.profile?.alias || `${p.userId?.profile?.firstName} ${p.userId?.profile?.lastName}`,
        joinedAt: p.joinedAt,
      })),
    });

  } catch (error) {
    console.error('❌ [GET-PARTICIPANTS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener participantes',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
