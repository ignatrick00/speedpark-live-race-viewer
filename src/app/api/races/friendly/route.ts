import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import WebUser from '@/models/WebUser';
import FriendlyRace from '@/models/FriendlyRace';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Optional authentication - allow public access to view races
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        userId = decoded.userId;
      } catch (error) {
        // Invalid token - continue as unauthenticated user
        console.log('⚠️ [FRIENDLY-RACES] Invalid token, continuing as guest');
      }
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const filterType = searchParams.get('filter'); // 'all', 'upcoming', 'past', 'my-races'

    console.log(`🔍 [FRIENDLY-RACES] Filter type: ${filterType}`);
    console.log(`🔍 [FRIENDLY-RACES] User ID: ${userId || 'guest'}`);

    // DEBUG: Check what races exist
    const allRaces = await FriendlyRace.find({}).limit(5).lean();
    console.log(`🔍 [FRIENDLY-RACES] Total races in DB:`, await FriendlyRace.countDocuments({}));
    if (allRaces.length > 0) {
      console.log(`🔍 [FRIENDLY-RACES] Sample race createdBy:`, allRaces[0].createdBy);
      console.log(`🔍 [FRIENDLY-RACES] Sample race createdBy type:`, typeof allRaces[0].createdBy);
      console.log(`🔍 [FRIENDLY-RACES] Sample race createdBy toString:`, allRaces[0].createdBy?.toString());
    }

    // Build query based on filter
    let query: any = {};

    if (filterType === 'upcoming') {
      // Only future races (today and onwards, ignoring time)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      query.date = { $gte: today };
      query.$or = [
        { status: { $in: ['open', 'full', 'confirmed'] } },
        { status: { $exists: false } },
      ];
    } else if (filterType === 'past') {
      // Only past races (before today)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      query.date = { $lt: today };
    } else if (filterType === 'my-races') {
      // For organizer page: show ALL races (not filtered by user)
      // The organizer can link any friendly race to a race session
      // No filter needed - show all races
    } else if (filterType === 'all' || !filterType) {
      // All races (no date filter)
    }

    console.log(`🔍 [FRIENDLY-RACES] Query:`, JSON.stringify(query, null, 2));

    const races = await FriendlyRace.find(query)
      .sort({ date: -1, time: -1 }) // Most recent first
      .lean();

    console.log(`📊 [FRIENDLY-RACES] Found ${races.length} races in database`);
    if (races.length > 0) {
      console.log(`📋 [FRIENDLY-RACES] First race:`, {
        name: races[0].name,
        createdBy: races[0].createdBy,
        raceStatus: races[0].raceStatus
      });
    }

    // Manually populate users to avoid schema issues
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

      const participantsList = await Promise.all(race.participants.map(async (p: any) => {
        let userName = 'Piloto';
        let driverName = p.driverName || null; // Use stored driverName from participant

        try {
          const user = await WebUser.findById(p.userId);
          if (user) {
            // If driverName wasn't stored (old participants), get it from user's kartingLink
            if (!driverName && user.kartingLink?.driverName) {
              driverName = user.kartingLink.driverName;
            }

            // Fallback to user profile name if no driver name available
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
          driverName: driverName, // Include SMS-Timing driver name
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
        raceStatus: race.raceStatus || 'pending', // Default to pending if not set
        linkedRaceSessionId: race.linkedRaceSessionId,
        organizerName,
        organizerId,
        participantsList,
      };
    }));

    console.log(`✅ [FRIENDLY-RACES] Returning ${formattedRaces.length} races`);

    return NextResponse.json({
      success: true,
      races: formattedRaces,
      total: formattedRaces.length,
    });

  } catch (error) {
    console.error('❌ [FRIENDLY-RACES] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener carreras',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
