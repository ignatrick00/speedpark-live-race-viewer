import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RaceSessionV0 from '@/models/RaceSessionV0';
import WebUser from '@/models/WebUser';

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
      if (dateParam) {
        // Parsear fecha en HORA CHILE (no UTC)
        // dateParam viene como "2026-01-13" (YYYY-MM-DD)
        const [year, month, day] = dateParam.split('-');

        // Crear timestamps UTC que representan 00:00 y 23:59:59 de ese día EN CHILE
        // Ejemplo: 2026-01-13 00:00 Chile = 2026-01-13 03:00 UTC
        const startOfDay = new Date(`${year}-${month}-${day}T00:00:00-03:00`);
        const endOfDay = new Date(`${year}-${month}-${day}T23:59:59-03:00`);

        dateFilter = {
          sessionDate: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        };
        console.log(`📅 [CUSTOM DATE] Selected: ${dateParam} (Chile)`);
        console.log(`📅 [CUSTOM DATE] Range UTC: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}`);
        console.log(`📅 [CUSTOM DATE] Range Chile: ${startOfDay.toLocaleString('es-CL', { timeZone: 'America/Santiago' })} - ${endOfDay.toLocaleString('es-CL', { timeZone: 'America/Santiago' })}`);
      } else {
        // Fecha actual (HOY) en Chile - usar Intl para precisión
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Santiago',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });

        const parts = formatter.formatToParts(now);
        const year = parts.find(p => p.type === 'year')!.value;
        const month = parts.find(p => p.type === 'month')!.value;
        const day = parts.find(p => p.type === 'day')!.value;

        // Crear timestamp UTC que representa 00:00 hora Chile (-03:00)
        const startOfDayUTC = new Date(`${year}-${month}-${day}T00:00:00-03:00`);

        dateFilter = { sessionDate: { $gte: startOfDayUTC } };
        console.log(`📅 [DAY FILTER] Chile date: ${day}/${month}/${year}`);
        console.log(`📅 [DAY FILTER] Start of day UTC: ${startOfDayUTC.toISOString()}`);
        console.log(`📅 [DAY FILTER] In Chile time: ${startOfDayUTC.toLocaleString('es-CL', { timeZone: 'America/Santiago' })}`);
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

    // 🏁 FILTRO CRÍTICO: Incluir sesiones de CARRERA y CLASIFICACIÓN para rankings
    // Aplicar la MISMA lógica que raceSessionServiceV0.ts (líneas 258-288)
    const sessionTypeFilter = {
      ...dateFilter,
      sessionType: { $in: ['carrera', 'clasificacion'] }, // Carreras y clasificaciones HEAT
      // Excluir carreras de otras categorías/pistas (K1, K2, K3, GT, F1, Mujeres, Junior, etc.)
      sessionName: {
        $not: {
          $regex: /f\s?1|f\s?2|f\s?3|k\s?1|k\s?2|k\s?3|gt|mujeres|women|junior| m(?!\w)/i
        }
      }
    };

    console.log(`🔍 [FILTER] Applied race validation filter - including races and HEAT classifications`);

    if (type === 'drivers') {
      // Mejores tiempos de PILOTOS
      const bestTimes = await RaceSessionV0.aggregate([
        { $match: sessionTypeFilter }, // ✅ Ahora filtra por tipo de sesión
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

      // Lookup web users for driver names
      const driverNames = bestTimes.map(t => t._id);
      const webUsers = await WebUser.find({
        'kartingLink.driverName': { $in: driverNames },
        'kartingLink.status': 'linked',
        'accountStatus': { $ne: 'deleted' }
      }).select('_id kartingLink.driverName profile.photoUrl').lean();

      // Create map for quick lookup (userId and photoUrl)
      const driverToUserIdMap = new Map(
        webUsers.map(u => [u.kartingLink.driverName, u._id.toString()])
      );
      const driverToPhotoUrlMap = new Map(
        webUsers.map(u => [u.kartingLink.driverName, u.profile?.photoUrl || null])
      );

      // Formatear para frontend - retornar todos los resultados (20 para drivers)
      const formattedTimes = bestTimes.map((item, idx) => ({
        position: idx + 1,
        driverName: item._id,
        webUserId: driverToUserIdMap.get(item._id) || null,
        photoUrl: driverToPhotoUrlMap.get(item._id) || null,
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
        { $match: sessionTypeFilter }, // ✅ Ahora filtra por tipo de sesión
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

      // Lookup web users for kart drivers
      const kartDriverNames = bestKartTimes.map(k => k.driverName);
      const kartWebUsers = await WebUser.find({
        'kartingLink.driverName': { $in: kartDriverNames },
        'kartingLink.status': 'linked',
        'accountStatus': { $ne: 'deleted' }
      }).select('_id kartingLink.driverName profile.photoUrl').lean();

      // Create maps for quick lookup
      const kartDriverToUserIdMap = new Map(
        kartWebUsers.map(u => [u.kartingLink.driverName, u._id.toString()])
      );
      const kartDriverToPhotoUrlMap = new Map(
        kartWebUsers.map(u => [u.kartingLink.driverName, u.profile?.photoUrl || null])
      );

      // Formatear para frontend - retornar todos los resultados (20 para karts)
      const formattedKarts = bestKartTimes.map((item, idx) => ({
        position: idx + 1,
        kart: item._id,
        time: formatTime(item.bestTime),
        driver: item.driverName,
        webUserId: kartDriverToUserIdMap.get(item.driverName) || null,
        photoUrl: kartDriverToPhotoUrlMap.get(item.driverName) || null,
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
  // toLocaleTimeString convierte automáticamente UTC a timezone Chile
  return new Date(date).toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Santiago'
  });
}

// Helper: Formatear fecha completa
function formatDateTime(date: Date): string {
  // toLocaleDateString/Time convierten automáticamente UTC a timezone Chile
  const d = new Date(date);
  return d.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    timeZone: 'America/Santiago'
  }) + ' ' + d.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Santiago'
  });
}
