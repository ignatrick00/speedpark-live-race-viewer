import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import WebUser from '@/models/WebUser';

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
    kartNumber: {
      type: Number,
      min: 1,
      max: 20,
    },
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
      $or: [
        { status: { $in: ['open', 'full'] } },
        { status: { $exists: false } }, // Include races without status field (old races)
      ],
    })
      .sort({ date: 1, time: 1 })
      .lean();

    console.log(`📊 [FRIENDLY-RACES] Found ${races.length} races in database`);

    // Manually populate users to avoid schema issues
    const formattedRaces = await Promise.all(races.map(async (race: any) => {
      let organizerName = 'Organizador';
      const organizerId = race.createdBy?.toString();

      try {
        const creator = await WebUser.findById(race.createdBy);
        if (creator) {
          organizerName = creator.profile?.alias ||
                         `${creator.profile?.firstName || ''} ${creator.profile?.lastName || ''}`.trim() ||
                         creator.email;
        }
      } catch (err) {
        console.error('Error loading creator:', err);
      }

      const participantsList = await Promise.all(race.participants.map(async (p: any) => {
        let userName = 'Piloto';
        try {
          const user = await WebUser.findById(p.userId);
          if (user) {
            userName = user.profile?.alias ||
                      `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() ||
                      user.email;
          }
        } catch (err) {
          console.error('Error loading participant:', err);
        }

        return {
          userId: p.userId?.toString(),
          kartNumber: p.kartNumber,
          name: userName,
          joinedAt: p.joinedAt,
        };
      }));

      return {
        _id: race._id.toString(),
        name: race.name,
        date: race.date,
        time: race.time,
        type: 'friendly',
        participants: race.participants.length,
        maxParticipants: race.maxParticipants,
        status: race.status,
        organizerName,
        organizerId,
        participantsList,
      };
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
