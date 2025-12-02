import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';
import WebUser from '@/models/WebUser';
import JoinRequest from '@/models/JoinRequest';
import FairRacingScore from '@/models/FairRacingScore';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface ResolveRequestBody {
  requestId: string;
  action: 'approve' | 'reject';
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

    const body: ResolveRequestBody = await req.json();
    const { requestId, action } = body;

    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'requestId y action son requeridos' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'action debe ser "approve" o "reject"' },
        { status: 400 }
      );
    }

    // Buscar la solicitud
    const joinRequest = await JoinRequest.findById(requestId)
      .populate('pilotId')
      .populate('squadronId');

    if (!joinRequest) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    if (joinRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Esta solicitud ya fue procesada' },
        { status: 400 }
      );
    }

    // Verificar que el usuario es el capitán de la escudería
    const squadron = await Squadron.findById(joinRequest.squadronId);
    if (!squadron) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }

    if (squadron.captainId.toString() !== userId) {
      return NextResponse.json(
        { error: 'Solo el capitán puede resolver solicitudes' },
        { status: 403 }
      );
    }

    if (action === 'reject') {
      // Rechazar solicitud
      joinRequest.status = 'rejected';
      joinRequest.resolvedAt = new Date();
      joinRequest.resolvedBy = userId as any;
      await joinRequest.save();

      return NextResponse.json({
        success: true,
        message: 'Solicitud rechazada',
        joinRequest,
      });
    }

    // APROBAR: Verificar que hay espacio
    if (squadron.members.length >= 4) {
      return NextResponse.json(
        { error: 'La escudería está llena (máximo 4 miembros)' },
        { status: 400 }
      );
    }

    // Verificar que el piloto no está en otra escudería
    const pilot = await WebUser.findById(joinRequest.pilotId);
    if (!pilot) {
      return NextResponse.json(
        { error: 'Piloto no encontrado' },
        { status: 404 }
      );
    }

    if (pilot.squadron.squadronId) {
      return NextResponse.json(
        { error: 'El piloto ya pertenece a otra escudería' },
        { status: 400 }
      );
    }

    // Obtener Fair Racing Score del piloto
    let fairRacingScore = await FairRacingScore.findOne({ pilotId: pilot._id });

    // Si no existe, crear uno nuevo (todos empiezan en 85)
    if (!fairRacingScore) {
      fairRacingScore = await FairRacingScore.create({
        pilotId: pilot._id,
        currentScore: 85,
        initialScore: 85,
      });
    }

    // Verificar si la escudería estaba vacía ANTES de agregar al nuevo miembro
    const wasInactive = !squadron.isActive || squadron.members.length === 0;

    // Agregar piloto a la escudería
    squadron.members.push(pilot._id);

    // Si la escudería estaba inactiva (sin miembros), reactivarla y hacer capitán al primer miembro
    if (wasInactive) {
      squadron.isActive = true;
      squadron.captainId = pilot._id;
      pilot.squadron.role = 'captain';
    } else {
      pilot.squadron.role = 'member';
    }

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

    // Actualizar piloto
    pilot.squadron.squadronId = squadron._id;
    pilot.squadron.joinedAt = new Date();
    await pilot.save();

    // Aprobar solicitud
    joinRequest.status = 'approved';
    joinRequest.resolvedAt = new Date();
    joinRequest.resolvedBy = userId as any;
    await joinRequest.save();

    return NextResponse.json({
      success: true,
      message: `${pilot.profile.firstName} se ha unido a ${squadron.name}`,
      joinRequest,
      squadron,
    });

  } catch (error: any) {
    console.error('Error resolving join request:', error);
    return NextResponse.json(
      { error: 'Error al procesar solicitud', details: error.message },
      { status: 500 }
    );
  }
}
