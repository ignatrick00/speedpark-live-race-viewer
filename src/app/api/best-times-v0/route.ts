import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RaceSessionV0 from '@/models/RaceSessionV0';

export const dynamic = 'force-dynamic';

/**
 * GET /api/best-times-v0?period=day|week|month|all&type=drivers|karts
 * Obtener mejores tiempos de pilotos o karts desde race_sessions_v0
 */
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'day';
    const type = searchParams.get('type') || 'drivers';
    const dateParam = searchParams.get('date'); // Formato: YYYY-MM-DD

    // Calcular filtro de fecha según período (usando timezone de Chile)
    let dateFilter: any = {};
    const now = new Date();

    if (period === 'day') {
      // Si hay un parámetro de fecha específico, usarlo
      const targetDate = dateParam ? new Date(dateParam + 'T00:00:00-03:00') : null;

      if (targetDate && !isNaN(targetDate.getTime())) {
        // Fecha específica seleccionada por el usuario
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        dateFilter = {
          sessionDate: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        };
        console.log(`📅 [CUSTOM DATE] Selected: ${dateParam}, Range: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}`);
      } else {
        // Fecha actual (HOY) en Chile
        const chileOffset = -3 * 60; // -3 horas en minutos
        const utcNow = now.getTime() + (now.getTimezoneOffset() * 60000);
        const chileNow = new Date(utcNow + (chileOffset * 60000));

        // Medianoche de hoy en Chile
        const startOfDayChile = new Date(chileNow);
        startOfDayChile.setHours(0, 0, 0, 0);

        // Convertir de vuelta a UTC para MongoDB
        const startOfDayUTC = new Date(startOfDayChile.getTime() - (chileOffset * 60000));

        dateFilter = { sessionDate: { $gte: startOfDayUTC } };
        console.log(`📅 [DAY FILTER] Chile now: ${chileNow.toISOString()}, Start of day UTC: ${startOfDayUTC.toISOString()}`);
      }
    } else if (period === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      dateFilter = { sessionDate: { $gte: startOfWeek } };
    } else if (period === 'month') {
      const startOfMonth = new Date(now);
      startOfMonth.setDate(now.getDate() - 30);
      dateFilter = { sessionDate: { $gte: startOfMonth } };
    }
    // 'all' no tiene filtro de fecha

    console.log(`🏆 [BEST-TIMES-V0] Fetching ${type} for period: ${period}`);

    if (type === 'drivers') {
      // Mejores tiempos de PILOTOS
      const bestTimes = await RaceSessionV0.aggregate([
        { $match: dateFilter },
        { $unwind: '$drivers' },
        { $match: { 'drivers.bestTime': { $gt: 0 } } },
        // ✅ FIX: Ordenar por bestTime ANTES de agrupar
        { $sort: { 'drivers.bestTime': 1 } },
        {
          $group: {
            _id: '$drivers.driverName',
            // ✅ FIX: Ahora $first tomará el mejor tiempo (ya ordenado)
            bestTime: { $first: '$drivers.bestTime' },
            kartNumber: { $first: '$drivers.kartNumber' },  // Kart del mejor tiempo
            sessionName: { $first: '$sessionName' },
            sessionDate: { $first: '$sessionDate' }
          }
        },
        { $sort: { bestTime: 1 } },
        { $limit: 10 }
      ]);

      console.log(`✅ [BEST-TIMES-V0] Found ${bestTimes.length} drivers for period: ${period}`);
      if (period === 'day' && bestTimes.length > 0) {
        console.log(`📊 [SAMPLE] First result: ${bestTimes[0]._id} - ${bestTimes[0].sessionName} - Date: ${new Date(bestTimes[0].sessionDate).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}`);
      }

      // Formatear para frontend - retornar todos los resultados (20 para drivers)
      const formattedTimes = bestTimes.map((item, idx) => ({
        position: idx + 1,
        driverName: item._id,
        bestTime: item.bestTime,
        kartNumber: item.kartNumber,
        sessionName: item.sessionName,
        sessionDate: new Date(item.sessionDate).toISOString().split('T')[0],
        sessionTime: formatDate(item.sessionDate),
        sessionDateTime: formatDateTime(item.sessionDate)
      }));

      return NextResponse.json({
        success: true,
        period,
        type: 'drivers',
        bestTimes: formattedTimes,
        totalResults: formattedTimes.length,
        timestamp: new Date().toISOString()
      });

    } else {
      // Mejores tiempos de KARTS
      const bestKartTimes = await RaceSessionV0.aggregate([
        { $match: dateFilter },
        { $unwind: '$drivers' },
        { $match: { 'drivers.bestTime': { $gt: 0 } } },
        // ✅ FIX: Ordenar por bestTime ANTES de agrupar
        { $sort: { 'drivers.bestTime': 1 } },
        {
          $group: {
            _id: '$drivers.kartNumber',
            // ✅ FIX: Ahora $first tomará el mejor tiempo (ya ordenado)
            bestTime: { $first: '$drivers.bestTime' },
            driverName: { $first: '$drivers.driverName' },  // Piloto del mejor tiempo
            sessionName: { $first: '$sessionName' },
            sessionDate: { $first: '$sessionDate' }
          }
        },
        { $sort: { bestTime: 1 } },
        { $limit: 20 }
      ]);

      // Formatear para frontend - retornar todos los resultados (20 para karts)
      const formattedKarts = bestKartTimes.map((item, idx) => ({
        position: idx + 1,
        kart: item._id,
        time: formatTime(item.bestTime),
        driver: item.driverName,
        session: item.sessionName,
        date: formatDateTime(item.sessionDate)
      }));

      return NextResponse.json({
        success: true,
        period,
        type: 'karts',
        bestTimes: formattedKarts,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('❌ [BEST-TIMES-V0] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch best times V0',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Helper: Formatear tiempo en milisegundos a "M:SS.mmm"
function formatTime(ms: number): string {
  if (!ms || ms === 0) return '--:--.---';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

// Helper: Formatear fecha (solo hora)
function formatDate(date: Date): string {
  return new Date(date).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Helper: Formatear fecha completa
function formatDateTime(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short'
  }) + ' ' + d.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit'
  });
}
