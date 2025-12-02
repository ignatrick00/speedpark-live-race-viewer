import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SquadronEvent from '@/models/SquadronEvent';

// GET - Get list of occupied karts for an event
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const event = await SquadronEvent.findById(params.id);
    if (!event) {
      return NextResponse.json(
        { error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    // Get all occupied karts from confirmed pilots and pending invitations
    const occupiedKarts: number[] = [];
    event.participants.forEach((participant: any) => {
      // Add confirmed pilots' karts
      participant.confirmedPilots.forEach((pilot: any) => {
        if (pilot.kartNumber) {
          occupiedKarts.push(pilot.kartNumber);
        }
      });
      // Add pending invitations' karts (reserved)
      participant.pendingInvitations.forEach((inv: any) => {
        if (inv.status === 'pending' && inv.kartNumber) {
          occupiedKarts.push(inv.kartNumber);
        }
      });
    });

    return NextResponse.json({
      success: true,
      occupiedKarts,
    });

  } catch (error) {
    console.error('Error fetching occupied karts:', error);
    return NextResponse.json(
      { error: 'Error al obtener karts ocupados' },
      { status: 500 }
    );
  }
}
