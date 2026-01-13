import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RaceSessionV0 from '@/models/RaceSessionV0';
import WebUser from '@/models/WebUser';

export const dynamic = 'force-dynamic';

/**
 * GET /api/kart-records-v0?kartNumber=12&period=day|week|month|all
 * Obtener records de un kart específico desde race_sessions_v0
 */
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const kartNumber = parseInt(searchParams.get('kartNumber') || '1');
    const period = searchParams.get('period') || 'day';

    // Calcular filtro de fecha según período
    let dateFilter: any = {};
    const now = new Date();

    if (period === 'day') {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      dateFilter = { sessionDate: { $gte: startOfDay } };
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

    console.log(`🏎️ [KART-RECORDS-V0] Fetching records for Kart #${kartNumber}, period: ${period}`);

    // 🏁 FILTRO CRÍTICO: Incluir sesiones de CARRERA y CLASIFICACIÓN para rankings
    const sessionTypeFilter = {
      ...dateFilter,
      sessionType: { $in: ['carrera', 'clasificacion'] }, // Carreras y clasificaciones HEAT cuentan para rankings
      // Excluir carreras de otras categorías/pistas (K1, K2, K3, GT, F1, Mujeres, Junior, etc.)
      sessionName: {
        $not: {
          $regex: /f\s?1|f\s?2|f\s?3|k\s?1|k\s?2|k\s?3|gt|mujeres|women|junior| m(?!\w)/i
        }
      }
    };

    // Buscar todos los registros de este kart
    const kartRecords = await RaceSessionV0.aggregate([
      { $match: sessionTypeFilter }, // ✅ Ahora filtra por tipo de sesión
      { $unwind: '$drivers' },
      { $match: {
        'drivers.kartNumber': kartNumber,
        'drivers.bestTime': { $gt: 0 }
      }},
      // Ordenar por mejor tiempo ANTES de agrupar
      { $sort: { 'drivers.bestTime': 1 } },
      // Agrupar por piloto y tomar su mejor tiempo
      {
        $group: {
          _id: '$drivers.driverName',
          bestTime: { $first: '$drivers.bestTime' },
          sessionName: { $first: '$sessionName' },
          sessionDate: { $first: '$sessionDate' }
        }
      },
      // Proyectar con nombres correctos
      {
        $project: {
          driverName: '$_id',
          bestTime: 1,
          sessionName: 1,
          sessionDate: 1,
          _id: 0
        }
      },
      { $sort: { bestTime: 1 } }, // Ordenar por mejor tiempo
      { $limit: 50 } // Top 50 pilotos únicos
    ]);

    // Get all unique driver names to lookup web users
    const driverNames = [...new Set(kartRecords.map(r => r.driverName))];

    // Lookup web users by driver name
    const webUsers = await WebUser.find({
      'kartingLink.driverName': { $in: driverNames },
      'kartingLink.status': 'linked',
      'accountStatus': { $ne: 'deleted' }
    }).select('_id kartingLink.driverName profile.photoUrl').lean();

    // Create maps for quick lookup
    const driverToUserIdMap = new Map(
      webUsers.map(u => [u.kartingLink.driverName, u._id.toString()])
    );
    const driverToPhotoUrlMap = new Map(
      webUsers.map(u => [u.kartingLink.driverName, u.profile?.photoUrl || null])
    );

    // Formatear para frontend (agregar posición, webUserId y photoUrl)
    const formattedRecords = kartRecords.map((record, idx) => ({
      position: idx + 1,
      driverName: record.driverName,
      webUserId: driverToUserIdMap.get(record.driverName) || null,
      photoUrl: driverToPhotoUrlMap.get(record.driverName) || null,
      bestTime: record.bestTime,
      sessionName: record.sessionName,
      sessionDate: new Date(record.sessionDate).toISOString().split('T')[0],
      sessionTime: formatDate(record.sessionDate),
      sessionDateTime: formatDateTime(record.sessionDate)
    }));

    console.log(`📊 [KART-RECORDS-V0] Found ${formattedRecords.length} records for Kart #${kartNumber}`);

    return NextResponse.json({
      success: true,
      kartNumber,
      period,
      records: formattedRecords,
      totalRecords: formattedRecords.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [KART-RECORDS-V0] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch kart records V0',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
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
