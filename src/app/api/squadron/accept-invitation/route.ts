import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';
import WebUser from '@/models/WebUser';
import FairRacingScore from '@/models/FairRacingScore';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface AcceptInvitationBody {
  invitationId: string;
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

    const body: AcceptInvitationBody = await req.json();
    const { invitationId } = body;

    if (!invitationId) {
      return NextResponse.json(
        { error: 'invitationId es requerido' },
        { status: 400 }
      );
    }

    // Obtener usuario
    const user = await WebUser.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que no está en una escudería
    if (user.squadron.squadronId) {
      return NextResponse.json(
        { error: 'Ya perteneces a una escudería' },
        { status: 400 }
      );
    }

    // Buscar la invitación
    const invitation = user.invitations.find((inv: any) => inv._id.toString() === invitationId);
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitación no encontrada' },
        { status: 404 }
      );
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Esta invitación ya fue procesada' },
        { status: 400 }
      );
    }

    // Buscar la escudería
    const squadron = await Squadron.findById(invitation.squadronId);
    if (!squadron) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }

    if (!squadron.isActive) {
      return NextResponse.json(
        { error: 'Esta escudería no está activa' },
        { status: 400 }
      );
    }

    if (squadron.members.length >= 4) {
      return NextResponse.json(
        { error: 'Esta escudería está llena' },
        { status: 400 }
      );
    }

    // Obtener Fair Racing Score
    let fairRacingScore = await FairRacingScore.findOne({ pilotId: userId });
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
    user.currentSquadron = squadron._id; // IMPORTANTE: Actualizar currentSquadron también

    // Marcar invitación como aceptada
    invitation.status = 'accepted';
    invitation.respondedAt = new Date();

    await user.save();

    return NextResponse.json({
      success: true,
      message: `Te has unido a ${squadron.name}`,
    });

  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Error al aceptar invitación', details: error.message },
      { status: 500 }
    );
  }
}
