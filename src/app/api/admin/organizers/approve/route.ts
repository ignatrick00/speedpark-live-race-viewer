import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * POST /api/admin/organizers/approve
 * Admin approves a user to become an organizer
 *
 * Body: {
 *   userId: string,
 *   permissions: {
 *     canCreateChampionships: boolean,
 *     canApproveSquadrons: boolean,
 *     canLinkRaces: boolean,
 *     canModifyStandings: boolean
 *   },
 *   organizationName?: string,
 *   notes?: string
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
    let adminId: string;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      adminId = decoded.userId;
    } catch (error) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    await connectDB();

    // Verify admin
    const admin = await WebUser.findById(adminId);
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim();

    if (!admin || admin.email.trim() !== adminEmail) {
      return NextResponse.json(
        { error: 'Acceso denegado - Solo administradores' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, permissions, organizationName, notes } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    // Get target user
    const user = await WebUser.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Check if already an admin
    if (user.role === 'admin') {
      return NextResponse.json(
        { error: 'Este usuario ya es administrador' },
        { status: 400 }
      );
    }

    // Update user to organizer
    user.role = 'organizer';
    user.organizerProfile = {
      approvedBy: admin._id,
      approvedAt: new Date(),
      permissions: {
        canCreateChampionships: permissions?.canCreateChampionships || false,
        canApproveSquadrons: permissions?.canApproveSquadrons || false,
        canLinkRaces: permissions?.canLinkRaces || false,
        canModifyStandings: permissions?.canModifyStandings || false,
      },
      organizationName: organizationName?.trim() || user.organizerProfile?.organizationName || null,
      notes: notes || user.organizerProfile?.notes || null,
    };

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Usuario aprobado como organizador',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        organizerProfile: user.organizerProfile,
      },
    });

  } catch (error: any) {
    console.error('Approve organizer error:', error);
    return NextResponse.json(
      { error: 'Error al aprobar organizador', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/organizers/approve
 * Get all pending organizer requests
 */
export async function GET(request: NextRequest) {
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
    let adminId: string;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      adminId = decoded.userId;
    } catch (error) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    await connectDB();

    // Verify admin
    const admin = await WebUser.findById(adminId);
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim();

    if (!admin || admin.email.trim() !== adminEmail) {
      return NextResponse.json(
        { error: 'Acceso denegado - Solo administradores' },
        { status: 403 }
      );
    }

    // Find all users with pending organizer requests
    const pendingRequests = await WebUser.find({
      role: 'user',
      'organizerProfile.notes': { $regex: /^SOLICITUD PENDIENTE:/ }
    })
      .select('email profile organizerProfile createdAt')
      .lean();

    // Also get current organizers for reference
    const currentOrganizers = await WebUser.find({
      role: 'organizer'
    })
      .select('email profile organizerProfile')
      .populate('organizerProfile.approvedBy', 'email profile')
      .lean();

    return NextResponse.json({
      success: true,
      pendingRequests,
      currentOrganizers,
    });

  } catch (error: any) {
    console.error('Get organizer requests error:', error);
    return NextResponse.json(
      { error: 'Error al obtener solicitudes', details: error.message },
      { status: 500 }
    );
  }
}
