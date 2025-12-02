import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';
import WebUser from '@/models/WebUser';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface UpdateSquadronBody {
  name?: string;
  description?: string;
  colors?: {
    primary: string;
    secondary: string;
  };
  recruitmentMode?: 'open' | 'invite-only';
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

    const body: UpdateSquadronBody = await req.json();
    const { name, description, colors, recruitmentMode } = body;

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
        { error: 'Solo el capitán puede editar la escudería' },
        { status: 403 }
      );
    }

    // Actualizar campos si fueron proporcionados
    if (name !== undefined) {
      if (name.length < 3 || name.length > 30) {
        return NextResponse.json(
          { error: 'El nombre debe tener entre 3 y 30 caracteres' },
          { status: 400 }
        );
      }

      // Verificar que el nombre no esté en uso
      const existingSquadron = await Squadron.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: squadron._id },
      });

      if (existingSquadron) {
        return NextResponse.json(
          { error: 'Ya existe una escudería con ese nombre' },
          { status: 400 }
        );
      }

      squadron.name = name;
    }

    if (description !== undefined) {
      if (description.length > 500) {
        return NextResponse.json(
          { error: 'La descripción no puede exceder 500 caracteres' },
          { status: 400 }
        );
      }
      squadron.description = description;
    }

    if (colors !== undefined) {
      if (!colors.primary || !colors.secondary) {
        return NextResponse.json(
          { error: 'Debes proporcionar ambos colores (primary y secondary)' },
          { status: 400 }
        );
      }
      squadron.colors.primary = colors.primary;
      squadron.colors.secondary = colors.secondary;
    }

    if (recruitmentMode !== undefined) {
      squadron.recruitmentMode = recruitmentMode;
    }

    await squadron.save();

    // Populate para devolver datos completos
    const populatedSquadron = await Squadron.findById(squadron._id)
      .populate('captainId', 'email profile')
      .populate('members', 'email profile');

    return NextResponse.json({
      success: true,
      message: 'Escudería actualizada correctamente',
      squadron: populatedSquadron,
    });

  } catch (error: any) {
    console.error('Error updating squadron:', error);
    return NextResponse.json(
      { error: 'Error al actualizar escudería', details: error.message },
      { status: 500 }
    );
  }
}
