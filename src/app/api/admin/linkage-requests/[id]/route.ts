import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LinkageRequest from '@/models/LinkageRequest';
import WebUser from '@/models/WebUser';
import DriverRaceData from '@/models/DriverRaceData';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * PATCH /api/admin/linkage-requests/:id
 * Approve or reject a linkage request (admin only)
 *
 * Body: {
 *   action: 'approve' | 'reject',
 *   rejectionReason?: string,
 *   adminNotes?: string
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const admin = await WebUser.findById(userId);
    if (!admin || admin.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Acceso denegado - Solo administradores' },
        { status: 403 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { action, rejectionReason, adminNotes } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Acción inválida. Debe ser "approve" o "reject"' },
        { status: 400 }
      );
    }

    // Find the linkage request
    const linkageRequest = await LinkageRequest.findById(id);
    if (!linkageRequest) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    // Check if already processed
    if (linkageRequest.status !== 'pending') {
      return NextResponse.json(
        { error: `Esta solicitud ya fue ${linkageRequest.status === 'approved' ? 'aprobada' : 'rechazada'}` },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // APPROVE: Link the user to the driver profile

      console.log('🔗 Approving linkage request:', {
        requestId: id,
        webUserId: linkageRequest.webUserId,
        driverRaceDataId: linkageRequest.driverRaceDataId,
      });

      // Get the user and driver
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

      // Check if user is already linked to another driver
      if (user.kartingLink.status === 'linked' && user.kartingLink.personId) {
        return NextResponse.json(
          { error: 'Este usuario ya está vinculado a otro perfil' },
          { status: 400 }
        );
      }

      // Check if driver is already linked to another user
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

      // Save both
      await user.save();
      await driver.save();

      // Approve the request
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
      // REJECT: Just update the request status
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

/**
 * DELETE /api/admin/linkage-requests/:id
 * Delete a linkage request (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let userId: string;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    await connectDB();

    const admin = await WebUser.findById(userId);
    if (!admin || admin.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Acceso denegado - Solo administradores' },
        { status: 403 }
      );
    }

    const { id } = params;
    const linkageRequest = await LinkageRequest.findByIdAndDelete(id);

    if (!linkageRequest) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Solicitud eliminada',
    });

  } catch (error: any) {
    console.error('Admin linkage request delete error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar solicitud', details: error.message },
      { status: 500 }
    );
  }
}
