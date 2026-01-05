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
    const { driverName, selectedDate } = body;

    await connectDB();

    // Build base query - always exclude invalid race types
    const baseQuery: any = {
      sessionType: 'carrera', // Solo carreras válidas
      // Excluir carreras de otras categorías (K1, K2, GT, etc.)
      sessionName: {
        $not: {
          $regex: /f1|f2|f3|k 1|k 2|k 3|k1|k2|k3|gt|mujeres|women|junior| m(?!\w)/i
        }
      }
    };

    // TWO SEPARATE SEARCH MODES (mutually exclusive):

    // MODE 1: Search by DRIVER NAME (search all history, ignore date)
    if (driverName && driverName.trim().length > 0) {
      const searchTerm = driverName.trim();
      baseQuery['drivers.driverName'] = {
        $regex: searchTerm,
        $options: 'i'
      };
      console.log(`👤 [LINKAGE-SEARCH] MODE: Search by driver name "${searchTerm}" (all history)`);
    }
    // MODE 2: Search by DATE (show all races on that date)
    else if (selectedDate && selectedDate.trim().length > 0) {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59);

      baseQuery.sessionDate = {
        $gte: startOfDay,
        $lte: endOfDay
      };
      console.log(`📅 [LINKAGE-SEARCH] MODE: Search by date ${selectedDate} (all races on this day)`);
    }
    // DEFAULT: Show recent races (last 30 days)
    else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      baseQuery.sessionDate = { $gte: thirtyDaysAgo };
      console.log(`📅 [LINKAGE-SEARCH] MODE: Default (last 30 days)`);
    }

    console.log('🔍 [LINKAGE-SEARCH] Final Query:', JSON.stringify(baseQuery, null, 2));

    // Fetch sessions from race_sessions_v0
    let sessions = await RaceSessionV0.find(baseQuery)
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
