import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';
import WebUser from '@/models/WebUser';
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

    const body = await req.json();
    const { logoUrl } = body;

    if (!logoUrl) {
      return NextResponse.json(
        { error: 'logoUrl es requerido' },
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

    // Verificar que pertenece a una escudería
    if (!user.squadron.squadronId) {
      return NextResponse.json(
        { error: 'No perteneces a ninguna escudería' },
        { status: 400 }
      );
    }

    // Obtener la escudería
    const squadron = await Squadron.findById(user.squadron.squadronId);
    if (!squadron) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que es capitán
    if (squadron.captainId.toString() !== userId) {
      return NextResponse.json(
        { error: 'Solo el capitán puede actualizar el logo' },
        { status: 403 }
      );
    }

    // Actualizar logo
    squadron.logo = logoUrl;
    await squadron.save();

    return NextResponse.json({
      success: true,
      message: 'Logo actualizado exitosamente',
      logo: logoUrl,
    });

  } catch (error: any) {
    console.error('Error updating squadron logo:', error);
    return NextResponse.json(
      { error: 'Error al actualizar logo', details: error.message },
      { status: 500 }
    );
  }
}
