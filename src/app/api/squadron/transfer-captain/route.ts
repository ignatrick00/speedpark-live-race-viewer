import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';
import WebUser from '@/models/WebUser';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface TransferCaptainRequest {
  newCaptainId: string;
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

    const body: TransferCaptainRequest = await req.json();
    const { newCaptainId } = body;

    if (!newCaptainId) {
      return NextResponse.json(
        { error: 'newCaptainId es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el usuario actual existe
    const currentUser = await WebUser.findById(userId);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario actual es capitán
    if (currentUser.squadron.role !== 'captain') {
      return NextResponse.json(
        { error: 'Solo el capitán puede transferir el liderazgo' },
        { status: 403 }
      );
    }

    // Verificar que el nuevo capitán existe
    const newCaptain = await WebUser.findById(newCaptainId);
    if (!newCaptain) {
      return NextResponse.json(
        { error: 'Nuevo capitán no encontrado' },
        { status: 404 }
      );
    }

    // Buscar la escudería
    const squadron = await Squadron.findById(currentUser.squadron.squadronId);
    if (!squadron) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el nuevo capitán está en la misma escudería
    if (newCaptain.squadron.squadronId?.toString() !== squadron._id.toString()) {
      return NextResponse.json(
        { error: 'El nuevo capitán debe ser miembro de tu escudería' },
        { status: 400 }
      );
    }

    // Transferir capitanía
    squadron.captainId = newCaptain._id;
    await squadron.save();

    // Actualizar roles
    currentUser.squadron.role = 'member';
    await currentUser.save();

    newCaptain.squadron.role = 'captain';
    await newCaptain.save();

    // Populate para devolver datos completos
    const populatedSquadron = await Squadron.findById(squadron._id)
      .populate('captainId', 'email profile')
      .populate('members', 'email profile');

    return NextResponse.json({
      success: true,
      message: `Capitanía transferida a ${newCaptain.profile.firstName} ${newCaptain.profile.lastName}`,
      squadron: populatedSquadron,
    });

  } catch (error: any) {
    console.error('Error transferring captaincy:', error);
    return NextResponse.json(
      { error: 'Error al transferir la capitanía', details: error.message },
      { status: 500 }
    );
  }
}
