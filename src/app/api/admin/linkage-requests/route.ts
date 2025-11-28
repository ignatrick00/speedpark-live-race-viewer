import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LinkageRequest from '@/models/LinkageRequest';
import WebUser from '@/models/WebUser';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * GET /api/admin/linkage-requests
 * Get all pending linkage requests (admin only)
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

    // Verify admin
    const user = await WebUser.findById(userId);
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Acceso denegado - Solo administradores' },
        { status: 403 }
      );
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';

    // Build query
    const query: any = {};
    if (status !== 'all') {
      query.status = status;
    }

    const requests = await LinkageRequest.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Get pending count
    const pendingCount = await LinkageRequest.countDocuments({ status: 'pending' });

    return NextResponse.json({
      success: true,
      requests,
      pendingCount,
      totalCount: requests.length,
    });

  } catch (error: any) {
    console.error('Admin linkage requests fetch error:', error);
    return NextResponse.json(
      { error: 'Error al obtener solicitudes', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/linkage-requests?id=xxx
 * Approve or reject a linkage request (admin only)
 */
export async function PATCH(request: NextRequest) {
  console.log('🔧🔧🔧 PATCH /api/admin/linkage-requests - START');

  try {
    // Get ID from query params
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    console.log('📋 Processing request for ID:', id);

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('❌ No auth header');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let userId: string;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      console.log('❌ Invalid token');
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    console.log('✅ Token valid, userId:', userId);

    await connectDB();
    console.log('✅ DB connected');

    // Verify admin
    const admin = await WebUser.findById(userId);
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim();

    console.log('Admin check:', {
      adminFound: !!admin,
      adminEmail: admin?.email,
      envAdminEmail: adminEmail,
      match: admin?.email.trim() === adminEmail
    });

    if (!admin || admin.email.trim() !== adminEmail) {
      console.log('❌ Not admin');
      return NextResponse.json(
        { error: 'Acceso denegado - Solo administradores' },
        { status: 403 }
      );
    }

    console.log('✅ Admin verified');

    const body = await request.json();
    console.log('Request body:', body);
    const { action, rejectionReason, adminNotes } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Acción inválida. Debe ser "approve" o "reject"' },
        { status: 400 }
      );
    }

    // Find the linkage request
    const LinkageRequest = (await import('@/models/LinkageRequest')).default;
    const DriverRaceData = (await import('@/models/DriverRaceData')).default;
    const mongoose = await import('mongoose');

    const linkageRequest = await LinkageRequest.findById(id);
    if (!linkageRequest) {
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 });
    }

    // Check if already processed
    if (linkageRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Esta solicitud ya fue ${linkageRequest.status === 'approved' ? 'aprobada' : 'rechazada'}` },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      console.log('🔗 Approving linkage request:', {
        requestId: id,
        webUserId: linkageRequest.webUserId,
        driverRaceDataId: linkageRequest.driverRaceDataId,
      });

      const user = await WebUser.findById(linkageRequest.webUserId);
      const driver = await DriverRaceData.findById(linkageRequest.driverRaceDataId);

      console.log('📊 Found user:', user ? user.email : 'NOT FOUND');
      console.log('📊 Found driver:', driver ? driver.driverName : 'NOT FOUND');

      if (!user || !driver) {
        console.error('❌ User or driver not found!');
        return NextResponse.json(
          { error: 'Usuario o perfil de corredor no encontrado' },
          { status: 404 }
        );
      }

      // Check if user is already linked
      if (user.kartingLink.status === 'linked' && user.kartingLink.personId) {
        return NextResponse.json(
          { error: 'Este usuario ya está vinculado a otro perfil' },
          { status: 400 }
        );
      }

      // Check if driver is already linked
      if (driver.linkingStatus === 'linked' && driver.webUserId && driver.webUserId !== user._id.toString()) {
        return NextResponse.json(
          { error: 'Este perfil de corredor ya está vinculado a otro usuario' },
          { status: 400 }
        );
      }

      // Perform the linkage
      user.kartingLink = {
        personId: driver._id.toString(),
        linkedAt: new Date(),
        status: 'linked',
        speedParkProfile: {
          driverName: driver.driverName,
          totalRaces: driver.stats.totalRaces,
        },
      };

      driver.webUserId = user._id.toString();
      driver.linkingStatus = 'linked';
      driver.linkingMethod = 'manual_link';
      driver.linkingConfidence = 'high';

      await user.save();
      await driver.save();

      linkageRequest.status = 'approved';
      linkageRequest.reviewedAt = new Date();
      linkageRequest.reviewedBy = new mongoose.Types.ObjectId(userId);
      if (adminNotes) {
        linkageRequest.adminNotes = adminNotes;
      }
      await linkageRequest.save();

      return NextResponse.json({
        success: true,
        message: 'Solicitud aprobada y vinculación completada',
        linkageRequest,
      });

    } else {
      // REJECT
      linkageRequest.status = 'rejected';
      linkageRequest.reviewedAt = new Date();
      linkageRequest.reviewedBy = new mongoose.Types.ObjectId(userId);
      linkageRequest.rejectionReason = rejectionReason || 'Rechazado por el administrador';
      if (adminNotes) {
        linkageRequest.adminNotes = adminNotes;
      }
      await linkageRequest.save();

      return NextResponse.json({
        success: true,
        message: 'Solicitud rechazada',
        linkageRequest,
      });
    }

  } catch (error: any) {
    console.error('Admin linkage request update error:', error);
    return NextResponse.json(
      { error: 'Error al procesar solicitud', details: error.message },
      { status: 500 }
    );
  }
}
