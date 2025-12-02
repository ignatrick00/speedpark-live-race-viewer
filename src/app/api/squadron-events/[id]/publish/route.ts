import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import SquadronEvent from '@/models/SquadronEvent';
import WebUser from '@/models/WebUser';

// POST - Publish an event
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

    // Check if user is organizer
    const user = await WebUser.findById(decoded.userId);
    if (!user || user.email !== 'icabreraquezada@gmail.com') {
      return NextResponse.json(
        { error: 'No tienes permisos de organizador' },
        { status: 403 }
      );
    }

    // Find and update event
    const event = await SquadronEvent.findById(params.id);
    if (!event) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    // Check if user is the creator
    if (event.createdBy.toString() !== decoded.userId) {
      return NextResponse.json(
        { error: 'Solo el creador puede publicar este evento' },
        { status: 403 }
      );
    }

    // Update status
    event.status = 'published';
    await event.save();

    return NextResponse.json({
      success: true,
      event,
      message: 'Evento publicado exitosamente',
    });

  } catch (error) {
    console.error('Error publishing event:', error);
    return NextResponse.json(
      { error: 'Error al publicar evento' },
      { status: 500 }
    );
  }
}
