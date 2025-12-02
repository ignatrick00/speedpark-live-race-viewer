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
    const user = await WebUser.findById(decoded.userId);
    if (!user || !user.squadron || !user.squadron.squadronId) {
      return NextResponse.json(
        { error: 'Debes pertenecer a una escudería' },
        { status: 400 }
      );
    }

    // Get teammate email and kart number from request
    const { email, kartNumber } = await request.json();
    console.log('🔍 Received invitation request:', { email, kartNumber, type: typeof kartNumber });
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
    const teammate = await WebUser.findOne({ email: email.toLowerCase() });
    if (!teammate) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Check if teammate is in same squadron
    if (!teammate.squadron || !teammate.squadron.squadronId ||
        teammate.squadron.squadronId.toString() !== user.squadron.squadronId.toString()) {
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
      (p: any) => p.squadronId.toString() === user.squadron.squadronId.toString()
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

    const newInvitation = {
      pilotId: teammate._id,
      invitedBy: decoded.userId,
      kartNumber: Number(kartNumber),
      invitedAt: new Date(),
      expiresAt,
      status: 'pending',
    };
    console.log('📝 Creating invitation object:', newInvitation);

    // Use MongoDB's $push operator directly to ensure proper saving
    const updateResult = await SquadronEvent.updateOne(
      {
        _id: params.id,
        'participants.squadronId': user.squadron.squadronId
      },
      {
        $push: {
          'participants.$.pendingInvitations': newInvitation
        }
      }
    );
    console.log('✅ Update result:', updateResult);

    // Verify after save
    const savedEvent = await SquadronEvent.findById(params.id);
    const savedParticipation = savedEvent?.participants.find(
      (p: any) => p.squadronId.toString() === user.squadron.squadronId.toString()
    );
    console.log('🔍 After save verification:', JSON.stringify(savedParticipation?.pendingInvitations.slice(-1), null, 2));

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
