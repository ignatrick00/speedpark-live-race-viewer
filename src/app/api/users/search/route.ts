import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import WebUser from '@/models/WebUser';
import Friendship from '@/models/Friendship';

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

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] });
    }

    await dbConnect();

    // Search users by name or email (case insensitive)
    const searchRegex = new RegExp(query.trim(), 'i');
    const users = await WebUser.find({
      $and: [
        { _id: { $ne: decoded.userId } }, // Exclude current user
        { accountStatus: 'active' },
        {
          $or: [
            { 'profile.firstName': searchRegex },
            { 'profile.lastName': searchRegex },
            { 'profile.alias': searchRegex },
            { email: searchRegex }
          ]
        }
      ]
    })
      .select('email profile')
      .limit(20)
      .lean();

    // Get existing friendships to mark users as already friends or pending
    const userIds = users.map(u => u._id.toString());
    const existingFriendships = await Friendship.find({
      $or: [
        { userId: decoded.userId, friendId: { $in: userIds } },
        { userId: { $in: userIds }, friendId: decoded.userId }
      ]
    }).lean();

    // Create a map of friendship statuses
    const friendshipMap = new Map();
    existingFriendships.forEach(fs => {
      const otherUserId =
        fs.userId.toString() === decoded.userId
          ? fs.friendId.toString()
          : fs.userId.toString();
      friendshipMap.set(otherUserId, {
        status: fs.status,
        friendshipId: fs._id.toString(),
        requestedBy: fs.requestedBy.toString()
      });
    });

    // Add friendship status to each user
    const usersWithStatus = users.map(user => {
      const userId = user._id.toString();
      const friendship = friendshipMap.get(userId);

      let friendshipStatus = 'none';
      let friendshipId = null;
      let canSendRequest = true;

      if (friendship) {
        friendshipId = friendship.friendshipId;
        if (friendship.status === 'accepted') {
          friendshipStatus = 'friends';
          canSendRequest = false;
        } else if (friendship.status === 'pending') {
          if (friendship.requestedBy === decoded.userId) {
            friendshipStatus = 'request_sent';
          } else {
            friendshipStatus = 'request_received';
          }
          canSendRequest = false;
        } else if (friendship.status === 'rejected') {
          friendshipStatus = 'rejected';
          canSendRequest = true; // Allow resending
        }
      }

      return {
        userId: userId,
        email: user.email,
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        alias: user.profile.alias,
        friendshipStatus,
        friendshipId,
        canSendRequest
      };
    });

    return NextResponse.json({ users: usersWithStatus });

  } catch (error: any) {
    console.error('Error searching users:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al buscar usuarios' }, { status: 500 });
  }
}
