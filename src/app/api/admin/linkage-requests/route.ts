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
