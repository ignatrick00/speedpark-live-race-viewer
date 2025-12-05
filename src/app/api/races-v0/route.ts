import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RaceSessionV0 from '@/models/RaceSessionV0';

export const dynamic = 'force-dynamic';

/**
 * GET /api/races-v0?date=YYYY-MM-DD
 * Obtener carreras de la estructura V0 (centrada en carreras)
 */
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    let dateFilter: any = {};

    if (dateParam) {
      // Crear rango para el día completo
      const startDate = new Date(dateParam);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(dateParam);
      endDate.setHours(23, 59, 59, 999);

      dateFilter = {
        sessionDate: {
          $gte: startDate,
          $lte: endDate
        }
      };

      console.log(`🏁 [RACES-V0] Fetching races for date: ${dateParam}`);
    } else {
      console.log(`🏁 [RACES-V0] Fetching all races`);
    }

    // Obtener carreras (ordenadas por fecha desc)
    const races = await RaceSessionV0.find(dateFilter)
      .sort({ sessionDate: -1 })
      .lean();

    console.log(`📊 [RACES-V0] Found ${races.length} races`);

    // Formatear para frontend
    const formattedRaces = races.map(race => ({
      sessionId: race.sessionId,
      sessionName: race.sessionName,
      sessionDate: race.sessionDate.toISOString(),
      sessionType: race.sessionType,
      totalDrivers: race.totalDrivers,
      totalLaps: race.totalLaps,
      displayDate: new Date(race.sessionDate).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      displayTime: new Date(race.sessionDate).toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }));

    return NextResponse.json({
      success: true,
      races: formattedRaces,
      totalRaces: formattedRaces.length,
      date: dateParam || 'all',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [RACES-V0] Error fetching races:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch races V0',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
