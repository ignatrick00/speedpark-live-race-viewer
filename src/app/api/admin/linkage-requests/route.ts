import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import LinkageRequest from '@/models/LinkageRequest';
import WebUser from '@/models/WebUser';
import DriverRaceData from '@/models/DriverRaceData';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

/**
 * GET /api/admin/linkage-requests
 * Get all pending linkage requests (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Verify admin
    const user = await WebUser.findById(decoded.userId);
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Acceso denegado - Solo administradores' },
        { status: 403 }
      );
    }

    await dbConnect();

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
