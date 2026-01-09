import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';
import FriendlyRace from '@/models/FriendlyRace';
import Notification from '@/models/Notification';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

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
    const body = await req.json();
    const { accept, notificationId } = body;

    console.log('⚔️ [CHALLENGE-RESPOND] RaceId:', raceId, 'Accept:', accept, 'NotificationId:', notificationId);

    // Validate raceId format
    if (!mongoose.Types.ObjectId.isValid(raceId)) {
      console.error('❌ [CHALLENGE-RESPOND] Invalid raceId format:', raceId);
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

    // Get notification
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notificación no encontrada' },
        { status: 404 }
      );
    }

    // Verify notification belongs to user
    if (notification.userId.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: 'Notificación no pertenece al usuario' },
        { status: 403 }
      );
    }

    if (accept) {
      // ACCEPT CHALLENGE: Join the race

      // Check if user is already in the race
      const alreadyJoined = race.participants.some(
        (p: any) => p.userId.toString() === userId
      );

      if (alreadyJoined) {
        // Update notification status even if already in race
        await Notification.findByIdAndUpdate(notificationId, {
          $set: {
            read: true,
            'metadata.challengeStatus': 'accepted',
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Ya estás inscrito en esta carrera',
          alreadyInRace: true,
        });
      }

      // Check if race is full
      if (race.participants.length >= race.maxParticipants) {
        return NextResponse.json(
          { success: false, error: 'La carrera está llena' },
          { status: 400 }
        );
      }

      // Auto-assign kart
      const occupiedKarts = race.participants.map((p: any) => p.kartNumber);
      const availableKarts = Array.from({ length: 20 }, (_, i) => i + 1)
        .filter(kart => !occupiedKarts.includes(kart));

      if (availableKarts.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No hay karts disponibles' },
          { status: 400 }
        );
      }

      // Assign random kart from available ones
      const kartNumber = availableKarts[Math.floor(Math.random() * availableKarts.length)];
      console.log('🎲 [CHALLENGE-RESPOND] Auto-assigned kart:', kartNumber);

      // Use atomic update to prevent race conditions
      const newParticipant = {
        userId,
        kartNumber,
        joinedAt: new Date(),
        driverName: user.kartingLink?.driverName || null,
      };

      const updatedRace = await FriendlyRace.findOneAndUpdate(
        {
          _id: raceId,
          'participants.userId': { $ne: userId }, // User not already in race
          $expr: { $lt: [{ $size: '$participants' }, '$maxParticipants'] }, // Not full
        },
        {
          $push: { participants: newParticipant },
        },
        { new: true }
      );

      if (!updatedRace) {
        return NextResponse.json(
          { success: false, error: 'No se pudo unir a la carrera. Puede estar llena o ya estás inscrito.' },
          { status: 400 }
        );
      }

      // Update notification: mark as read and set challengeStatus to 'accepted'
      await Notification.findByIdAndUpdate(notificationId, {
        $set: {
          read: true,
          'metadata.challengeStatus': 'accepted',
        },
      });

      console.log(`✅ [CHALLENGE-RESPOND] User ${userId} accepted challenge and joined race ${raceId} with kart ${kartNumber}`);

      return NextResponse.json({
        success: true,
        message: '¡Has aceptado el desafío! Te has unido a la carrera exitosamente',
        kartNumber,
        race: {
          _id: updatedRace._id,
          name: updatedRace.name,
        },
      });

    } else {
      // REJECT CHALLENGE: Just update notification status
      await Notification.findByIdAndUpdate(notificationId, {
        $set: {
          read: true,
          'metadata.challengeStatus': 'rejected',
        },
      });

      console.log(`✅ [CHALLENGE-RESPOND] User ${userId} rejected challenge for race ${raceId}`);

      return NextResponse.json({
        success: true,
        message: 'Has rechazado el desafío',
      });
    }

  } catch (error) {
    console.error('❌ [CHALLENGE-RESPOND] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al responder al desafío',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
