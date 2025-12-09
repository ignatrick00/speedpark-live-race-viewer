import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import SquadronEvent from '@/models/SquadronEvent';
import RaceSanction from '@/models/RaceSanction';
import RaceSessionV0 from '@/models/RaceSessionV0';
import WebUser from '@/models/WebUser';
import Notification from '@/models/Notification';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// POST - Crear una sanción y recalcular puntos
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // Verificar autenticación
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let userId: string;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Verificar que sea organizador
    const user = await WebUser.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const userRoles = (user as any).roles && Array.isArray((user as any).roles)
      ? (user as any).roles
      : ((user as any).role ? [(user as any).role] : ['user']);

    if (!userRoles.includes('organizer')) {
      return NextResponse.json(
        { error: 'Solo los organizadores pueden aplicar sanciones' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { driverName, sanctionType, description, positionPenalty, pointsPenalty } = body;

    if (!driverName || !sanctionType || !description) {
      return NextResponse.json(
        { error: 'driverName, sanctionType y description son requeridos' },
        { status: 400 }
      );
    }

    // Obtener el evento
    const event = await SquadronEvent.findById(params.id);
    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    if (!event.linkedRaceSessionId) {
      return NextResponse.json(
        { error: 'El evento no tiene una carrera vinculada' },
        { status: 400 }
      );
    }

    // Verificar que el piloto existe en la carrera
    const raceSession = await RaceSessionV0.findOne({ sessionId: event.linkedRaceSessionId });
    if (!raceSession) {
      return NextResponse.json({ error: 'Carrera no encontrada' }, { status: 404 });
    }

    const driver = raceSession.drivers.find(
      (d: any) => d.driverName.toLowerCase() === driverName.toLowerCase()
    );
    if (!driver) {
      return NextResponse.json(
        { error: `Piloto "${driverName}" no encontrado en la carrera` },
        { status: 404 }
      );
    }

    // Buscar el webUserId del piloto
    const webUser = await WebUser.findOne({
      'kartingLink.status': 'linked',
      'kartingLink.driverName': { $regex: new RegExp(`^${driverName}$`, 'i') }
    }).select('_id');

    if (!webUser) {
      return NextResponse.json(
        { error: `Piloto "${driverName}" no está vinculado a ningún usuario` },
        { status: 404 }
      );
    }

    const webUserId = webUser._id.toString();

    // Crear la sanción en RaceSanction collection (fuente de verdad única)
    const sanction = await RaceSanction.create({
      eventId: event._id,
      raceSessionId: event.linkedRaceSessionId,
      driverName,
      webUserId,
      sanctionType,
      description,
      positionPenalty: positionPenalty || null,
      pointsPenalty: pointsPenalty || null,
      appliedBy: userId,
      appliedAt: new Date()
    });

    console.log(`⚠️  Sanción creada en RaceSanction: ${driverName} - ${sanctionType} - ${description}`);
    console.log(`📌 ID de sanción: ${sanction._id}`);
    console.log(`📌 Notificación NO enviada (se enviará al finalizar resultados)`);

    // NOTA: Las notificaciones se envían cuando se finaliza el evento (raceStatus = 'finalized')
    // Esto evita spam al piloto mientras el organizador está revisando

    return NextResponse.json({
      success: true,
      message: 'Sanción aplicada exitosamente',
      sanction: {
        id: sanction._id,
        driverName,
        sanctionType,
        description,
        positionPenalty,
        pointsPenalty,
        appliedAt: sanction.appliedAt
      }
    });

  } catch (error: any) {
    console.error('Error applying sanction:', error);
    return NextResponse.json(
      { error: 'Error al aplicar sanción', details: error.message },
      { status: 500 }
    );
  }
}

// GET - Obtener todas las sanciones de un evento
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    console.log(`🔍 [SANCTIONS GET] Buscando sanciones para evento: ${params.id}`);

    // Importar mongoose para usar Types.ObjectId
    const mongoose = require('mongoose');
    const eventObjectId = new mongoose.Types.ObjectId(params.id);

    const sanctions = await RaceSanction.find({ eventId: eventObjectId })
      .populate('appliedBy', 'email profile')
      .sort({ appliedAt: -1 });

    console.log(`📊 [SANCTIONS GET] Encontradas ${sanctions.length} sanciones`);
    if (sanctions.length > 0) {
      console.log(`📋 [SANCTIONS GET] Primera sanción:`, {
        driverName: sanctions[0].driverName,
        sanctionType: sanctions[0].sanctionType,
        positionPenalty: sanctions[0].positionPenalty
      });
    }

    return NextResponse.json({
      success: true,
      sanctions
    });

  } catch (error: any) {
    console.error('Error fetching sanctions:', error);
    return NextResponse.json(
      { error: 'Error al obtener sanciones', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar una sanción
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    // Verificar autenticación
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let userId: string;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    // Verificar que sea organizador
    const user = await WebUser.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const userRoles = (user as any).roles && Array.isArray((user as any).roles)
      ? (user as any).roles
      : ((user as any).role ? [(user as any).role] : ['user']);

    if (!userRoles.includes('organizer')) {
      return NextResponse.json(
        { error: 'Solo los organizadores pueden eliminar sanciones' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sanctionId = searchParams.get('sanctionId');

    if (!sanctionId) {
      return NextResponse.json(
        { error: 'sanctionId es requerido' },
        { status: 400 }
      );
    }

    // Eliminar de RaceSanction (fuente de verdad única)
    const sanction = await RaceSanction.findByIdAndDelete(sanctionId);
    if (!sanction) {
      return NextResponse.json({ error: 'Sanción no encontrada' }, { status: 404 });
    }

    console.log(`🗑️  Sanción eliminada de RaceSanction: ${sanction.driverName} - ${sanction.sanctionType}`);

    return NextResponse.json({
      success: true,
      message: 'Sanción eliminada exitosamente'
    });

  } catch (error: any) {
    console.error('Error deleting sanction:', error);
    return NextResponse.json(
      { error: 'Error al eliminar sanción', details: error.message },
      { status: 500 }
    );
  }
}
