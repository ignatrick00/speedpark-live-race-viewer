import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';
import SquadronPointsHistory from '@/models/SquadronPointsHistory';
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

    // Obtener usuario con invitaciones pendientes
    const user = await WebUser.findById(userId)
      .populate({
        path: 'invitations.squadronId',
        select: 'name description colors division fairRacingAverage totalPoints isActive members',
      })
      .populate({
        path: 'invitations.invitedBy',
        select: 'profile.firstName profile.lastName',
      })
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Filtrar solo invitaciones pendientes de escuaderías activas
    const filteredInvitations = (user.invitations || []).filter((inv: any) =>
      inv.status === 'pending' &&
      inv.squadronId &&
      inv.squadronId.isActive &&
      inv.squadronId.members.length < 4
    );

    // Calcular puntos desde SquadronPointsHistory para cada invitación (igual que /api/invitations)
    const pendingInvitations = await Promise.all(
      filteredInvitations.map(async (invitation: any) => {
        // Calcular puntos totales desde el historial
        const pointsHistory = await SquadronPointsHistory.aggregate([
          { $match: { squadronId: invitation.squadronId._id } },
          { $group: { _id: null, totalPoints: { $sum: '$pointsChange' } } }
        ]);

        const totalPoints = pointsHistory.length > 0 ? pointsHistory[0].totalPoints : 0;

        return {
          ...invitation.toObject ? invitation.toObject() : invitation,
          squadronId: {
            ...invitation.squadronId,
            totalPoints: totalPoints
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      invitations: pendingInvitations,
    });

  } catch (error: any) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Error al obtener invitaciones', details: error.message },
      { status: 500 }
    );
  }
}
