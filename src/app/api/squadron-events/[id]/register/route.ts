import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import SquadronEvent from '@/models/SquadronEvent';
import WebUser from '@/models/WebUser';

// POST - Register user for an event
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

    // Get kartNumber from body
    const body = await request.json();
    const { kartNumber } = body;
    if (!kartNumber || kartNumber < 1 || kartNumber > 20) {
      return NextResponse.json(
        { error: 'Número de kart inválido (1-20)' },
        { status: 400 }
      );
    }

    // Get user with squadron
    const user = await WebUser.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (!user.squadron || !user.squadron.squadronId) {
      return NextResponse.json(
        { error: 'Debes pertenecer a una escudería para registrarte' },
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

    // Check if event is open for registration
    if (event.status !== 'published' && event.status !== 'registration_open') {
      return NextResponse.json(
        { error: 'Este evento no está abierto para inscripciones' },
        { status: 400 }
      );
    }

    // Check if registration deadline has passed
    if (new Date() > new Date(event.registrationDeadline)) {
      return NextResponse.json(
        { error: 'El plazo de inscripción ha finalizado' },
        { status: 400 }
      );
    }

    // Check if squadron is already registered
    const existingParticipant = event.participants.find(
      (p: any) => p.squadronId.toString() === user.squadron.squadronId.toString()
    );

    if (existingParticipant) {
      // Squadron already registered - check if THIS user is already confirmed or invited
      const userAlreadyConfirmed = existingParticipant.confirmedPilots.some(
        (pilot: any) => pilot.pilotId.toString() === decoded.userId
      );

      if (userAlreadyConfirmed) {
        return NextResponse.json(
          { error: 'Ya estás registrado en este evento' },
          { status: 400 }
        );
      }

      const userAlreadyInvited = existingParticipant.pendingInvitations.some(
        (inv: any) => inv.pilotId.toString() === decoded.userId && inv.status === 'pending'
      );

      if (userAlreadyInvited) {
        return NextResponse.json(
          { error: 'Ya tienes una invitación pendiente para este evento' },
          { status: 400 }
        );
      }

      // Check if kart is already occupied
      const isKartOccupied = event.participants.some((p: any) =>
        p.confirmedPilots.some((pilot: any) => pilot.kartNumber === kartNumber)
      );

      if (isKartOccupied) {
        return NextResponse.json(
          { error: 'Este kart ya está ocupado' },
          { status: 400 }
        );
      }

      // Check if squadron still has available slots
      const maxPilots = event.maxPilotsPerSquadron;
      const currentPilots = existingParticipant.confirmedPilots.length +
        existingParticipant.pendingInvitations.filter((inv: any) => inv.status === 'pending').length;

      if (currentPilots >= maxPilots) {
        return NextResponse.json(
          { error: 'Tu escudería ya completó todos los cupos disponibles' },
          { status: 400 }
        );
      }

      // Add user as confirmed pilot to existing squadron participation
      existingParticipant.confirmedPilots.push({
        pilotId: user._id,
        kartNumber: kartNumber,
        confirmedAt: new Date(),
      });

      await event.save();

      return NextResponse.json({
        success: true,
        message: 'Te has unido exitosamente al evento con tu escudería',
        participant: existingParticipant,
      });
    }

    // Check if event is full
    if (event.participants.length >= event.maxSquadrons) {
      return NextResponse.json(
        { error: 'El evento está lleno' },
        { status: 400 }
      );
    }

    // Check if kart is already occupied
    const isKartOccupied = event.participants.some((p: any) =>
      p.confirmedPilots.some((pilot: any) => pilot.kartNumber === kartNumber)
    );

    if (isKartOccupied) {
      return NextResponse.json(
        { error: 'Este kart ya está ocupado' },
        { status: 400 }
      );
    }

    // Register squadron with the user as the first confirmed pilot
    event.participants.push({
      squadronId: user.squadron.squadronId,
      registeredAt: new Date(),
      registeredBy: user._id,
      confirmedPilots: [{
        pilotId: user._id,
        kartNumber: kartNumber,
        confirmedAt: new Date(),
      }],
      pendingInvitations: [],
      status: 'pending',
    });

    await event.save();

    return NextResponse.json({
      success: true,
      message: 'Registro exitoso',
      participant: event.participants[event.participants.length - 1],
    });

  } catch (error) {
    console.error('Error registering for event:', error);
    return NextResponse.json(
      { error: 'Error al registrarse en el evento' },
      { status: 500 }
    );
  }
}
