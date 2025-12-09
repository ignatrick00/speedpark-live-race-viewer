import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Friendship from '@/models/Friendship';
import WebUser from '@/models/WebUser';
import Notification from '@/models/Notification';

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
    const { friendId } = body;

    if (!friendId) {
      return NextResponse.json({ error: 'friendId requerido' }, { status: 400 });
    }

    // Can't send request to yourself
    if (decoded.userId === friendId) {
      return NextResponse.json({ error: 'No puedes enviarte solicitud a ti mismo' }, { status: 400 });
    }

    await dbConnect();

    // Check if friend exists
    const friend = await WebUser.findById(friendId);
    if (!friend) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Check if friendship already exists (in either direction)
    const existingFriendship = await Friendship.findOne({
      $or: [
        { userId: decoded.userId, friendId: friendId },
        { userId: friendId, friendId: decoded.userId }
      ]
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return NextResponse.json({ error: 'Ya son amigos' }, { status: 400 });
      } else if (existingFriendship.status === 'pending') {
        return NextResponse.json({ error: 'Ya existe una solicitud pendiente' }, { status: 400 });
      } else if (existingFriendship.status === 'rejected') {
        // Allow resending after rejection - update the existing record
        existingFriendship.status = 'pending';
        existingFriendship.requestedBy = decoded.userId;
        existingFriendship.userId = decoded.userId;
        existingFriendship.friendId = friendId;
        existingFriendship.respondedAt = null;
        await existingFriendship.save();

        // Create notification
        const currentUser = await WebUser.findById(decoded.userId);
        await Notification.create({
          userId: friendId,
          type: 'friend_request',
          title: 'Nueva solicitud de amistad',
          message: `${currentUser.profile.firstName} ${currentUser.profile.lastName} te ha enviado una solicitud de amistad`,
          metadata: {
            friendId: decoded.userId,
            friendName: `${currentUser.profile.firstName} ${currentUser.profile.lastName}`,
            friendEmail: currentUser.email
          },
          read: false
        });

        return NextResponse.json({
          message: 'Solicitud de amistad enviada',
          friendshipId: existingFriendship._id.toString()
        });
      }
    }

    // Create new friendship request
    const friendship = await Friendship.create({
      userId: decoded.userId,
      friendId: friendId,
      status: 'pending',
      requestedBy: decoded.userId
    });

    // Create notification for the friend
    const currentUser = await WebUser.findById(decoded.userId);
    await Notification.create({
      userId: friendId,
      type: 'friend_request',
      title: 'Nueva solicitud de amistad',
      message: `${currentUser.profile.firstName} ${currentUser.profile.lastName} te ha enviado una solicitud de amistad`,
      metadata: {
        friendId: decoded.userId,
        friendName: `${currentUser.profile.firstName} ${currentUser.profile.lastName}`,
        friendEmail: currentUser.email
      },
      read: false
    });

    return NextResponse.json({
      message: 'Solicitud de amistad enviada',
      friendshipId: friendship._id.toString()
    });

  } catch (error: any) {
    console.error('Error sending friend request:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al enviar solicitud' }, { status: 500 });
  }
}
