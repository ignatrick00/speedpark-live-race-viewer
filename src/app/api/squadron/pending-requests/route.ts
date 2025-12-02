import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';
import WebUser from '@/models/WebUser';
import JoinRequest from '@/models/JoinRequest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// GET: Obtener solicitudes pendientes de la escudería (solo capitán)
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

    // Verificar que el usuario es capitán de una escudería
    const user = await WebUser.findById(userId);
    if (!user || !user.squadron.squadronId) {
      return NextResponse.json(
        { error: 'No perteneces a ninguna escudería' },
        { status: 400 }
      );
    }

    const squadron = await Squadron.findById(user.squadron.squadronId);
    if (!squadron) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }

    if (squadron.captainId.toString() !== userId) {
      return NextResponse.json(
        { error: 'Solo el capitán puede ver las solicitudes' },
        { status: 403 }
      );
    }

    // Obtener solicitudes pendientes
    const requests = await JoinRequest.find({
      squadronId: squadron._id,
      status: 'pending',
    })
      .populate('pilotId', 'email profile')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      requests,
    });

  } catch (error: any) {
    console.error('Error fetching pending requests:', error);
    return NextResponse.json(
      { error: 'Error al obtener solicitudes', details: error.message },
      { status: 500 }
    );
  }
}
