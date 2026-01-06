import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';
import Squadron from '@/models/Squadron';
import SquadronEvent from '@/models/SquadronEvent';
import GroupClassInvitation from '@/models/GroupClassInvitation';
import SquadronPointsHistory from '@/models/SquadronPointsHistory';
import Notification from '@/models/Notification';
import FriendlyRace from '@/models/FriendlyRace';
import '@/models/Squadron';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado' },
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
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    const user = await WebUser.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Get squadron invitations from WebUser model (where they're actually stored)
    console.log(`📧 [INVITATIONS] Buscando invitaciones de escuadrón para userId: ${userId}`);

    const userWithInvitations = await WebUser.findById(userId)
      .populate({
        path: 'invitations.squadronId',
        select: 'name tag colors division fairRacingAverage totalPoints isActive members',
      })
      .populate({
        path: 'invitations.invitedBy',
        select: 'email profile',
      })
      .lean();

    console.log(`🏁 [INVITATIONS] Usuario encontrado con ${userWithInvitations?.invitations?.length || 0} invitaciones totales`);

    // Calcular puntos desde SquadronPointsHistory para cada invitación
    const squadronInvites = await Promise.all(
      (userWithInvitations?.invitations || [])
        .filter((inv: any) =>
          inv.status === 'pending' &&
          inv.squadronId &&
          inv.squadronId.isActive &&
          inv.squadronId.members.length < 4
        )
        .map(async (invitation: any) => {
          console.log(`✅ [INVITATIONS] Invitación pendiente: ${invitation.squadronId.name}`);

          // Calcular puntos totales desde el historial (igual que en /ranking)
          const pointsHistory = await SquadronPointsHistory.aggregate([
            { $match: { squadronId: invitation.squadronId._id } },
            { $group: { _id: null, totalPoints: { $sum: '$pointsChange' } } }
          ]);

          const totalPoints = pointsHistory.length > 0 ? pointsHistory[0].totalPoints : 0;

          return {
            type: 'squadron',
            squadronId: invitation.squadronId._id,
            squadronName: invitation.squadronId.name,
            squadronTag: invitation.squadronId.tag,
            colors: invitation.squadronId.colors,
            division: invitation.squadronId.division,
            fairRacingAverage: invitation.squadronId.fairRacingAverage,
            totalPoints: totalPoints,
            invitedBy: invitation.invitedBy,
            invitedAt: invitation.createdAt,
            _id: invitation._id,
          };
        })
    );

    // Get event invitations
    const userSquadronId = user.squadron?.squadronId;
    const eventInvitations: any[] = [];

    if (userSquadronId) {
      const events = await SquadronEvent.find({
        'participants.squadronId': userSquadronId,
        'participants.pendingInvitations': {
          $elemMatch: {
            pilotId: userId,
            status: 'pending'
          }
        }
      })
        .populate('createdBy', 'email profile')
        .populate('participants.squadronId', 'name tag');

      // Manually populate invitedBy for each invitation
      for (const event of events) {
        const participation = event.participants.find(
          (p: any) => p.squadronId._id.toString() === userSquadronId.toString()
        );

        if (participation) {
          const invitation = participation.pendingInvitations.find(
            (inv: any) => inv.pilotId.toString() === userId && inv.status === 'pending'
          );

          if (invitation) {
            console.log('📧 Processing invitation:', {
              eventName: event.name,
              invitedBy: invitation.invitedBy,
              pilotId: invitation.pilotId,
              kartNumber: invitation.kartNumber
            });

            // Manually populate invitedBy if it exists
            let invitedByUser = null;
            if (invitation.invitedBy) {
              invitedByUser = await WebUser.findById(invitation.invitedBy).select('email profile');
              console.log('👤 invitedBy populated:', invitedByUser ? invitedByUser.email : 'NOT FOUND');
            } else {
              console.log('⚠️ invitation.invitedBy is missing');
            }

            eventInvitations.push({
              type: 'event',
              eventId: event._id,
              eventName: event.name,
              eventDate: event.eventDate,
              eventTime: event.eventTime,
              category: event.category,
              location: event.location,
              kartNumber: invitation.kartNumber,
              invitedAt: invitation.invitedAt,
              expiresAt: invitation.expiresAt,
              invitedBy: invitedByUser, // Add who sent the invitation
              squadron: participation.squadronId,
            });
          }
        }
      }
    }

    // Get group class invitations
    const classInvitations = await GroupClassInvitation.find({
      inviteeEmail: user.email.toLowerCase(),
      status: 'pending',
      expiresAt: { $gt: new Date() }
    })
      .populate('classId')
      .populate('inviterId', 'email profile');

    const classInvites = classInvitations.map((invitation: any) => {
      const trainingClass = invitation.classId;
      return {
        type: 'class',
        invitationId: invitation._id,
        token: invitation.token,
        inviterName: invitation.inviterName,
        invitedBy: invitation.inviterId,
        invitedAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
        class: {
          id: trainingClass._id,
          coachName: trainingClass.coachName,
          title: trainingClass.title,
          date: trainingClass.date,
          startTime: trainingClass.startTime,
          endTime: trainingClass.endTime,
          groupPricePerPerson: trainingClass.groupPricePerPerson,
          currentParticipants: trainingClass.groupBookings.length,
          maxCapacity: trainingClass.maxGroupCapacity,
        }
      };
    });

    // Get friendly race invitations from Notification collection
    console.log(`🏁 [INVITATIONS] Buscando invitaciones de carreras amistosas para userId: ${userId}`);
    const raceNotifications = await Notification.find({
      userId: userId,
      type: 'friendly_race_invitation',
      'metadata.invitationStatus': 'pending',
      read: false
    }).lean();

    console.log(`🏎️ [INVITATIONS] Encontradas ${raceNotifications.length} invitaciones de carreras amistosas`);

    // Populate race details for each invitation
    const raceInvites = await Promise.all(
      raceNotifications.map(async (notification: any) => {
        try {
          const race = await FriendlyRace.findById(notification.metadata.raceId);
          const inviter = await WebUser.findById(notification.metadata.invitedBy).select('email profile');

          if (!race) {
            console.log(`⚠️ Race not found for notification ${notification._id}`);
            return null;
          }

          return {
            type: 'friendly_race',
            notificationId: notification._id,
            raceId: race._id,
            raceName: race.name,
            raceDate: race.date,
            raceTime: race.time,
            raceTrack: race.track,
            currentParticipants: race.participants.length,
            maxParticipants: race.maxParticipants,
            availableSpots: race.maxParticipants - race.participants.length,
            invitedBy: inviter,
            inviterName: notification.metadata.inviterName,
            invitedAt: notification.createdAt,
            _id: notification._id,
          };
        } catch (error) {
          console.error(`Error processing race invitation ${notification._id}:`, error);
          return null;
        }
      })
    );

    // Filter out null values (races that don't exist anymore)
    const validRaceInvites = raceInvites.filter(invite => invite !== null);

    // Combine all invitations
    const allInvitations = [
      ...squadronInvites,
      ...eventInvitations,
      ...classInvites,
      ...validRaceInvites
    ].sort((a, b) => new Date(b.invitedAt).getTime() - new Date(a.invitedAt).getTime());

    return NextResponse.json({
      success: true,
      invitations: allInvitations,
      count: allInvitations.length,
    });

  } catch (error: any) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Error al obtener invitaciones', details: error.message },
      { status: 500 }
    );
  }
}
