import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';
import Squadron from '@/models/Squadron';
import SquadronEvent from '@/models/SquadronEvent';
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

    // Get squadron invitations
    const squadronInvitations = await Squadron.find({
      'invitations.email': user.email,
      'invitations.status': 'pending'
    })
      .populate('createdBy', 'email profile')
      .select('name tag invitations createdBy');

    const squadronInvites = squadronInvitations.map((squadron: any) => {
      const invitation = squadron.invitations.find(
        (inv: any) => inv.email === user.email && inv.status === 'pending'
      );
      return {
        type: 'squadron',
        squadronId: squadron._id,
        squadronName: squadron.name,
        squadronTag: squadron.tag,
        invitedBy: squadron.createdBy,
        invitedAt: invitation.invitedAt,
        expiresAt: invitation.expiresAt,
        role: invitation.role,
      };
    });

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

    // Combine all invitations
    const allInvitations = [
      ...squadronInvites,
      ...eventInvitations
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
