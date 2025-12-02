import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';
import WebUser from '@/models/WebUser';
import FairRacingScore from '@/models/FairRacingScore';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface RemoveMemberBody {
  memberId: string;
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

    const body: RemoveMemberBody = await req.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: 'memberId es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el usuario es capitán de una escudería
    const captain = await WebUser.findById(userId);
    if (!captain || !captain.squadron.squadronId) {
      return NextResponse.json(
        { error: 'No perteneces a ninguna escudería' },
        { status: 400 }
      );
    }

    const squadron = await Squadron.findById(captain.squadron.squadronId);
    if (!squadron) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }

    if (squadron.captainId.toString() !== userId) {
      return NextResponse.json(
        { error: 'Solo el capitán puede expulsar miembros' },
        { status: 403 }
      );
    }

    // Verificar que el miembro a expulsar no es el capitán
    if (memberId === userId) {
      return NextResponse.json(
        { error: 'No puedes expulsarte a ti mismo. Transfiere la capitanía primero.' },
        { status: 400 }
      );
    }

    // Verificar que el miembro pertenece a la escudería
    if (!squadron.members.some((m: any) => m.toString() === memberId)) {
      return NextResponse.json(
        { error: 'Este piloto no pertenece a tu escudería' },
        { status: 400 }
      );
    }

    // Remover miembro del array
    squadron.members = squadron.members.filter((m: any) => m.toString() !== memberId);

    // Recalcular promedio de fair racing
    const allMembersFairRacing = await FairRacingScore.find({
      pilotId: { $in: squadron.members },
    });

    if (allMembersFairRacing.length > 0) {
      const totalFairRacing = allMembersFairRacing.reduce(
        (sum, score) => sum + score.currentScore,
        0
      );
      squadron.fairRacingAverage = Math.round(totalFairRacing / squadron.members.length);
    } else {
      squadron.fairRacingAverage = 0;
    }

    await squadron.save();

    // Actualizar usuario expulsado
    const member = await WebUser.findById(memberId);
    if (member) {
      member.squadron.squadronId = undefined as any;
      member.squadron.role = undefined as any;
      member.squadron.joinedAt = undefined as any;
      await member.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Miembro expulsado correctamente',
      squadron,
    });

  } catch (error: any) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Error al expulsar miembro', details: error.message },
      { status: 500 }
    );
  }
}
