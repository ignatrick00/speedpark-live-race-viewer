import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CoachAvailability from '@/models/CoachAvailability';

// GET - Check current state of blockDurationMinutes
export async function GET(request: NextRequest) {
  try {
    const connection = await connectDB();

    // Use native MongoDB driver to get raw data
    const db = connection.connection.db;
    const collection = db.collection('coachavailabilities');
    const availabilities = await collection.find({}).toArray();

    const details = availabilities.map(a => ({
      _id: a._id.toString(),
      coachName: a.coachName,
      dayOfWeek: a.dayOfWeek,
      time: `${a.startTime}-${a.endTime}`,
      blockDurationMinutes: a.blockDurationMinutes,
      hasField: a.blockDurationMinutes !== undefined && a.blockDurationMinutes !== null,
    }));

    return NextResponse.json({
      success: true,
      total: availabilities.length,
      withoutField: details.filter(d => !d.hasField).length,
      details,
    });
  } catch (error) {
    console.error('Error checking availabilities:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Migrate existing availabilities to add blockDurationMinutes
export async function POST(request: NextRequest) {
  try {
    const connection = await connectDB();

    // Use native MongoDB driver to bypass Mongoose
    const db = connection.connection.db;
    const collection = db.collection('coachavailabilities');

    const result = await collection.updateMany(
      {
        $or: [
          { blockDurationMinutes: { $exists: false } },
          { blockDurationMinutes: null }
        ]
      },
      {
        $set: { blockDurationMinutes: 45 }
      }
    );

    console.log('✅ Migration result:', result);

    // Fetch updated documents using native driver
    const updatedDocs = await collection.find({}).toArray();

    const details = updatedDocs.map(a => ({
      _id: a._id.toString(),
      coachName: a.coachName,
      dayOfWeek: a.dayOfWeek,
      time: `${a.startTime}-${a.endTime}`,
      blockDurationMinutes: a.blockDurationMinutes,
      hasField: a.blockDurationMinutes !== undefined && a.blockDurationMinutes !== null,
    }));

    return NextResponse.json({
      success: true,
      message: `Updated ${result.modifiedCount} availabilities`,
      updated: result.modifiedCount,
      matched: result.matchedCount,
      details,
    });
  } catch (error) {
    console.error('Error migrating availabilities:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
