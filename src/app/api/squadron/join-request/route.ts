import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';
import WebUser from '@/models/WebUser';
import JoinRequest from '@/models/JoinRequest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface CreateJoinRequestBody {
  squadronId: string;
  message?: string;
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

    const body: CreateJoinRequestBody = await req.json();
    const { squadronId, message } = body;

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
        { error: 'Ya perteneces a una escudería' },
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

    // Verificar si ya existe una solicitud pendiente
    const existingRequest = await JoinRequest.findOne({
      squadronId: squadron._id,
      pilotId: userId,
      status: 'pending',
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'Ya tienes una solicitud pendiente para esta escudería' },
        { status: 400 }
      );
    }

    // Crear solicitud
    const joinRequest = await JoinRequest.create({
      squadronId: squadron._id,
      pilotId: userId,
      message: message || '',
      status: 'pending',
    });

    // Populate para devolver datos completos
    const populatedRequest = await JoinRequest.findById(joinRequest._id)
      .populate('pilotId', 'email profile')
      .populate('squadronId', 'name colors');

    return NextResponse.json({
      success: true,
      message: `Solicitud enviada a ${squadron.name}`,
      joinRequest: populatedRequest,
    });

  } catch (error: any) {
    console.error('Error creating join request:', error);
    return NextResponse.json(
      { error: 'Error al enviar solicitud', details: error.message },
      { status: 500 }
    );
  }
}

// GET: Obtener solicitudes del usuario
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

    // Obtener solicitudes del usuario
    const requests = await JoinRequest.find({
      pilotId: userId,
    })
      .populate('squadronId', 'name colors division')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      requests,
    });

  } catch (error: any) {
    console.error('Error fetching join requests:', error);
    return NextResponse.json(
      { error: 'Error al obtener solicitudes', details: error.message },
      { status: 500 }
    );
  }
}
