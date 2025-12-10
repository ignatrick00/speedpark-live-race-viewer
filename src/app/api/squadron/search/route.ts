import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';
import SquadronPointsHistory from '@/models/SquadronPointsHistory';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Obtener query params
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const division = searchParams.get('division') || 'all';
    const recruitmentMode = searchParams.get('recruitmentMode') || 'all';
    const minFairRacing = parseInt(searchParams.get('minFairRacing') || '0');
    const hasSpace = searchParams.get('hasSpace') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    // Construir filtros
    // Mostrar todas las escuaderías (activas e inactivas) para permitir reactivación
    const filters: any = {};

    // Búsqueda por nombre
    if (query) {
      filters.name = { $regex: query, $options: 'i' };
    }

    // Filtro por división
    if (division !== 'all') {
      filters.division = division;
    }

    // Filtro por modo de reclutamiento
    // Por defecto, solo mostrar escuaderías abiertas (open)
    // Solo mostrar invite-only si se solicita explícitamente
    if (recruitmentMode === 'invite-only') {
      filters.recruitmentMode = 'invite-only';
    } else if (recruitmentMode === 'all') {
      // Si explícitamente pide "all", mostrar ambas
      // No agregar filtro de recruitmentMode
    } else {
      // Por defecto (incluyendo cuando recruitmentMode === 'open'), solo mostrar open
      filters.recruitmentMode = 'open';
    }

    // Filtro por fair racing mínimo
    if (minFairRacing > 0) {
      filters.fairRacingAverage = { $gte: minFairRacing };
    }

    // Filtro por espacios disponibles (menos de 4 miembros)
    if (hasSpace) {
      filters.$expr = {
        $lt: [{ $size: '$members' }, 4]
      };
    }

    // Ejecutar query con paginación
    const skip = (page - 1) * limit;

    const [squadrons, total] = await Promise.all([
      Squadron.find(filters)
        .populate('captainId', 'email profile')
        .populate('members', 'email profile')
        .sort({ ranking: 1, totalPoints: -1 }) // Mejor ranking primero
        .skip(skip)
        .limit(limit)
        .lean(),
      Squadron.countDocuments(filters),
    ]);

    // Calcular puntos desde SquadronPointsHistory para cada escudería
    const squadronsWithMeta = await Promise.all(
      squadrons.map(async (squadron: any) => {
        // Calcular puntos totales desde historial
        const pointsHistory = await SquadronPointsHistory.aggregate([
          { $match: { squadronId: squadron._id } },
          { $group: { _id: null, totalPoints: { $sum: '$pointsChange' } } }
        ]);

        const totalPoints = pointsHistory.length > 0 ? pointsHistory[0].totalPoints : 0;

        return {
          ...squadron,
          totalPoints: totalPoints, // Override con puntos calculados desde historial
          stats: {
            memberCount: squadron.members.length,
            availableSpots: 4 - squadron.members.length,
            isFull: squadron.members.length >= 4,
            winRate: squadron.totalRaces > 0
              ? ((squadron.totalVictories / squadron.totalRaces) * 100).toFixed(1) + '%'
              : '0%',
            averageFairRacing: squadron.fairRacingAverage || 0,
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      squadrons: squadronsWithMeta,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + squadrons.length < total,
      },
      filters: {
        query,
        division,
        recruitmentMode,
        minFairRacing,
        hasSpace,
      },
    });

  } catch (error: any) {
    console.error('Error searching squadrons:', error);
    return NextResponse.json(
      { error: 'Error al buscar escuderías', details: error.message },
      { status: 500 }
    );
  }
}
