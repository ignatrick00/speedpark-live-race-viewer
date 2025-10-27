import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';
import WebUser from '@/models/WebUser';
import FairRacingScore from '@/models/FairRacingScore';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let userId: string;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    await connectDB();

    // Obtener usuario
    const user = await WebUser.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si tiene escudería
    if (!user.squadron.squadronId) {
      return NextResponse.json({
        success: true,
        hasSquadron: false,
        message: 'No perteneces a ninguna escudería',
      });
    }

    // Obtener escudería completa
    const squadron = await Squadron.findById(user.squadron.squadronId)
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
      scoresMap.set(score.pilotId.toString(), {
        currentScore: score.currentScore,
        totalRacesClean: score.totalRacesClean,
        incidentsCount: score.incidentsHistory?.length || 0,
        recognitionsCount: score.recognitions?.length || 0,
      });
    });

    // Agregar datos completos a cada miembro
    const membersWithDetails = squadron.members.map((member: any) => {
      const fairRacingData = scoresMap.get(member._id.toString()) || {
        currentScore: 85,
        totalRacesClean: 0,
        incidentsCount: 0,
        recognitionsCount: 0,
      };

      return {
        _id: member._id,
        email: member.email,
        profile: member.profile,
        role: member.squadron.role,
        joinedAt: member.squadron.joinedAt,
        ...fairRacingData,
      };
    });

    // Estadísticas de la escudería
    const stats = {
      memberCount: squadron.members.length,
      availableSpots: 4 - squadron.members.length,
      isFull: squadron.members.length >= 4,
      winRate: squadron.totalRaces > 0
        ? ((squadron.totalVictories / squadron.totalRaces) * 100).toFixed(1)
        : '0.0',
      averageFairRacing: squadron.fairRacingAverage,
    };

    // Información del usuario actual
    const currentUserRole = user.squadron.role;
    const isCaptain = currentUserRole === 'captain';

    return NextResponse.json({
      success: true,
      hasSquadron: true,
      squadron: {
        ...squadron,
        members: membersWithDetails,
        stats,
      },
      userRole: currentUserRole,
      isCaptain,
    });

  } catch (error: any) {
    console.error('Error fetching my squadron:', error);
    return NextResponse.json(
      { error: 'Error al obtener tu escudería', details: error.message },
      { status: 500 }
    );
  }
}
