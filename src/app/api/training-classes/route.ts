import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import TrainingClass from '@/models/TrainingClass';
import WebUser from '@/models/WebUser';

// GET - List all training classes (with optional filters)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const coachId = searchParams.get('coachId');
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const query: any = {};

    // Filter by coach
    if (coachId) {
      query.coachId = coachId;
    }

    // Filter by specific date
    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { $gte: targetDate, $lt: nextDay };
    }

    // Filter by date range
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const classes = await TrainingClass.find(query)
      .sort({ date: 1, startTime: 1 })
      .populate('coachId', 'profile email')
      .lean();

    return NextResponse.json({
      success: true,
      classes,
    });
  } catch (error) {
    console.error('Error fetching training classes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new training class (coaches only)
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
        { error: 'Only coaches can create training classes' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      title,
      description,
      specialties,
      date,
      startTime,
      endTime,
      durationMinutes,
      bookingType,
      maxGroupCapacity,
      individualPrice,
      groupPricePerPerson,
    } = body;

    // Validation
    if (!title || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create training class
    const trainingClass = await TrainingClass.create({
      coachId: user._id,
      coachName: user.profile.alias || `${user.profile.firstName} ${user.profile.lastName}`,
      title,
      description,
      specialties: specialties || [],
      date: new Date(date),
      startTime,
      endTime,
      durationMinutes: durationMinutes || 60,
      bookingType: bookingType || 'both',
      maxGroupCapacity: maxGroupCapacity || 4,
      individualPrice: individualPrice || 45000,
      groupPricePerPerson: groupPricePerPerson || 25000,
      groupBookings: [],
      status: 'available',
    });

    return NextResponse.json({
      success: true,
      message: 'Training class created successfully',
      class: trainingClass,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    console.error('Error creating training class:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete training class by block (date, startTime, endTime)
export async function DELETE(request: NextRequest) {
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
        { error: 'Only coaches can delete training classes' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { date, startTime, endTime } = body;

    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: date, startTime, endTime' },
        { status: 400 }
      );
    }

    // Find and delete the class
    const slotDate = new Date(date);
    const result = await TrainingClass.findOneAndDelete({
      coachId: user._id,
      date: slotDate,
      startTime,
      endTime,
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Class not found or you do not have permission to delete it' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Training class deleted successfully',
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    console.error('Error deleting training class:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
