import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import SquadronEvent from '@/models/SquadronEvent';
import WebUser from '@/models/WebUser';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const event = await SquadronEvent.findById(params.id)
      .populate('createdBy', 'email profile')
      .populate('participants.squadronId', 'name tag')
      .populate('participants.confirmedPilots.pilotId', 'email profile')
      .populate('participants.pendingInvitations.pilotId', 'email profile');

    if (!event) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      event,
    });

  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Error al obtener evento' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Check if user is organizer
    const user = await WebUser.findById(userId);
    if (!user || user.email !== 'icabreraquezada@gmail.com') {
      return NextResponse.json(
        { error: 'No tienes permisos de organizador' },
        { status: 403 }
      );
    }

    // Find and verify event ownership
    const event = await SquadronEvent.findById(params.id);
    if (!event) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    if (event.createdBy.toString() !== userId) {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar este evento' },
        { status: 403 }
      );
    }

    // Delete event
    await SquadronEvent.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: 'Evento eliminado exitosamente',
    });

  } catch (error: any) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Error al eliminar evento', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    // Check if user is organizer
    const user = await WebUser.findById(userId);
    if (!user || user.email !== 'icabreraquezada@gmail.com') {
      return NextResponse.json(
        { error: 'No tienes permisos de organizador' },
        { status: 403 }
      );
    }

    // Find and verify event ownership
    const event = await SquadronEvent.findById(params.id);
    if (!event) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    if (event.createdBy.toString() !== userId) {
      return NextResponse.json(
        { error: 'No tienes permisos para editar este evento' },
        { status: 403 }
      );
    }

    // Get update data from request body
    const body = await request.json();

    // Update event fields
    event.name = body.name || event.name;
    event.description = body.description || event.description;
    event.category = body.category || event.category;
    event.eventDate = body.eventDate ? new Date(body.eventDate) : event.eventDate;
    event.eventTime = body.eventTime || event.eventTime;
    event.duration = body.duration !== undefined ? body.duration : event.duration;
    event.registrationDeadline = body.registrationDeadline ? new Date(body.registrationDeadline) : event.registrationDeadline;
    event.location = body.location || event.location;
    event.maxSquadrons = body.maxSquadrons !== undefined ? body.maxSquadrons : event.maxSquadrons;
    event.minPilotsPerSquadron = body.minPilotsPerSquadron !== undefined ? body.minPilotsPerSquadron : event.minPilotsPerSquadron;
    event.maxPilotsPerSquadron = body.maxPilotsPerSquadron !== undefined ? body.maxPilotsPerSquadron : event.maxPilotsPerSquadron;
    event.pointsForWinner = body.pointsForWinner !== undefined ? body.pointsForWinner : event.pointsForWinner;
    event.pointsDistribution = body.pointsDistribution || event.pointsDistribution;

    await event.save();

    return NextResponse.json({
      success: true,
      message: 'Evento actualizado exitosamente',
      event,
    });

  } catch (error: any) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Error al actualizar evento', details: error.message },
      { status: 500 }
    );
  }
}
