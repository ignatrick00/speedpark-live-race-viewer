import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Friendship from '@/models/Friendship';
import WebUser from '@/models/WebUser';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: NextRequest) {
  try {
    // Verify JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    await dbConnect();

    // Get accepted friendships (friends)
    const acceptedFriendships = await Friendship.find({
      $or: [
        { userId: decoded.userId, status: 'accepted' },
        { friendId: decoded.userId, status: 'accepted' }
      ]
    }).populate('userId friendId', 'email profile').lean();

    const friends = acceptedFriendships.map(friendship => {
      const isSender = friendship.userId._id.toString() === decoded.userId;
      const friendData = isSender ? friendship.friendId : friendship.userId;
      return {
        friendshipId: friendship._id.toString(),
        userId: friendData._id.toString(),
        email: friendData.email,
        firstName: friendData.profile.firstName,
        lastName: friendData.profile.lastName,
        alias: friendData.profile.alias,
        whatsappNumber: friendData.profile.whatsappNumber,
        since: friendship.createdAt
      };
    });

    // Get pending friend requests (received)
    const pendingReceived = await Friendship.find({
      friendId: decoded.userId,
      status: 'pending'
    }).populate('userId', 'email profile').lean();

    const requestsReceived = pendingReceived.map(friendship => ({
      friendshipId: friendship._id.toString(),
      userId: friendship.userId._id.toString(),
      email: friendship.userId.email,
      firstName: friendship.userId.profile.firstName,
      lastName: friendship.userId.profile.lastName,
      alias: friendship.userId.profile.alias,
      createdAt: friendship.createdAt
    }));

    // Get pending friend requests (sent)
    const pendingSent = await Friendship.find({
      userId: decoded.userId,
      status: 'pending'
    }).populate('friendId', 'email profile').lean();

    const requestsSent = pendingSent.map(friendship => ({
      friendshipId: friendship._id.toString(),
      userId: friendship.friendId._id.toString(),
      email: friendship.friendId.email,
      firstName: friendship.friendId.profile.firstName,
      lastName: friendship.friendId.profile.lastName,
      alias: friendship.friendId.profile.alias,
      createdAt: friendship.createdAt
    }));

    return NextResponse.json({
      friends,
      requestsReceived,
      requestsSent,
      count: {
        friends: friends.length,
        requestsReceived: requestsReceived.length,
        requestsSent: requestsSent.length
      }
    });

  } catch (error: any) {
    console.error('Error fetching friends:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al obtener amigos' }, { status: 500 });
  }
}
