import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * POST /api/users/request-organizer
 * User requests to become an organizer (requires admin approval)
 *
 * Body: {
 *   organizationName?: string,
 *   reason: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
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

    const body = await request.json();
    const { organizationName, reason } = body;

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'Por favor proporciona una razón válida (mínimo 10 caracteres)' },
        { status: 400 }
      );
    }

    // Get user
    const user = await WebUser.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Check if already an organizer or admin
    if (user.role === 'organizer' || user.role === 'admin') {
      return NextResponse.json(
        { error: 'Ya tienes rol de organizador o administrador' },
        { status: 400 }
      );
    }

    // Initialize organizerProfile with request data
    user.organizerProfile = {
      approvedBy: undefined,
      approvedAt: undefined,
      permissions: {
        canCreateChampionships: false,
        canApproveSquadrons: false,
        canLinkRaces: false,
        canModifyStandings: false,
      },
      organizationName: organizationName?.trim() || null,
      notes: `SOLICITUD PENDIENTE: ${reason}`,
    };

    await user.save();

    // TODO: Create notification for admin or send email

    return NextResponse.json({
      success: true,
      message: 'Solicitud enviada. Un administrador la revisará pronto.',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        organizerProfile: user.organizerProfile,
      },
    });

  } catch (error: any) {
    console.error('Request organizer error:', error);
    return NextResponse.json(
      { error: 'Error al procesar solicitud', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/users/request-organizer
 * Check current user's organizer request status
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
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

    const user = await WebUser.findById(userId)
      .select('role organizerProfile')
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      role: user.role,
      organizerProfile: user.organizerProfile || null,
      hasPendingRequest: user.organizerProfile && !user.organizerProfile.approvedAt,
    });

  } catch (error: any) {
    console.error('Get organizer status error:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado', details: error.message },
      { status: 500 }
    );
  }
}
