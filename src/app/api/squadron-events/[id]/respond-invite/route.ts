import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import SquadronEvent from '@/models/SquadronEvent';
import WebUser from '@/models/WebUser';

// POST - Accept or decline an invitation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

    // Get action (accept or decline)
    const { accept } = await request.json();
    if (typeof accept !== 'boolean') {
      return NextResponse.json(
        { error: 'Acción inválida' },
        { status: 400 }
      );
    }

    // Find event
    const event = await SquadronEvent.findById(params.id);
    if (!event) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    // Find user's squadron
    const user = await WebUser.findById(decoded.userId);
    if (!user || !user.squadron || !user.squadron.squadronId) {
      return NextResponse.json(
        { error: 'Debes pertenecer a una escudería' },
        { status: 400 }
      );
    }

    // Find squadron participation
    const participation = event.participants.find(
      (p: any) => p.squadronId.toString() === user.squadron.squadronId.toString()
    );

    if (!participation) {
      return NextResponse.json(
        { error: 'Tu escudería no está registrada en este evento' },
        { status: 400 }
      );
    }

    // Find user's pending invitation
    const invitationIndex = participation.pendingInvitations.findIndex(
      (inv: any) => inv.pilotId.toString() === user._id.toString() && inv.status === 'pending'
    );

    if (invitationIndex === -1) {
      return NextResponse.json(
        { error: 'No tienes una invitación pendiente para este evento' },
        { status: 400 }
      );
    }

    const invitation = participation.pendingInvitations[invitationIndex];

    console.log('📨 Invitation found:', {
      pilotId: invitation.pilotId,
      kartNumber: invitation.kartNumber,
      status: invitation.status,
      expiresAt: invitation.expiresAt
    });

    // Check if invitation has expired
    if (new Date() > new Date(invitation.expiresAt)) {
      invitation.status = 'expired';
      await event.save();
      return NextResponse.json(
        { error: 'La invitación ha expirado' },
        { status: 400 }
      );
    }

    if (accept) {
      console.log('✅ Accepting invitation with kartNumber:', invitation.kartNumber);

      // If invitation doesn't have kartNumber (old invitation), reject it
      if (!invitation.kartNumber) {
        return NextResponse.json({
          error: 'Esta invitación es inválida (no tiene kart asignado). Pide a tu compañero que te invite nuevamente.',
        }, { status: 400 });
      }

      // Add to confirmed pilots with the kart number from invitation
      const newPilot = {
        pilotId: user._id,
        kartNumber: invitation.kartNumber,
        confirmedAt: new Date(),
      };

      console.log('👤 Adding pilot:', newPilot);

      participation.confirmedPilots.push(newPilot);
      invitation.status = 'accepted';

      await event.save();

      return NextResponse.json({
        success: true,
        message: '¡Te has unido al equipo exitosamente!',
      });
    } else {
      // Decline invitation
      invitation.status = 'declined';
      await event.save();

      return NextResponse.json({
        success: true,
        message: 'Invitación rechazada',
      });
    }

  } catch (error) {
    console.error('Error responding to invitation:', error);
    return NextResponse.json(
      { error: 'Error al responder invitación' },
      { status: 500 }
    );
  }
}
