import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RaceSessionV0 from '@/models/RaceSessionV0';
import WebUser from '@/models/WebUser';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leaderboard-v0
 * Obtener clasificación general de pilotos desde race_sessions_v0
 * Basado en mejor tiempo de vuelta histórico + estadísticas
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const userId = searchParams.get('userId'); // Para incluir posición del usuario si no está en top

    console.log(`🏆 [LEADERBOARD-V0] Fetching leaderboard (limit: ${limit}, userId: ${userId})`);

    // Aggregation para obtener clasificación general (sin linkedUserId)
    const leaderboard = await RaceSessionV0.aggregate([
      // 1. Descomponer drivers array
      { $unwind: '$drivers' },

      // 2. Filtrar solo tiempos válidos
      { $match: { 'drivers.bestTime': { $gt: 0 } } },

      // 3. Agrupar por driver y calcular estadísticas
      {
        $group: {
          _id: '$drivers.driverName',
          bestLapTime: { $min: '$drivers.bestTime' },
          totalRaces: { $sum: 1 },
          podiums: {
            $sum: {
              $cond: [{ $lte: ['$drivers.finalPosition', 3] }, 1, 0]
            }
          },
          bestPosition: { $min: '$drivers.finalPosition' },
          // Obtener fecha más reciente para referencia
          lastRace: { $max: '$sessionDate' }
        }
      },

      // 4. Ordenar por mejor tiempo (ascendente = más rápido primero)
      { $sort: { bestLapTime: 1 } },

      // 5. Limitar resultados
      { $limit: limit }
    ]);

    // Buscar webUserId de cada driver en WebUser (SINGLE SOURCE OF TRUTH)
    const driverNames = leaderboard.map(entry => entry._id);
    const linkedUsers = await WebUser.find({
      'kartingLink.status': 'linked',
      'kartingLink.driverName': { $in: driverNames }
    }).select('_id kartingLink.driverName').lean();

    // Crear mapa de driverName -> webUserId
    const driverToUserMap = new Map();
    linkedUsers.forEach((user: any) => {
      if (user.kartingLink?.driverName) {
        driverToUserMap.set(user.kartingLink.driverName.toLowerCase(), user._id.toString());
      }
    });

    console.log(`🔗 [LEADERBOARD-V0] Found ${linkedUsers.length} linked users out of ${driverNames.length} drivers`);

    // Formatear para frontend con webUserId del mapa
    const formattedLeaderboard = leaderboard.map((entry, index) => ({
      position: index + 1,
      driverName: entry._id,
      bestLapTime: entry.bestLapTime,
      totalRaces: entry.totalRaces,
      podiums: entry.podiums,
      bestPosition: entry.bestPosition,
      webUserId: driverToUserMap.get(entry._id.toLowerCase()) || null
    }));

    console.log(`✅ [LEADERBOARD-V0] Returning ${formattedLeaderboard.length} entries`);

    // Si se solicita userId y no está en el top, buscar su posición
    let userEntry = null;
    if (userId && !formattedLeaderboard.some(e => e.webUserId === userId)) {
      // Buscar driverName del usuario (SINGLE SOURCE OF TRUTH)
      const user = await WebUser.findById(userId).select('kartingLink').lean();

      if (user && (user as any).kartingLink?.status === 'linked' && (user as any).kartingLink?.driverName) {
        const userDriverName = (user as any).kartingLink.driverName;
        console.log(`🔍 [LEADERBOARD-V0] Looking for user's driver: "${userDriverName}"`);

        // Obtener posición completa del usuario
        const allDrivers = await RaceSessionV0.aggregate([
          { $unwind: '$drivers' },
          { $match: { 'drivers.bestTime': { $gt: 0 } } },
          {
            $group: {
              _id: '$drivers.driverName',
              bestLapTime: { $min: '$drivers.bestTime' },
              totalRaces: { $sum: 1 },
              podiums: {
                $sum: {
                  $cond: [{ $lte: ['$drivers.finalPosition', 3] }, 1, 0]
                }
              },
              bestPosition: { $min: '$drivers.finalPosition' }
            }
          },
          { $sort: { bestLapTime: 1 } }
        ]);

        // Buscar por driverName (case-insensitive)
        const userIndex = allDrivers.findIndex(d =>
          d._id.toLowerCase() === userDriverName.toLowerCase()
        );

        if (userIndex !== -1) {
          const userDriver = allDrivers[userIndex];
          userEntry = {
            position: userIndex + 1,
            driverName: userDriver._id,
            bestLapTime: userDriver.bestLapTime,
            totalRaces: userDriver.totalRaces,
            podiums: userDriver.podiums,
            bestPosition: userDriver.bestPosition,
            webUserId: userId
          };
          console.log(`👤 [LEADERBOARD-V0] User position: ${userEntry.position}`);
        }
      } else {
        console.log(`⚠️ [LEADERBOARD-V0] User ${userId} is not linked to any driver`);
      }
    }

    return NextResponse.json({
      success: true,
      leaderboard: formattedLeaderboard,
      userEntry,
      userPosition: userEntry?.position || null,
      totalDrivers: leaderboard.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [LEADERBOARD-V0] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch leaderboard',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
