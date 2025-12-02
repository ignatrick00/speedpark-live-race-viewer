import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Modelo de Carrera Amistosa (inline por ahora)
const FriendlyRaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WebUser',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  maxParticipants: {
    type: Number,
    default: 12,
  },
  status: {
    type: String,
    enum: ['open', 'full', 'started', 'finished', 'cancelled'],
    default: 'open',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const FriendlyRace = mongoose.models.FriendlyRace || mongoose.model('FriendlyRace', FriendlyRaceSchema);

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const authHeader = req.headers.get('authorization');
    console.log('🔐 [CREATE-FRIENDLY] Auth header:', authHeader ? 'Exists' : 'Missing');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [CREATE-FRIENDLY] No auth header or invalid format');
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
      console.log('✅ [CREATE-FRIENDLY] Token verified for user:', userId);
    } catch (error) {
      console.log('❌ [CREATE-FRIENDLY] Token verification failed:', error);
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

    // Parse request body
    const { name, date, time } = await req.json();

    // Validate input
    if (!name || !date || !time) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    if (name.trim().length < 3 || name.trim().length > 50) {
      return NextResponse.json(
        { success: false, error: 'El nombre debe tener entre 3 y 50 caracteres' },
        { status: 400 }
      );
    }

    // Validate date is in the future
    const raceDate = new Date(date);
    if (raceDate < new Date()) {
      return NextResponse.json(
        { success: false, error: 'La fecha debe ser futura' },
        { status: 400 }
      );
    }

    // Create race
    const race = await FriendlyRace.create({
      name: name.trim(),
      createdBy: userId,
      date: raceDate,
      time,
      participants: [{
        userId,
        joinedAt: new Date(),
      }],
    });

    console.log(`✅ [CREATE-FRIENDLY-RACE] Race created: ${race._id} by user ${userId}`);

    // Populate creator info
    const populatedRace = await FriendlyRace.findById(race._id)
      .populate('createdBy', 'email profile')
      .populate('participants.userId', 'email profile')
      .lean();

    return NextResponse.json({
      success: true,
      race: {
        _id: populatedRace._id,
        name: populatedRace.name,
        date: populatedRace.date,
        time: populatedRace.time,
        participants: populatedRace.participants.length,
        maxParticipants: populatedRace.maxParticipants,
        status: populatedRace.status,
        createdBy: populatedRace.createdBy,
      },
      message: 'Carrera creada exitosamente',
    });

  } catch (error) {
    console.error('❌ [CREATE-FRIENDLY-RACE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear la carrera',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
