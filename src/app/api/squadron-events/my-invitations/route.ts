import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import SquadronEvent from '@/models/SquadronEvent';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: NextRequest) {
  try {
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

    await connectDB();

    // Find all events where the user has pending invitations
    const events = await SquadronEvent.find({
      'participants.pendingInvitations': {
        $elemMatch: {
          pilotId: userId,
          status: 'pending',
          expiresAt: { $gt: new Date() } // Not expired
        }
      }
    })
    .populate('participants.squadronId', 'name colors')
    .populate('participants.registeredBy', 'profile email')
    .lean();

    // Extract invitations with event details
    const invitations = events.flatMap((event: any) => {
      return event.participants.flatMap((participant: any) => {
        const userInvitations = participant.pendingInvitations.filter(
          (inv: any) =>
            inv.pilotId.toString() === userId &&
            inv.status === 'pending' &&
            new Date(inv.expiresAt) > new Date()
        );

        return userInvitations.map((invitation: any) => ({
          invitationId: invitation._id,
          eventId: event._id,
          eventName: event.name,
          eventDate: event.eventDate,
          eventTime: event.eventTime,
          duration: event.duration,
          location: event.location,
          kartNumber: invitation.kartNumber,
          squadron: participant.squadronId,
          invitedBy: participant.registeredBy,
          invitedAt: invitation.invitedAt,
          expiresAt: invitation.expiresAt,
        }));
      });
    });

    return NextResponse.json({
      success: true,
      invitations,
    });

  } catch (error: any) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Error al obtener invitaciones', details: error.message },
      { status: 500 }
    );
  }
}
