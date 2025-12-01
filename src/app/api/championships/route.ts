import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Championship from '@/models/Championship';
import { verifyOrganizer } from '@/lib/auth/organizerAuth';

/**
 * POST /api/championships
 * Create a new championship (organizer only)
 *
 * Body: {
 *   name: string,
 *   season: string,
 *   division: 'Elite' | 'Masters' | 'Pro' | 'Open',
 *   pointsSystem: 'f1' | 'custom',
 *   customPoints?: number[],
 *   maxSquadrons?: number,
 *   registrationDeadline?: Date
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify organizer with championship creation permission
    const authResult = await verifyOrganizer(request, 'canCreateChampionships');
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const {
      name,
      season,
      division,
      pointsSystem,
      customPoints,
      maxSquadrons,
      registrationDeadline,
    } = body;

    // Validation
    if (!name || name.trim().length < 3) {
      return NextResponse.json(
        { error: 'El nombre debe tener al menos 3 caracteres' },
        { status: 400 }
      );
    }

    if (!season) {
      return NextResponse.json(
        { error: 'La temporada es requerida' },
        { status: 400 }
      );
    }

    if (!['Elite', 'Masters', 'Pro', 'Open'].includes(division)) {
      return NextResponse.json(
        { error: 'División inválida' },
        { status: 400 }
      );
    }

    if (!['f1', 'custom'].includes(pointsSystem)) {
      return NextResponse.json(
        { error: 'Sistema de puntos inválido' },
        { status: 400 }
      );
    }

    if (pointsSystem === 'custom' && (!customPoints || !Array.isArray(customPoints) || customPoints.length < 3)) {
      return NextResponse.json(
        { error: 'Sistema de puntos personalizado debe tener al menos 3 posiciones' },
        { status: 400 }
      );
    }

    await connectDB();

    // Create championship
    const championship = await Championship.create({
      name: name.trim(),
      season,
      division,
      status: 'registration',
      pointsSystem,
      customPoints: pointsSystem === 'custom' ? customPoints : undefined,
      maxSquadrons: maxSquadrons || 20,
      registrationDeadline: registrationDeadline || null,
      createdBy: authResult.userId,
      registeredSquadrons: [],
      rounds: [],
      standings: [],
    });

    return NextResponse.json({
      success: true,
      message: 'Campeonato creado exitosamente',
      championship,
    });

  } catch (error: any) {
    console.error('Create championship error:', error);
    return NextResponse.json(
      { error: 'Error al crear campeonato', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/championships
 * Get all championships (public)
 * Query params:
 *   - status: 'registration' | 'active' | 'finished' | 'cancelled'
 *   - division: 'Elite' | 'Masters' | 'Pro' | 'Open'
 *   - season: string
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const division = searchParams.get('division');
    const season = searchParams.get('season');

    const filter: any = {};
    if (status) filter.status = status;
    if (division) filter.division = division;
    if (season) filter.season = season;

    const championships = await Championship.find(filter)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'email profile')
      .populate('registeredSquadrons.squadronId', 'name tag')
      .lean();

    return NextResponse.json({
      success: true,
      championships,
    });

  } catch (error: any) {
    console.error('Get championships error:', error);
    return NextResponse.json(
      { error: 'Error al obtener campeonatos', details: error.message },
      { status: 500 }
    );
  }
}
