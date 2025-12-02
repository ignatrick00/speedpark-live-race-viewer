import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface RejectInvitationBody {
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

    const body: RejectInvitationBody = await req.json();
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

    // Marcar invitación como rechazada
    invitation.status = 'rejected';
    invitation.respondedAt = new Date();

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Invitación rechazada',
    });

  } catch (error: any) {
    console.error('Error rejecting invitation:', error);
    return NextResponse.json(
      { error: 'Error al rechazar invitación', details: error.message },
      { status: 500 }
    );
  }
}
