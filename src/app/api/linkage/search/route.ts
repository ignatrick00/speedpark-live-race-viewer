import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import DriverRaceData from '@/models/DriverRaceData';
import { verifyToken } from '@/lib/auth';

/**
 * POST /api/linkage/search
 * Search for drivers by name in recent races
 *
 * Body: { searchName: string }
 * Returns: Array of matching drivers with their recent sessions
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
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

    const body = await request.json();
    const { searchName } = body;

    if (!searchName || searchName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Nombre de búsqueda muy corto (mínimo 2 caracteres)' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Search for drivers matching the name (case-insensitive, partial match)
    const searchRegex = new RegExp(searchName.trim(), 'i');

    const drivers = await DriverRaceData.find({
      $or: [
        { driverName: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
      ],
    })
      .select('driverName firstName lastName sessions stats linkingStatus webUserId')
      .limit(20) // Limit results to prevent overwhelming UI
      .lean();

    // Filter to only show drivers from last 60 days and format response
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const results = drivers
      .map((driver: any) => {
        // Filter sessions to last 60 days only
        const recentSessions = driver.sessions
          .filter((session: any) => new Date(session.sessionDate) >= sixtyDaysAgo)
          .sort((a: any, b: any) =>
            new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime()
          )
          .slice(0, 5); // Only return 5 most recent

        if (recentSessions.length === 0) {
          return null; // Skip drivers with no recent races
        }

        return {
          driverRaceDataId: driver._id,
          driverName: driver.driverName,
          firstName: driver.firstName,
          lastName: driver.lastName,
          totalRaces: driver.stats.totalRaces,
          lastRaceDate: driver.stats.lastRaceDate,
          isAlreadyLinked: driver.linkingStatus === 'linked' || !!driver.webUserId,
          recentSessions: recentSessions.map((session: any) => ({
            sessionId: session.sessionId,
            sessionName: session.sessionName,
            sessionDate: session.sessionDate,
            bestTime: session.bestTime,
            bestPosition: session.bestPosition,
            kartNumber: session.kartNumber,
            totalLaps: session.totalLaps,
          })),
        };
      })
      .filter((result: any) => result !== null); // Remove nulls

    return NextResponse.json({
      success: true,
      query: searchName,
      results,
      count: results.length,
    });

  } catch (error: any) {
    console.error('Linkage search error:', error);
    return NextResponse.json(
      { error: 'Error al buscar corredores', details: error.message },
      { status: 500 }
    );
  }
}
