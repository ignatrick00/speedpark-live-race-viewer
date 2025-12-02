import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import SquadronEvent from '@/models/SquadronEvent';
import WebUser from '@/models/WebUser';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get user and their squadron
    const user = await WebUser.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const userSquadronId = user.squadron?.squadronId;
    if (!userSquadronId) {
      return NextResponse.json(
        { error: 'No perteneces a ninguna escudería' },
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

    // Check if registration is still open
    const now = new Date();
    const registrationDeadline = new Date(event.registrationDeadline);
    if (now > registrationDeadline) {
      return NextResponse.json(
        { error: 'El período de inscripción ha cerrado, no puedes desregistrarte' },
        { status: 400 }
      );
    }

    // Find squadron participation
    const participation = event.participants.find(
      (p: any) => p.squadronId.toString() === userSquadronId.toString()
    );

    if (!participation) {
      return NextResponse.json(
        { error: 'Tu escudería no está registrada en este evento' },
        { status: 400 }
      );
    }

    // Check if user is in confirmed pilots
    const pilotIndex = participation.confirmedPilots.findIndex(
      (pilot: any) => pilot.pilotId.toString() === userId
    );

    if (pilotIndex === -1) {
      return NextResponse.json(
        { error: 'No estás registrado en este evento' },
        { status: 400 }
      );
    }

    // Remove only this user from confirmed pilots
    participation.confirmedPilots.splice(pilotIndex, 1);

    // If squadron has no more confirmed pilots and no pending invitations, remove the entire participation
    if (participation.confirmedPilots.length === 0 &&
        participation.pendingInvitations.filter((inv: any) => inv.status === 'pending').length === 0) {
      const participantIndex = event.participants.findIndex(
        (p: any) => p.squadronId.toString() === userSquadronId.toString()
      );
      event.participants.splice(participantIndex, 1);
    }

    await event.save();

    return NextResponse.json({
      success: true,
      message: 'Te has desregistrado exitosamente del evento',
    });

  } catch (error: any) {
    console.error('Error unregistering from event:', error);
    return NextResponse.json(
      { error: 'Error al desregistrarse del evento', details: error.message },
      { status: 500 }
    );
  }
}
