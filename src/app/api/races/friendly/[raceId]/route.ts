import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import FriendlyRace from '@/models/FriendlyRace';
import WebUser from '@/models/WebUser';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// GET - Obtener carrera por ID (pública)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ raceId: string }> }
) {
  try {
    await connectDB();

    const { raceId } = await params;

    // Validate raceId format
    if (!mongoose.Types.ObjectId.isValid(raceId)) {
      return NextResponse.json(
        { success: false, error: 'ID de carrera inválido' },
        { status: 400 }
      );
    }

    // Find race
    const race = await FriendlyRace.findById(raceId).lean();

    if (!race) {
      return NextResponse.json(
        { success: false, error: 'Carrera no encontrada' },
        { status: 404 }
      );
    }

    // Get organizer info
    let organizerName = 'Organizador';
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

    // Get participants info
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
      };
    }));

    const formattedRace = {
      _id: race._id.toString(),
      name: race.name,
      date: race.date,
      time: race.time,
      location: race.location,
      maxParticipants: race.maxParticipants,
      participants: race.participants.length,
      status: race.status,
      raceStatus: race.raceStatus,
      organizerName,
      organizerId: race.createdBy?.toString(),
      participantsList,
    };

    return NextResponse.json({
      success: true,
      race: formattedRace,
    });

  } catch (error) {
    console.error('Error fetching race:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener la carrera' },
      { status: 500 }
    );
  }
}

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
