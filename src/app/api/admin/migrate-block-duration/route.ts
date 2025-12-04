import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CoachAvailability from '@/models/CoachAvailability';

// POST - Migrate existing availabilities to add blockDurationMinutes
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Find all availabilities without blockDurationMinutes
    const availabilities = await CoachAvailability.find({});

    let updated = 0;
    const updates = [];

    for (const availability of availabilities) {
      if (!availability.blockDurationMinutes) {
        availability.blockDurationMinutes = 45; // Set default
        await availability.save();
        updated++;
        updates.push({
          coachName: availability.coachName,
          dayOfWeek: availability.dayOfWeek,
          time: `${availability.startTime}-${availability.endTime}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} availabilities`,
      updated,
      details: updates,
    });
  } catch (error) {
    console.error('Error migrating availabilities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
