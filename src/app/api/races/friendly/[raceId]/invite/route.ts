import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import FriendlyRace from '@/models/FriendlyRace';
import WebUser from '@/models/WebUser';
import Friendship from '@/models/Friendship';
import Notification from '@/models/Notification';

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

    // Get user info
    const user = await WebUser.findById(userId);
    if (!user) {
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

    // Check if user is participant in the race
    const isParticipant = race.participants.some(
      (p) => p.userId.toString() === userId
    );

    if (!isParticipant) {
      return NextResponse.json(
        { success: false, error: 'Debes estar inscrito en la carrera para invitar amigos' },
        { status: 403 }
      );
    }

    // Check if race has available spots
    const availableSpots = race.maxParticipants - race.participants.length;
    if (availableSpots <= 0) {
      return NextResponse.json(
        { success: false, error: 'La carrera está llena' },
        { status: 400 }
      );
    }

    // Get friend IDs from request
    const { friendIds } = await req.json();

    if (!friendIds || !Array.isArray(friendIds) || friendIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Debes seleccionar al menos un amigo' },
        { status: 400 }
      );
    }

    // Verify friendships
    const friendships = await Friendship.find({
      $or: [
        { userId, friendId: { $in: friendIds }, status: 'accepted' },
        { friendId: userId, userId: { $in: friendIds }, status: 'accepted' }
      ]
    });

    const validFriendIds = friendships.map(f => {
      const isSender = f.userId.toString() === userId;
      return isSender ? f.friendId.toString() : f.userId.toString();
    });

    if (validFriendIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay amistades válidas' },
        { status: 400 }
      );
    }

    // Filter out friends already in the race
    const alreadyInRace = race.participants.map(p => p.userId.toString());
    const friendsToInvite = validFriendIds.filter(fId => !alreadyInRace.includes(fId));

    if (friendsToInvite.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Todos los amigos seleccionados ya están inscritos' },
        { status: 400 }
      );
    }

    // Check for existing pending invitations
    const existingInvitations = await Notification.find({
      userId: { $in: friendsToInvite },
      type: 'friendly_race_invitation',
      'metadata.raceId': params.raceId,
      'metadata.invitationStatus': 'pending'
    });

    const alreadyInvitedIds = existingInvitations.map(inv => inv.userId.toString());
    const finalFriendsToInvite = friendsToInvite.filter(fId => !alreadyInvitedIds.includes(fId));

    if (finalFriendsToInvite.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Todos los amigos seleccionados ya tienen invitaciones pendientes' },
        { status: 400 }
      );
    }

    // Create inviter name
    const inviterName = user.profile?.alias ||
                       `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() ||
                       user.email;

    // Create notifications for each friend
    const notifications = await Promise.all(
      finalFriendsToInvite.map(async (friendId) => {
        return await Notification.create({
          userId: friendId,
          type: 'friendly_race_invitation',
          title: 'Invitación a Carrera Amistosa',
          message: `${inviterName} te invita a unirte a "${race.name}"`,
          metadata: {
            raceId: params.raceId,
            raceName: race.name,
            raceDate: race.date.toISOString(),
            raceTime: race.time,
            invitedBy: userId,
            inviterName,
            availableSpots,
            invitationStatus: 'pending'
          },
          read: false
        });
      })
    );

    return NextResponse.json({
      success: true,
      message: `${notifications.length} invitaciones enviadas exitosamente`,
      invitationsSent: notifications.length,
      skipped: {
        alreadyInRace: alreadyInRace.filter(id => friendIds.includes(id)).length,
        alreadyInvited: alreadyInvitedIds.length,
        notFriends: friendIds.length - validFriendIds.length
      }
    });

  } catch (error) {
    console.error('Error sending race invitations:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al enviar invitaciones',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
