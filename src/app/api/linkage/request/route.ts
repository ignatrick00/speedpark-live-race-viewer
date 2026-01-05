import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LinkageRequest from '@/models/LinkageRequest';
import RaceSessionV0 from '@/models/RaceSessionV0';
import WebUser from '@/models/WebUser';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * POST /api/linkage/request
 * Create a linkage request to connect a web user with a karting driver profile
 *
 * Body: {
 *   driverName: string,  // Changed from driverRaceDataId
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
    const { driverName, sessionId, searchedName } = body;

    // Validate input - sessionId is optional (when linking by name only)
    if (!driverName || !searchedName) {
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
    if (user.kartingLink.status === 'linked' && user.kartingLink.driverName) {
      return NextResponse.json(
        { error: 'Tu cuenta ya está vinculada a un perfil de corredor' },
        { status: 400 }
      );
    }

    // Check if this driver name is already linked to another user
    const existingLinkedUser = await WebUser.findOne({
      'kartingLink.status': 'linked',
      'kartingLink.driverName': { $regex: new RegExp(`^${driverName}$`, 'i') }
    });

    if (existingLinkedUser && existingLinkedUser._id.toString() !== webUserId) {
      return NextResponse.json(
        { error: 'Este perfil de corredor ya está vinculado a otra cuenta' },
        { status: 400 }
      );
    }

    // If sessionId is provided, validate it
    let raceSession = null;
    if (sessionId) {
      raceSession = await RaceSessionV0.findOne({ sessionId }).lean();
      if (!raceSession) {
        return NextResponse.json(
          { error: 'Sesión no encontrada' },
          { status: 404 }
        );
      }

      // Find the driver in this session
      const driverInSession = raceSession.drivers?.find(
        (d: any) => d.driverName.toLowerCase() === driverName.toLowerCase()
      );

      if (!driverInSession) {
        return NextResponse.json(
          { error: 'Corredor no encontrado en esta sesión' },
          { status: 404 }
        );
      }
    }

    // Count total races for this driver across all sessions
    const totalRaces = await RaceSessionV0.countDocuments({
      'drivers.driverName': { $regex: new RegExp(`^${driverName}$`, 'i') }
    });

    // Get last race date
    const lastRaceSession = await RaceSessionV0.findOne({
      'drivers.driverName': { $regex: new RegExp(`^${driverName}$`, 'i') }
    })
      .sort({ sessionDate: -1 })
      .select('sessionDate')
      .lean();

    const lastRaceDate = raceSession?.sessionDate || lastRaceSession?.sessionDate || new Date();

    // Create linkage request
    const linkageRequest = new LinkageRequest({
      webUserId: new mongoose.Types.ObjectId(webUserId),
      searchedName: searchedName.trim(),
      selectedDriverName: driverName,
      selectedSessionId: sessionId || null, // Optional - null when linking by name only
      driverRaceDataId: null, // No longer using legacy DriverRaceData
      status: 'pending',
      userSnapshot: {
        email: user.email,
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
      },
      driverSnapshot: {
        driverName: driverName,
        totalRaces: totalRaces,
        lastRaceDate: lastRaceDate,
        currentLinkStatus: existingLinkedUser ? 'linked' : 'unlinked',
      },
    });

    await linkageRequest.save();

    return NextResponse.json({
      success: true,
      message: 'Solicitud enviada exitosamente. Un administrador la revisará pronto.',
      requestId: linkageRequest._id,
      request: {
        id: linkageRequest._id,
        driverName: driverName,
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
