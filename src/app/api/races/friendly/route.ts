import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Usar el mismo schema que en create-friendly
const FriendlyRaceSchema = new mongoose.Schema({
  name: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'WebUser' },
  date: Date,
  time: String,
  participants: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'WebUser' },
    joinedAt: Date,
  }],
  maxParticipants: Number,
  status: String,
  createdAt: Date,
});

const FriendlyRace = mongoose.models.FriendlyRace || mongoose.model('FriendlyRace', FriendlyRaceSchema);

export async function GET(req: NextRequest) {
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

    // Get all friendly races that are open or in the future
    const races = await FriendlyRace.find({
      date: { $gte: new Date() },
      status: { $in: ['open', 'full'] },
    })
      .populate('createdBy', 'email profile')
      .populate('participants.userId', 'email profile')
      .sort({ date: 1, time: 1 })
      .lean();

    // Format races
    const formattedRaces = races.map((race: any) => ({
      _id: race._id,
      name: race.name,
      date: race.date,
      time: race.time,
      type: 'friendly',
      participants: race.participants.length,
      maxParticipants: race.maxParticipants,
      status: race.status,
      organizerName: race.createdBy?.profile?.alias ||
                     `${race.createdBy?.profile?.firstName} ${race.createdBy?.profile?.lastName}`,
      organizerId: race.createdBy?._id,
    }));

    console.log(`✅ [FRIENDLY-RACES] Returning ${formattedRaces.length} races`);

    return NextResponse.json({
      success: true,
      races: formattedRaces,
      total: formattedRaces.length,
    });

  } catch (error) {
    console.error('❌ [FRIENDLY-RACES] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener carreras',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
