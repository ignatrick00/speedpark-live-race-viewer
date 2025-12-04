import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import CoachAvailability from '@/models/CoachAvailability';
import WebUser from '@/models/WebUser';

// GET - List availability for a coach
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const coachId = searchParams.get('coachId');

    if (!coachId) {
      return NextResponse.json(
        { error: 'coachId parameter is required' },
        { status: 400 }
      );
    }

    const availabilities = await CoachAvailability.find({
      coachId,
      isActive: true,
    }).sort({ dayOfWeek: 1, startTime: 1 });

    return NextResponse.json({
      success: true,
      availabilities,
    });
  } catch (error) {
    console.error('Error fetching coach availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new availability (coaches only)
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No valid authorization token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
    };

    // Find user and verify they are a coach
    const user = await WebUser.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.role !== 'coach') {
      return NextResponse.json(
        { error: 'Only coaches can create availability' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      dayOfWeek,
      startTime,
      endTime,
      individualPrice,
      groupPricePerPerson,
      maxGroupCapacity,
    } = body;

    // Validation
    if (dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: dayOfWeek, startTime, endTime' },
        { status: 400 }
      );
    }

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { error: 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday)' },
        { status: 400 }
      );
    }

    // Check for overlapping availability
    const overlapping = await CoachAvailability.findOne({
      coachId: user._id,
      dayOfWeek,
      isActive: true,
      $or: [
        // New slot starts during existing slot
        { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
        // New slot ends during existing slot
        { startTime: { $lt: endTime }, endTime: { $gte: endTime } },
        // New slot completely encompasses existing slot
        { startTime: { $gte: startTime }, endTime: { $lte: endTime } },
      ],
    });

    if (overlapping) {
      return NextResponse.json(
        { error: 'This time slot overlaps with existing availability' },
        { status: 400 }
      );
    }

    // Create availability
    const availability = await CoachAvailability.create({
      coachId: user._id,
      coachName: user.profile.alias || `${user.profile.firstName} ${user.profile.lastName}`,
      dayOfWeek,
      startTime,
      endTime,
      individualPrice: individualPrice || 45000,
      groupPricePerPerson: groupPricePerPerson || 25000,
      maxGroupCapacity: maxGroupCapacity || 4,
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Availability created successfully',
      availability,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    console.error('Error creating coach availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
