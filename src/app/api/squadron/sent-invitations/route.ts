import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';
import WebUser from '@/models/WebUser';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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
    const captain = await WebUser.findById(userId);
    if (!captain || !captain.squadron?.squadronId) {
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
        { error: 'Solo el capitán puede ver las invitaciones' },
        { status: 403 }
      );
    }

    // Buscar todos los usuarios con invitaciones pendientes de esta escudería
    const usersWithInvitations = await WebUser.find({
      'invitations.squadronId': squadron._id,
      'invitations.status': 'pending',
    })
      .select('email profile invitations')
      .lean();

    // Filtrar solo las invitaciones de esta escudería y que estén pendientes
    const sentInvitations = usersWithInvitations.map((user: any) => {
      const invitation = user.invitations.find(
        (inv: any) =>
          inv.squadronId.toString() === squadron._id.toString() &&
          inv.status === 'pending'
      );

      return {
        _id: invitation._id,
        pilotId: user._id,
        pilotEmail: user.email,
        pilotName: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || user.email,
        pilotAlias: user.profile?.alias,
        createdAt: invitation.createdAt,
        status: invitation.status,
      };
    });

    return NextResponse.json({
      success: true,
      invitations: sentInvitations,
    });

  } catch (error: any) {
    console.error('Error fetching sent invitations:', error);
    return NextResponse.json(
      { error: 'Error al obtener invitaciones', details: error.message },
      { status: 500 }
    );
  }
}
