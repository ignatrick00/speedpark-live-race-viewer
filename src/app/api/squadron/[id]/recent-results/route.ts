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

    console.log(`\n🔍 [RECENT-RESULTS] Buscando eventos finalizados para escudería: ${id} (${squadron.name})`);

    // Primero ver TODOS los eventos (sin filtros)
    const allEvents = await SquadronEvent.find({})
      .select('name raceStatus results')
      .lean();

    console.log(`📊 [DEBUG] Total eventos en BD: ${allEvents.length}`);
    console.log(`📊 [DEBUG] Eventos por raceStatus:`);
    const statusCount: any = {};
    allEvents.forEach((e: any) => {
      statusCount[e.raceStatus || 'undefined'] = (statusCount[e.raceStatus || 'undefined'] || 0) + 1;
    });
    console.log(statusCount);

    // Eventos con results
    const eventsWithResults = allEvents.filter((e: any) => e.results && e.results.length > 0);
    console.log(`📊 [DEBUG] Eventos con results: ${eventsWithResults.length}`);
    if (eventsWithResults.length > 0) {
      console.log(`📊 [DEBUG] Primer evento con results:`, {
        _id: eventsWithResults[0]._id,
        name: eventsWithResults[0].name,
        raceStatus: eventsWithResults[0].raceStatus,
        resultsLength: eventsWithResults[0].results.length,
        firstSquadronId: eventsWithResults[0].results[0].squadronId
      });
    }

    // Log ALL events with their IDs
    console.log(`📊 [DEBUG] TODOS LOS EVENTOS EN BD:`);
    allEvents.forEach((e: any, index: number) => {
      console.log(`  ${index + 1}. _id: ${e._id}, name: "${e.name}", raceStatus: "${e.raceStatus}", results: ${e.results?.length || 0}`);
    });

    // Buscar eventos finalizados donde participó esta escudería
    const events = await SquadronEvent.find({
      raceStatus: 'finalized',
      'results.squadronId': id
    })
      .populate('results.squadronId', 'name tag colors')
      .sort({ finalizedAt: -1 }) // Más recientes primero
      .limit(10)
      .lean();

    console.log(`📊 [QUERY] Eventos encontrados con raceStatus='finalized' y squadronId=${id}: ${events.length}`);
    if (events.length > 0) {
      console.log(`📊 [QUERY] Primer evento encontrado:`, {
        name: events[0].name,
        raceStatus: events[0].raceStatus,
        results: events[0].results?.length || 0
      });
    }

    // Formatear resultados para incluir solo la info de esta escudería
    const recentResults = events.map((event: any) => {
      // Encontrar el resultado de esta escudería
      const squadronResult = event.results?.find(
        (r: any) => r.squadronId?._id?.toString() === id
      );

      console.log(`📊 [MAP] Procesando evento: ${event.name}`);
      console.log(`   - squadronResult found:`, !!squadronResult);
      if (squadronResult) {
        console.log(`   - position: ${squadronResult.position}, points: ${squadronResult.pointsEarned}`);
      }

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

    console.log(`✅ [RESPONSE] Retornando ${recentResults.length} resultados\n`);

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
