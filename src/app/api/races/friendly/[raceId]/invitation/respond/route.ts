import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import FriendlyRace from '@/models/FriendlyRace';
import WebUser from '@/models/WebUser';
import Notification from '@/models/Notification';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(
  req: NextRequest,
  { params }: { params: { raceId: string } }
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

    // Get request body
    const { notificationId, accept } = await req.json();

    if (!notificationId || typeof accept !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    // Get notification
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Invitación no encontrada' },
        { status: 404 }
      );
    }

    // Verify notification belongs to user
    if (notification.userId.toString() !== userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Verify notification is for race invitation
    if (notification.type !== 'friendly_race_invitation') {
      return NextResponse.json(
        { success: false, error: 'Tipo de notificación inválido' },
        { status: 400 }
      );
    }

    // Verify invitation is still pending
    if (notification.metadata.invitationStatus !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Invitación ya procesada' },
        { status: 400 }
      );
    }

    // Get race
    const race = await FriendlyRace.findById(params.raceId);
    if (!race) {
      // Mark invitation as expired
      notification.metadata.invitationStatus = 'expired';
      await notification.save();
      return NextResponse.json(
        { success: false, error: 'Carrera no encontrada' },
        { status: 404 }
      );
    }

    // If user rejects
    if (!accept) {
      notification.metadata.invitationStatus = 'rejected';
      notification.read = true;
      await notification.save();

      return NextResponse.json({
        success: true,
        message: 'Invitación rechazada',
        action: 'rejected'
      });
    }

    // If user accepts - verify conditions

    // Check if user is already in the race
    const alreadyInRace = race.participants.some(
      (p) => p.userId.toString() === userId
    );

    if (alreadyInRace) {
      notification.metadata.invitationStatus = 'expired';
      await notification.save();
      return NextResponse.json(
        { success: false, error: 'Ya estás inscrito en esta carrera' },
        { status: 400 }
      );
    }

    // Check if race is full
    if (race.participants.length >= race.maxParticipants) {
      notification.metadata.invitationStatus = 'expired';
      await notification.save();
      return NextResponse.json(
        { success: false, error: 'La carrera está llena' },
        { status: 400 }
      );
    }

    // Check if race date has passed
    if (new Date(race.date) < new Date()) {
      notification.metadata.invitationStatus = 'expired';
      await notification.save();
      return NextResponse.json(
        { success: false, error: 'La carrera ya pasó' },
        { status: 400 }
      );
    }

    // Get user info for driver name
    const user = await WebUser.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Assign random kart number
    const usedKartNumbers = race.participants.map(p => p.kartNumber);
    let kartNumber: number;

    do {
      kartNumber = Math.floor(Math.random() * 20) + 1;
    } while (usedKartNumbers.includes(kartNumber));

    // Add user to race
    race.participants.push({
      userId: new mongoose.Types.ObjectId(userId),
      kartNumber,
      joinedAt: new Date(),
      driverName: user.kartingLink?.driverName || undefined
    });

    // Update race status if it becomes full
    if (race.participants.length >= race.maxParticipants) {
      race.status = 'full';
    }

    await race.save();

    // Update notification
    notification.metadata.invitationStatus = 'accepted';
    notification.read = true;
    await notification.save();

    // Expire other pending invitations for this race (since it might be full now)
    if (race.status === 'full') {
      await Notification.updateMany(
        {
          type: 'friendly_race_invitation',
          'metadata.raceId': params.raceId,
          'metadata.invitationStatus': 'pending'
        },
        {
          $set: { 'metadata.invitationStatus': 'expired' }
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Te has unido a la carrera exitosamente',
      action: 'accepted',
      race: {
        _id: race._id,
        name: race.name,
        date: race.date,
        time: race.time,
        participants: race.participants.length,
        maxParticipants: race.maxParticipants,
        kartNumber
      }
    });

  } catch (error) {
    console.error('Error responding to race invitation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar la respuesta',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
