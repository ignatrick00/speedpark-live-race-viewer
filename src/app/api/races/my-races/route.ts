import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import FriendlyRace from '@/models/FriendlyRace';
import WebUser from '@/models/WebUser';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Require authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
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
        { success: false, error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Get current date in Chile timezone for filtering
    const nowChileStr = new Date().toLocaleString('en-US', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour12: false
    });
    const nowChile = new Date(nowChileStr);
    const todayStart = new Date(nowChile);
    todayStart.setHours(0, 0, 0, 0);

    console.log(`🔍 [MY-RACES] Fetching races for user ${userId} from ${todayStart.toISOString()}`);

    // Query races where user is participant
    // Filter by date >= today and not linked/finalized
    const races = await FriendlyRace.find({
      'participants.userId': userId,
      date: { $gte: todayStart },
      $or: [
        { linkedRaceSessionId: { $exists: false } },
        { raceStatus: { $in: ['pending', null] } }
      ]
    })
      .sort({ date: 1, time: 1 }) // Upcoming first
      .lean();

    console.log(`✅ [MY-RACES] Found ${races.length} races for user`);

    // Format races with populated data
    const formattedRaces = await Promise.all(races.map(async (race: any) => {
      let organizerName = 'Organizador';
      const organizerId = race.createdBy?.toString();

      try {
        const creator = await WebUser.findById(race.createdBy);
        if (creator) {
          organizerName = creator.profile?.alias ||
                         `${creator.profile?.firstName || ''} ${creator.profile?.lastName || ''}`.trim() ||
                         creator.email;
        }
      } catch (err) {
        console.error('Error loading creator:', err);
      }

      // Only populate participants (already filtered by query)
      const participantsList = await Promise.all(race.participants.map(async (p: any) => {
        let userName = 'Piloto';
        let driverName = p.driverName || null;

        try {
          const user = await WebUser.findById(p.userId);
          if (user) {
            if (!driverName && user.kartingLink?.driverName) {
              driverName = user.kartingLink.driverName;
            }

            userName = user.profile?.alias ||
                      `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() ||
                      user.email;
          }
        } catch (err) {
          console.error('Error loading participant:', err);
        }

        return {
          userId: p.userId?.toString(),
          kartNumber: p.kartNumber,
          name: userName,
          driverName: driverName,
          joinedAt: p.joinedAt,
        };
      }));

      return {
        _id: race._id.toString(),
        name: race.name,
        date: race.date,
        time: race.time,
        type: 'friendly',
        participants: race.participants.length,
        maxParticipants: race.maxParticipants,
        status: race.status,
        raceStatus: race.raceStatus || 'pending',
        linkedRaceSessionId: race.linkedRaceSessionId,
        organizerName,
        organizerId,
        participantsList,
      };
    }));

    return NextResponse.json({
      success: true,
      races: formattedRaces,
      total: formattedRaces.length,
    });

  } catch (error) {
    console.error('❌ [MY-RACES] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener tus carreras',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
