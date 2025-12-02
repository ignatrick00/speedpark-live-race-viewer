import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';
import WebUser from '@/models/WebUser';
import JoinRequest from '@/models/JoinRequest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

    // Verificar que el usuario existe
    const user = await WebUser.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario está en una escudería
    if (!user.squadron.squadronId) {
      return NextResponse.json(
        { error: 'No perteneces a ninguna escudería' },
        { status: 400 }
      );
    }

    // Buscar la escudería
    const squadron = await Squadron.findById(user.squadron.squadronId);
    if (!squadron) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el usuario es el capitán
    if (squadron.captainId.toString() !== userId) {
      return NextResponse.json(
        { error: 'Solo el capitán puede eliminar la escudería' },
        { status: 403 }
      );
    }

    const squadronName = squadron.name;
    const memberIds = squadron.members;

    // Eliminar todas las solicitudes de ingreso pendientes
    await JoinRequest.deleteMany({ squadronId: squadron._id });

    // Eliminar escudería
    await Squadron.findByIdAndDelete(squadron._id);

    // Actualizar todos los miembros
    await WebUser.updateMany(
      { _id: { $in: memberIds } },
      {
        $unset: {
          'squadron.squadronId': '',
          'squadron.role': '',
          'squadron.joinedAt': '',
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: `La escudería "${squadronName}" ha sido eliminada permanentemente`,
    });

  } catch (error: any) {
    console.error('Error deleting squadron:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la escudería', details: error.message },
      { status: 500 }
    );
  }
}
