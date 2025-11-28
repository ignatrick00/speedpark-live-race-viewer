import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DriverRaceData from '@/models/DriverRaceData';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * POST /api/linkage/search
 * Search for recent race sessions (last 30 days)
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

    // Get all drivers with sessions in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const drivers = await DriverRaceData.find({
      'sessions.sessionDate': { $gte: thirtyDaysAgo }
    })
      .select('sessions')
      .lean();

    // Aggregate all unique sessions
    const sessionsMap = new Map<string, any>();

    drivers.forEach((driver: any) => {
      driver.sessions
        .filter((session: any) => new Date(session.sessionDate) >= thirtyDaysAgo)
        .forEach((session: any) => {
          if (!sessionsMap.has(session.sessionId)) {
            sessionsMap.set(session.sessionId, {
              sessionId: session.sessionId,
              sessionName: session.sessionName,
              sessionDate: session.sessionDate,
              participantCount: 1,
            });
          } else {
            const existing = sessionsMap.get(session.sessionId);
            existing.participantCount++;
          }
        });
    });

    // Convert to array and sort by date (most recent first)
    let sessions = Array.from(sessionsMap.values())
      .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());

    // Apply search filter if provided
    if (searchQuery && searchQuery.trim().length > 0) {
      const searchRegex = new RegExp(searchQuery.trim(), 'i');
      sessions = sessions.filter(session =>
        searchRegex.test(session.sessionName)
      );
    }

    // Limit to 50 most recent
    sessions = sessions.slice(0, 50);

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
