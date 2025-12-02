import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import SquadronEvent from '@/models/SquadronEvent';
import WebUser from '@/models/WebUser';

// POST - Invite a teammate to the event
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

    // Get current user with squadron
    const user = await WebUser.findById(decoded.userId).populate('currentSquadron');
    if (!user || !user.currentSquadron) {
      return NextResponse.json(
        { error: 'Debes pertenecer a una escudería' },
        { status: 400 }
      );
    }

    // Get teammate email and kart number from request
    const { email, kartNumber } = await request.json();
    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      );
    }
    if (!kartNumber || kartNumber < 1 || kartNumber > 20) {
      return NextResponse.json(
        { error: 'Número de kart inválido (1-20)' },
        { status: 400 }
      );
    }

    // Find teammate
    const teammate = await WebUser.findOne({ email: email.toLowerCase() }).populate('currentSquadron');
    if (!teammate) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Check if teammate is in same squadron
    if (!teammate.currentSquadron || teammate.currentSquadron._id.toString() !== user.currentSquadron._id.toString()) {
      return NextResponse.json(
        { error: 'El usuario no pertenece a tu escudería' },
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

    // Find squadron participation
    const participation = event.participants.find(
      (p: any) => p.squadronId.toString() === user.currentSquadron._id.toString()
    );

    if (!participation) {
      return NextResponse.json(
        { error: 'Tu escudería no está registrada en este evento' },
        { status: 400 }
      );
    }

    // Check if teammate is already confirmed
    const isAlreadyConfirmed = participation.confirmedPilots.some(
      (pilotId: any) => pilotId.toString() === teammate._id.toString()
    );

    if (isAlreadyConfirmed) {
      return NextResponse.json(
        { error: 'Este piloto ya está confirmado' },
        { status: 400 }
      );
    }

    // Check if teammate already has a pending invitation
    const hasPendingInvite = participation.pendingInvitations.some(
      (inv: any) => inv.pilotId.toString() === teammate._id.toString() && inv.status === 'pending'
    );

    if (hasPendingInvite) {
      return NextResponse.json(
        { error: 'Este piloto ya tiene una invitación pendiente' },
        { status: 400 }
      );
    }

    // Check if team is full
    const totalPilots = participation.confirmedPilots.length +
      participation.pendingInvitations.filter((inv: any) => inv.status === 'pending').length;

    if (totalPilots >= event.maxPilotsPerSquadron) {
      return NextResponse.json(
        { error: 'El equipo está completo' },
        { status: 400 }
      );
    }

    // Check if kart is already occupied
    const isKartOccupied = event.participants.some((p: any) => {
      // Check confirmed pilots
      const confirmedHasKart = p.confirmedPilots.some((pilot: any) => pilot.kartNumber === kartNumber);
      // Check pending invitations
      const pendingHasKart = p.pendingInvitations.some((inv: any) => inv.status === 'pending' && inv.kartNumber === kartNumber);
      return confirmedHasKart || pendingHasKart;
    });

    if (isKartOccupied) {
      return NextResponse.json(
        { error: 'Este kart ya está ocupado o reservado' },
        { status: 400 }
      );
    }

    // Create invitation (expires in 2 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2);

    participation.pendingInvitations.push({
      pilotId: teammate._id,
      kartNumber: kartNumber,
      invitedAt: new Date(),
      expiresAt,
      status: 'pending',
    });

    await event.save();

    return NextResponse.json({
      success: true,
      message: 'Invitación enviada exitosamente',
    });

  } catch (error) {
    console.error('Error inviting teammate:', error);
    return NextResponse.json(
      { error: 'Error al enviar invitación' },
      { status: 500 }
    );
  }
}
