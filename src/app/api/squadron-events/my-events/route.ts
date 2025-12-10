import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import SquadronEvent from '@/models/SquadronEvent';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: NextRequest) {
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

    // Find all events where the user is CONFIRMED (not just invited)
    const events = await SquadronEvent.find({
      'participants.confirmedPilots.pilotId': userId
    })
      .populate('createdBy', 'email profile')
      .populate('participants.squadronId', 'name tag colors')
      .populate('participants.confirmedPilots.pilotId', '_id email profile')
      .populate('participants.pendingInvitations.pilotId', '_id email profile')
      .sort({ eventDate: 1 }) // Sort by event date ascending (soonest first)
      .lean();

    return NextResponse.json({
      success: true,
      events,
    });

  } catch (error) {
    console.error('Error fetching my events:', error);
    return NextResponse.json(
      { error: 'Error al obtener eventos' },
      { status: 500 }
    );
  }
}
