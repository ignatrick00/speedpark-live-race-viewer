import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LinkageRequest from '@/models/LinkageRequest';
import DriverRaceData from '@/models/DriverRaceData';
import WebUser from '@/models/WebUser';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * POST /api/linkage/request
 * Create a linkage request to connect a web user with a karting driver profile
 *
 * Body: {
 *   driverRaceDataId: string,
 *   sessionId: string,
 *   searchedName: string
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
    let webUserId: string;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      webUserId = decoded.userId;
    } catch (error) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { driverRaceDataId, sessionId, searchedName } = body;

    // Validate input
    if (!driverRaceDataId || !sessionId || !searchedName) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user already has a pending request
    const existingPendingRequest = await LinkageRequest.findOne({
      webUserId: new mongoose.Types.ObjectId(webUserId),
      status: 'pending',
    });

    if (existingPendingRequest) {
      return NextResponse.json(
        { error: 'Ya tienes una solicitud pendiente de aprobación' },
        { status: 400 }
      );
    }

    // Get user data
    const user = await WebUser.findById(webUserId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Check if user is already linked
    if (user.kartingLink.status === 'linked' && user.kartingLink.personId) {
      return NextResponse.json(
        { error: 'Tu cuenta ya está vinculada a un perfil de corredor' },
        { status: 400 }
      );
    }

    // Get driver data
    const driver = await DriverRaceData.findById(driverRaceDataId);
    if (!driver) {
      return NextResponse.json(
        { error: 'Perfil de corredor no encontrado' },
        { status: 404 }
      );
    }

    // Verify the session exists for this driver
    const session = driver.sessions.find((s: any) => s.sessionId === sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Sesión no encontrada para este corredor' },
        { status: 404 }
      );
    }

    // Check if driver is already linked to another user
    if (driver.linkingStatus === 'linked' && driver.webUserId && driver.webUserId !== webUserId) {
      return NextResponse.json(
        { error: 'Este perfil de corredor ya está vinculado a otra cuenta' },
        { status: 400 }
      );
    }

    // Create linkage request
    const linkageRequest = new LinkageRequest({
      webUserId: new mongoose.Types.ObjectId(webUserId),
      searchedName: searchedName.trim(),
      selectedDriverName: driver.driverName,
      selectedSessionId: sessionId,
      driverRaceDataId: new mongoose.Types.ObjectId(driverRaceDataId),
      status: 'pending',
      userSnapshot: {
        email: user.email,
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
      },
      driverSnapshot: {
        driverName: driver.driverName,
        totalRaces: driver.stats.totalRaces,
        lastRaceDate: driver.stats.lastRaceDate,
        currentLinkStatus: driver.linkingStatus,
      },
    });

    await linkageRequest.save();

    return NextResponse.json({
      success: true,
      message: 'Solicitud enviada exitosamente. Un administrador la revisará pronto.',
      requestId: linkageRequest._id,
      request: {
        id: linkageRequest._id,
        driverName: driver.driverName,
        status: linkageRequest.status,
        createdAt: linkageRequest.createdAt,
      },
    });

  } catch (error: any) {
    console.error('Linkage request creation error:', error);

    // Handle duplicate pending request error
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Ya tienes una solicitud pendiente de aprobación' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Error al crear solicitud de vinculación', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/linkage/request
 * Get user's linkage requests
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

    const requests = await LinkageRequest.find({
      webUserId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json({
      success: true,
      requests,
    });

  } catch (error: any) {
    console.error('Linkage requests fetch error:', error);
    return NextResponse.json(
      { error: 'Error al obtener solicitudes', details: error.message },
      { status: 500 }
    );
  }
}
