import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import SquadronEvent from '@/models/SquadronEvent';
import WebUser from '@/models/WebUser';

// GET - List all events (public can see published events, organizers can see all their events)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    let userId: string | null = null;

    // Check if user is authenticated
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        userId = decoded.userId;
      } catch (error) {
        // Invalid token, continue as public
      }
    }

    let events;

    if (userId) {
      // Authenticated user - show all events they created or public events
      events = await SquadronEvent.find({
        $or: [
          { createdBy: userId },
          { status: { $in: ['published', 'registration_open', 'registration_closed', 'in_progress', 'completed'] } }
        ]
      })
        .populate('createdBy', 'email profile')
        .populate('participants.squadronId', 'name tag')
        .sort({ eventDate: -1 });
    } else {
      // Public - only show published events
      events = await SquadronEvent.find({
        status: { $in: ['published', 'registration_open', 'registration_closed', 'in_progress', 'completed'] }
      })
        .populate('createdBy', 'email profile')
        .populate('participants.squadronId', 'name tag')
        .sort({ eventDate: -1 });
    }

    return NextResponse.json({
      success: true,
      events,
    });

  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Error al obtener eventos' },
      { status: 500 }
    );
  }
}

// POST - Create new event (organizers only)
export async function POST(request: NextRequest) {
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };

    // Check if user is organizer or admin
    const user = await WebUser.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Check if user has organizer permissions (icabreraquezada@gmail.com for now)
    if (user.email !== 'icabreraquezada@gmail.com') {
      return NextResponse.json(
        { error: 'No tienes permisos de organizador' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      eventDate,
      eventTime,
      duration,
      registrationDeadline,
      location,
      maxSquadrons,
      minPilotsPerSquadron,
      maxPilotsPerSquadron,
      pointsForWinner,
      pointsDistribution,
    } = body;

    // Validate required fields
    if (!name || !category || !eventDate || !eventTime || !duration || !registrationDeadline) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos (nombre, categoría, fecha, hora, duración, cierre inscripciones)' },
        { status: 400 }
      );
    }

    // Create event
    const event = await SquadronEvent.create({
      name,
      description,
      category,
      eventDate: new Date(eventDate),
      eventTime: eventTime || '19:00',
      duration: duration || 90,
      registrationDeadline: new Date(registrationDeadline),
      location: location || 'SpeedPark',
      maxSquadrons: maxSquadrons || 20,
      minPilotsPerSquadron: minPilotsPerSquadron || 2,
      maxPilotsPerSquadron: maxPilotsPerSquadron || 6,
      pointsForWinner,
      pointsDistribution: pointsDistribution || [],
      createdBy: user._id,
      participants: [],
      status: 'draft',
    });

    return NextResponse.json({
      success: true,
      event,
      message: 'Evento creado exitosamente',
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Error al crear evento' },
      { status: 500 }
    );
  }
}
