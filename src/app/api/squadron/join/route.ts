import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';
import WebUser from '@/models/WebUser';
import FairRacingScore from '@/models/FairRacingScore';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JoinSquadronRequest {
  squadronId: string;
}

export async function POST(req: NextRequest) {
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

    const body: JoinSquadronRequest = await req.json();
    const { squadronId } = body;

    if (!squadronId) {
      return NextResponse.json(
        { error: 'squadronId es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe
    const user = await WebUser.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario NO está en una escudería
    if (user.squadron.squadronId) {
      return NextResponse.json(
        { error: 'Ya perteneces a una escudería. Debes salir primero.' },
        { status: 400 }
      );
    }

    // Buscar la escudería
    const squadron = await Squadron.findById(squadronId);
    if (!squadron) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la escudería está activa
    if (!squadron.isActive) {
      return NextResponse.json(
        { error: 'Esta escudería no está activa' },
        { status: 400 }
      );
    }

    // Verificar que la escudería tiene espacio (máx 4 miembros)
    if (squadron.members.length >= 4) {
      return NextResponse.json(
        { error: 'Esta escudería está llena (máximo 4 miembros)' },
        { status: 400 }
      );
    }

    // Verificar modo de reclutamiento
    if (squadron.recruitmentMode === 'invite-only') {
      // TODO: Verificar que existe una invitación pendiente
      // Por ahora rechazamos si es invite-only
      return NextResponse.json(
        { error: 'Esta escudería solo acepta miembros por invitación' },
        { status: 403 }
      );
    }

    // Obtener Fair Racing Score del usuario
    let fairRacingScore = await FairRacingScore.findOne({ pilotId: userId });

    // Si no existe, crear uno nuevo (todos empiezan en 85)
    if (!fairRacingScore) {
      fairRacingScore = await FairRacingScore.create({
        pilotId: userId,
        currentScore: 85,
        initialScore: 85,
      });
    }

    // Agregar usuario a la escudería
    squadron.members.push(user._id);

    // Recalcular promedio de fair racing
    const allMembersFairRacing = await FairRacingScore.find({
      pilotId: { $in: squadron.members },
    });

    const totalFairRacing = allMembersFairRacing.reduce(
      (sum, score) => sum + score.currentScore,
      0
    );
    squadron.fairRacingAverage = Math.round(totalFairRacing / squadron.members.length);

    await squadron.save();

    // Actualizar usuario
    user.squadron.squadronId = squadron._id;
    user.squadron.role = 'member';
    user.squadron.joinedAt = new Date();
    await user.save();

    // Populate para devolver datos completos
    const populatedSquadron = await Squadron.findById(squadron._id)
      .populate('captainId', 'email profile')
      .populate('members', 'email profile');

    return NextResponse.json({
      success: true,
      message: `Te has unido a ${squadron.name}`,
      squadron: populatedSquadron,
    });

  } catch (error: any) {
    console.error('Error joining squadron:', error);
    return NextResponse.json(
      { error: 'Error al unirse a la escudería', details: error.message },
      { status: 500 }
    );
  }
}
