import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';
import FairRacingScore from '@/models/FairRacingScore';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { id } = params;

    // Buscar escudería y popular miembros
    const squadron = await Squadron.findById(id)
      .populate('captainId', 'email profile squadron')
      .populate('members', 'email profile squadron')
      .lean();

    if (!squadron) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }

    // Obtener Fair Racing Scores de todos los miembros
    const memberIds = squadron.members.map((m: any) => m._id);
    const fairRacingScores = await FairRacingScore.find({
      pilotId: { $in: memberIds },
    }).lean();

    // Crear mapa de scores por pilotId
    const scoresMap = new Map();
    fairRacingScores.forEach((score: any) => {
      scoresMap.set(score.pilotId.toString(), score.currentScore);
    });

    // Agregar fair racing score a cada miembro
    const membersWithScores = squadron.members.map((member: any) => ({
      ...member,
      fairRacingScore: scoresMap.get(member._id.toString()) || 85,
    }));

    // Calcular estadísticas adicionales
    const stats = {
      memberCount: squadron.members.length,
      availableSpots: 4 - squadron.members.length,
      isFull: squadron.members.length >= 4,
      winRate: squadron.totalRaces > 0
        ? ((squadron.totalVictories / squadron.totalRaces) * 100).toFixed(1)
        : '0.0',
    };

    return NextResponse.json({
      success: true,
      squadron: {
        ...squadron,
        members: membersWithScores,
        stats,
      },
    });

  } catch (error: any) {
    console.error('Error fetching squadron:', error);
    return NextResponse.json(
      { error: 'Error al obtener la escudería', details: error.message },
      { status: 500 }
    );
  }
}
