import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';
import FriendlyRace from '@/models/FriendlyRace';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(req: NextRequest) {
  console.log('🚀🚀🚀 [CREATE-FRIENDLY] POST REQUEST RECEIVED');
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
    let { name, date, time, kartNumber } = await req.json();
    console.log('📝 [CREATE-FRIENDLY] Received data:', { name, date, time, kartNumber });

    // Validate input
    if (!name || !date || !time) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // If no kart number provided, assign a random one (1-20)
    if (!kartNumber) {
      kartNumber = Math.floor(Math.random() * 20) + 1;
      console.log(`🎲 [CREATE-FRIENDLY] Auto-assigned kart #${kartNumber}`);
    }

    // Validate kart number
    if (kartNumber < 1 || kartNumber > 20) {
      return NextResponse.json(
        { success: false, error: 'Número de kart inválido (1-20)' },
        { status: 400 }
      );
    }

    if (name.trim().length < 3 || name.trim().length > 50) {
      return NextResponse.json(
        { success: false, error: 'El nombre debe tener entre 3 y 50 caracteres' },
        { status: 400 }
      );
    }

    // Parse race date (allow past dates for organizers to link with historical races)
    const raceDate = new Date(date);

    // Create race with creator's selected kart and all required fields
    const race = await FriendlyRace.create({
      name: name.trim(),
      createdBy: userId,
      date: raceDate,
      time,
      participants: [{
        userId,
        kartNumber,
        joinedAt: new Date(),
      }],
      maxParticipants: 12,
      status: 'open',
      // Campos de vinculación (inicializados)
      raceStatus: 'pending',
      linkedRaceSessionId: null,
      results: null,
    });

    console.log(`✅ [CREATE-FRIENDLY-RACE] Race created: ${race._id} by user ${userId} with kart #${kartNumber}`);
    console.log(`   - raceStatus: ${race.raceStatus}`);
    console.log(`   - status: ${race.status}`);

    return NextResponse.json({
      success: true,
      race: {
        _id: race._id,
        name: race.name,
        date: race.date,
        time: race.time,
        participants: race.participants.length,
        maxParticipants: race.maxParticipants,
        status: race.status,
        raceStatus: race.raceStatus,
        linkedRaceSessionId: race.linkedRaceSessionId,
        kartNumber, // Include the selected kart number
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
