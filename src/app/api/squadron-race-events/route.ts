import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import SquadronRaceEvent from '@/models/SquadronRaceEvent';
import WebUser from '@/models/WebUser';

// GET - Listar eventos de carreras
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };

    const user = await WebUser.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const userRoles = (user as any).roles && Array.isArray((user as any).roles)
      ? (user as any).roles
      : ((user as any).role ? [(user as any).role] : ['user']);

    if (!userRoles.includes('organizer')) {
      return NextResponse.json(
        { error: 'Solo los organizadores pueden ver eventos' },
        { status: 403 }
      );
    }

    const events = await SquadronRaceEvent.find()
      .sort({ eventDate: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, events });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
    console.error('Error fetching race events:', error);
    return NextResponse.json({ error: 'Error al obtener eventos' }, { status: 500 });
  }
}

// POST - Crear nuevo evento (solo con carrera seleccionada, sin calcular aún)
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };

    const user = await WebUser.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const userRoles = (user as any).roles && Array.isArray((user as any).roles)
      ? (user as any).roles
      : ((user as any).role ? [(user as any).role] : ['user']);

    if (!userRoles.includes('organizer')) {
      return NextResponse.json(
        { error: 'Solo los organizadores pueden crear eventos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { eventName, eventCategory, eventDate, raceSessionId, raceSessionName, notes } = body;

    if (!eventName || !eventCategory || !eventDate || !raceSessionId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que la carrera no esté ya asignada a otro evento
    const existingEvent = await SquadronRaceEvent.findOne({ raceSessionId });
    if (existingEvent) {
      return NextResponse.json(
        { error: 'Esta carrera ya está asignada a otro evento' },
        { status: 400 }
      );
    }

    // Obtener puntos base según categoría
    const basePoints = (SquadronRaceEvent as any).getBasePointsForCategory(eventCategory);

    // Generar eventId único
    const eventId = `RE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Crear evento
    const newEvent = await SquadronRaceEvent.create({
      eventId,
      eventName,
      eventCategory,
      basePoints,
      eventDate: new Date(eventDate),
      raceSessionId,
      raceSessionName,
      status: 'pending',
      results: [],
      createdBy: user._id,
      notes: notes || ''
    });

    return NextResponse.json({
      success: true,
      event: newEvent,
      message: 'Evento creado. Ahora calcula los resultados.'
    });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
    console.error('Error creating race event:', error);
    return NextResponse.json({ error: 'Error al crear evento' }, { status: 500 });
  }
}
