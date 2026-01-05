import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RaceSessionV0 from '@/models/RaceSessionV0';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * POST /api/linkage/search
 * Search for recent race sessions (last 30 days) from race_sessions_v0
 *
 * Body: { searchQuery?: string } - Optional search by session name
 * Returns: Array of recent sessions with participant count
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    try {
      jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { searchQuery } = body;

    await connectDB();

    // Get race sessions from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Build query
    const query: any = {
      sessionDate: { $gte: thirtyDaysAgo },
      sessionType: 'carrera', // Solo carreras válidas
      // Excluir carreras de otras categorías (K1, K2, GT, etc.)
      sessionName: {
        $not: {
          $regex: /f1|f2|f3|k 1|k 2|k 3|k1|k2|k3|gt|mujeres|women|junior| m(?!\w)/i
        }
      }
    };

    // Apply search filter if provided
    if (searchQuery && searchQuery.trim().length > 0) {
      query.sessionName = {
        ...query.sessionName,
        $regex: searchQuery.trim(),
        $options: 'i'
      };
    }

    console.log('🔍 [LINKAGE-SEARCH] Query:', JSON.stringify(query, null, 2));

    // Fetch sessions from race_sessions_v0
    let sessions = await RaceSessionV0.find(query)
      .select('sessionId sessionName sessionDate totalDrivers')
      .sort({ sessionDate: -1 })
      .limit(50)
      .lean();

    console.log(`✅ [LINKAGE-SEARCH] Found ${sessions.length} sessions`);

    // Format response
    sessions = sessions.map((session: any) => ({
      sessionId: session.sessionId,
      sessionName: session.sessionName,
      sessionDate: session.sessionDate,
      participantCount: session.totalDrivers || 0,
    }));

    return NextResponse.json({
      success: true,
      sessions,
      count: sessions.length,
    });

  } catch (error: any) {
    console.error('Linkage search error:', error);
    return NextResponse.json(
      { error: 'Error al buscar corredores', details: error.message },
      { status: 500 }
    );
  }
}
