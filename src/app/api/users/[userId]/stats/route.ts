import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import WebUser from '@/models/WebUser';
import UserStats from '@/models/UserStats';
import Friendship from '@/models/Friendship';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    await dbConnect();

    // Check for authorization - optional for public profiles
    const authHeader = request.headers.get('authorization');
    let isPublicAccess = false;
    let requestingUserId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      // Allow public access with 'public' token
      if (token === 'public') {
        isPublicAccess = true;
      } else {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
          requestingUserId = decoded.userId;

          // Check if users are friends or if viewing own profile
          if (decoded.userId !== userId) {
            const friendship = await Friendship.findOne({
              $or: [
                { userId: decoded.userId, friendId: userId, status: 'accepted' },
                { userId: userId, friendId: decoded.userId, status: 'accepted' }
              ]
            });

            if (!friendship) {
              return NextResponse.json({ error: 'Solo puedes ver estadísticas de tus amigos' }, { status: 403 });
            }
          }
        } catch (error) {
          // Invalid token, treat as public access
          isPublicAccess = true;
        }
      }
    } else {
      // No auth header, treat as public access
      isPublicAccess = true;
    }

    // Get user info
    const user = await WebUser.findById(userId).select('email profile').lean();
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Get user stats
    const stats = await UserStats.findOne({ webUserId: userId }).lean();

    if (!stats) {
      return NextResponse.json({
        user: {
          userId: user._id.toString(),
          email: user.email,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          alias: user.profile.alias,
          photoUrl: user.profile.photoUrl
        },
        stats: null,
        message: 'Este usuario aún no tiene estadísticas de karting'
      });
    }

    return NextResponse.json({
      user: {
        userId: user._id.toString(),
        email: user.email,
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        alias: user.profile.alias,
        photoUrl: user.profile.photoUrl
      },
      stats: {
        totalRaces: stats.totalRaces || 0,
        totalRevenue: stats.totalRevenue || 0,
        bestTime: stats.bestTime || null,
        averageTime: stats.averageTime || null,
        totalLaps: stats.totalLaps || 0,
        firstPlaces: stats.firstPlaces || 0,
        secondPlaces: stats.secondPlaces || 0,
        thirdPlaces: stats.thirdPlaces || 0,
        podiumFinishes: stats.podiumFinishes || 0,
        firstRaceAt: stats.firstRaceAt || null,
        lastRaceAt: stats.lastRaceAt || null,
        racesThisMonth: stats.racesThisMonth || 0,
        recentSessions: stats.recentSessions || [],
        monthlyStats: stats.monthlyStats || []
      }
    });

  } catch (error: any) {
    console.error('Error fetching user stats:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}
