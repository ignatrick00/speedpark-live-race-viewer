import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';

/**
 * GET /api/squadrons/rankings
 * Get squadron rankings by division
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const division = searchParams.get('division') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');

    let query: any = { isActive: true };

    if (division !== 'all') {
      query.division = division;
    }

    // Get squadrons sorted by totalPoints (descending) and ranking (ascending)
    const squadrons = await Squadron.find(query)
      .populate('captainId', 'profile email')
      .populate('members', 'profile email')
      .sort({ totalPoints: -1, ranking: 1 })
      .limit(limit)
      .lean();

    // Calculate rankings
    const rankedSquadrons = squadrons.map((squadron, index) => ({
      ...squadron,
      currentRank: index + 1
    }));

    // Get division stats
    const divisionStats = await Squadron.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$division',
          count: { $sum: 1 },
          avgPoints: { $avg: '$totalPoints' },
          avgFairRacing: { $avg: '$fairRacingAverage' }
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      rankings: rankedSquadrons,
      divisionStats,
      filters: {
        division,
        limit,
        total: rankedSquadrons.length
      }
    });

  } catch (error) {
    console.error('Error getting squadron rankings:', error);
    return NextResponse.json(
      { error: 'Error al obtener rankings' },
      { status: 500 }
    );
  }
}
