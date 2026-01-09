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
  console.log('⚔️ [CHALLENGE] POST request received for raceId:', params.raceId);
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

    // Get challenger info
    const challenger = await WebUser.findById(userId);
    if (!challenger) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Get race
    const race = await FriendlyRace.findById(params.raceId);
    if (!race) {
      return NextResponse.json(
        { success: false, error: 'Carrera no encontrada' },
        { status: 404 }
      );
    }

    // Get challenged user ID from request
    const { challengedUserId } = await req.json();
    console.log('⚔️ [CHALLENGE] Challenger:', userId, 'Challenged:', challengedUserId);

    if (!challengedUserId) {
      return NextResponse.json(
        { success: false, error: 'Debes especificar a quién retar' },
        { status: 400 }
      );
    }

    // Verify challenged user exists
    const challengedUser = await WebUser.findById(challengedUserId);
    if (!challengedUser) {
      return NextResponse.json(
        { success: false, error: 'Piloto no encontrado' },
        { status: 404 }
      );
    }

    // Check if challenged user is already in the race
    const alreadyInRace = race.participants.some(
      (p: any) => p.userId.toString() === challengedUserId
    );
    if (alreadyInRace) {
      return NextResponse.json(
        { success: false, error: 'Este piloto ya está inscrito en la carrera' },
        { status: 400 }
      );
    }

    // Check if challenger is trying to challenge themselves
    if (userId === challengedUserId) {
      return NextResponse.json(
        { success: false, error: 'No puedes retarte a ti mismo' },
        { status: 400 }
      );
    }

    // Check for existing pending challenge
    const existingChallenge = await Notification.findOne({
      userId: new mongoose.Types.ObjectId(challengedUserId),
      type: 'duel_challenge',
      'metadata.raceId': params.raceId,
      'metadata.challengerId': userId,
      'metadata.challengeStatus': 'pending'
    });

    if (existingChallenge) {
      return NextResponse.json(
        { success: false, error: 'Ya enviaste un reto a este piloto para esta carrera' },
        { status: 400 }
      );
    }

    // Create challenger name
    const challengerName = challenger.profile?.alias ||
                          `${challenger.profile?.firstName || ''} ${challenger.profile?.lastName || ''}`.trim() ||
                          challenger.email;

    const challengerDriverName = challenger.kartingLink?.driverName || challengerName;

    // Create duel challenge notification
    const notification = await Notification.create({
      userId: challengedUserId,
      type: 'duel_challenge',
      title: '⚔️ ¡Te han retado a un Duelo!',
      message: `${challengerDriverName} te reta a enfrentarte en "${race.name}"`,
      metadata: {
        raceId: params.raceId,
        raceName: race.name,
        raceDate: race.date.toISOString(),
        raceTime: race.time,
        challengerId: userId,
        challengerName,
        challengerDriverName,
        challengeStatus: 'pending'
      },
      read: false
    });

    console.log('✅ [CHALLENGE] Notification created:', notification._id);

    return NextResponse.json({
      success: true,
      message: `¡Reto enviado a ${challengerDriverName}!`,
      notificationId: notification._id
    });

  } catch (error) {
    console.error('❌ [CHALLENGE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al enviar reto',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
