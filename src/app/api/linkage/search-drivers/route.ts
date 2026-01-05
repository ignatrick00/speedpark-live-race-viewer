import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RaceSessionV0 from '@/models/RaceSessionV0';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * POST /api/linkage/search-drivers
 * Search for driver names that match the search query
 *
 * Body: { driverName: string }
 * Returns: Array of unique driver names with stats
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
    const { driverName } = body;

    if (!driverName || driverName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nombre del corredor es requerido' },
        { status: 400 }
      );
    }

    await connectDB();

    const searchTerm = driverName.trim();

    console.log(`👤 [SEARCH-DRIVERS] Searching for drivers matching: "${searchTerm}"`);

    // Aggregate to find unique driver names and count their races
    const drivers = await RaceSessionV0.aggregate([
      // Filter valid race sessions
      {
        $match: {
          sessionType: 'carrera',
          sessionName: {
            $not: {
              $regex: /f1|f2|f3|k 1|k 2|k 3|k1|k2|k3|gt|mujeres|women|junior| m(?!\w)/i
            }
          }
        }
      },
      // Unwind drivers array
      { $unwind: '$drivers' },
      // Filter by driver name
      {
        $match: {
          'drivers.driverName': {
            $regex: searchTerm,
            $options: 'i'
          }
        }
      },
      // Group by driver name to get unique drivers
      {
        $group: {
          _id: '$drivers.driverName',
          totalRaces: { $sum: 1 },
          lastRaceDate: { $max: '$sessionDate' },
          bestTime: { $min: '$drivers.bestTime' }
        }
      },
      // Sort by total races (most active first)
      { $sort: { totalRaces: -1 } },
      // Limit results
      { $limit: 20 }
    ]);

    console.log(`✅ [SEARCH-DRIVERS] Found ${drivers.length} unique drivers`);

    // Format response
    const formattedDrivers = drivers.map((driver: any) => ({
      driverName: driver._id,
      totalRaces: driver.totalRaces,
      lastRaceDate: driver.lastRaceDate,
      bestTime: driver.bestTime || 0
    }));

    return NextResponse.json({
      success: true,
      drivers: formattedDrivers,
      count: formattedDrivers.length,
    });

  } catch (error: any) {
    console.error('Driver search error:', error);
    return NextResponse.json(
      { error: 'Error al buscar corredores', details: error.message },
      { status: 500 }
    );
  }
}
