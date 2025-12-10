import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SquadronEvent from '@/models/SquadronEvent';
import Squadron from '@/models/Squadron';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { id } = params; // squadronId

    // Verificar que la escudería existe
    const squadron = await Squadron.findById(id);
    if (!squadron) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }

    // Buscar eventos finalizados donde participó esta escudería
    const events = await SquadronEvent.find({
      raceStatus: 'finalized',
      'results.squadronId': id
    })
      .populate('results.squadronId', 'name tag colors')
      .sort({ finalizedAt: -1 }) // Más recientes primero
      .limit(10)
      .lean();

    // Formatear resultados para incluir solo la info de esta escudería
    const recentResults = events.map((event: any) => {
      // Encontrar el resultado de esta escudería
      const squadronResult = event.results?.find(
        (r: any) => r.squadronId?._id?.toString() === id
      );

      return {
        eventId: event._id,
        eventName: event.name,
        eventCategory: event.category,
        eventDate: event.eventDate,
        finalizedAt: event.finalizedAt,
        location: event.location,
        position: squadronResult?.position || 0,
        pointsEarned: squadronResult?.pointsEarned || 0,
        totalSquadrons: event.results?.length || 0,
        pilots: squadronResult?.pilots || []
      };
    });

    return NextResponse.json({
      success: true,
      results: recentResults,
      totalResults: recentResults.length
    });

  } catch (error) {
    console.error('Error fetching recent results:', error);
    return NextResponse.json(
      { error: 'Error al obtener resultados recientes' },
      { status: 500 }
    );
  }
}
