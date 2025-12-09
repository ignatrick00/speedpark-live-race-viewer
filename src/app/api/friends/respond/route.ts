import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Friendship from '@/models/Friendship';
import Notification from '@/models/Notification';
import WebUser from '@/models/WebUser';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    // Verify JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const body = await request.json();
    const { friendshipId, accept } = body;

    if (!friendshipId || typeof accept !== 'boolean') {
      return NextResponse.json({ error: 'friendshipId y accept requeridos' }, { status: 400 });
    }

    await dbConnect();

    // Find the friendship request
    const friendship = await Friendship.findById(friendshipId);
    if (!friendship) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    // Verify that the current user is the recipient
    if (friendship.friendId.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'No autorizado para responder esta solicitud' }, { status: 403 });
    }

    // Check if already responded
    if (friendship.status !== 'pending') {
      return NextResponse.json({ error: 'Esta solicitud ya fue respondida' }, { status: 400 });
    }

    // Update friendship status
    friendship.status = accept ? 'accepted' : 'rejected';
    friendship.respondedAt = new Date();
    await friendship.save();

    // Create notification for the requester
    const currentUser = await WebUser.findById(decoded.userId);
    const requester = await WebUser.findById(friendship.requestedBy);

    if (accept) {
      await Notification.create({
        userId: friendship.requestedBy,
        type: 'friend_request_accepted',
        title: 'Solicitud de amistad aceptada',
        message: `${currentUser.profile.firstName} ${currentUser.profile.lastName} ha aceptado tu solicitud de amistad`,
        metadata: {
          friendId: decoded.userId,
          friendName: `${currentUser.profile.firstName} ${currentUser.profile.lastName}`,
          friendEmail: currentUser.email
        },
        read: false
      });
    }

    return NextResponse.json({
      message: accept ? 'Solicitud aceptada' : 'Solicitud rechazada',
      friendship: {
        id: friendship._id.toString(),
        status: friendship.status
      }
    });

  } catch (error: any) {
    console.error('Error responding to friend request:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al responder solicitud' }, { status: 500 });
  }
}
