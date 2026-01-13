import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import FriendlyRace from '@/models/FriendlyRace';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Optional authentication - check if user is logged in
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        userId = decoded.userId;
      } catch (error) {
        // Invalid token - continue as unauthenticated user
        console.log('⚠️ [NEXT-EXPRESS] Invalid token, continuing as guest');
      }
    }

    // Get current date in Chile timezone
    const nowChileStr = new Date().toLocaleString('en-US', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const nowChile = new Date(nowChileStr);
    const todayStart = new Date(nowChile);
    todayStart.setHours(0, 0, 0, 0);

    console.log('🔍 [NEXT-EXPRESS] Searching for next race from:', todayStart.toISOString());

    // Find next upcoming race
    const nextRace = await FriendlyRace.findOne({
      date: { $gte: todayStart },
      status: { $in: ['open', 'confirmed', 'full'] }, // Include active races
    })
      .sort({ date: 1, time: 1 }) // Earliest first
      .lean();

    if (!nextRace) {
      console.log('ℹ️ [NEXT-EXPRESS] No upcoming races found');
      return NextResponse.json({
        success: true,
        race: null,
      });
    }

    // Check if user is registered
    let isUserRegistered = false;
    if (userId) {
      isUserRegistered = nextRace.participants.some(
        (p: any) => p.userId.toString() === userId
      );
    }

    const participantCount = nextRace.participants.length;
    const isFull = participantCount >= nextRace.maxParticipants;

    console.log(`✅ [NEXT-EXPRESS] Found race: ${nextRace.name} on ${nextRace.date} at ${nextRace.time}`);
    console.log(`   Participants: ${participantCount}/${nextRace.maxParticipants}, User registered: ${isUserRegistered}`);

    return NextResponse.json({
      success: true,
      race: {
        _id: nextRace._id.toString(),
        name: nextRace.name,
        date: nextRace.date,
        time: nextRace.time,
        participantCount,
        maxParticipants: nextRace.maxParticipants,
        isFull,
        isUserRegistered,
        status: nextRace.status,
      },
    });

  } catch (error) {
    console.error('❌ [NEXT-EXPRESS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener próxima carrera',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
