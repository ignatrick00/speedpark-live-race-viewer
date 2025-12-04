import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import CoachAvailability from '@/models/CoachAvailability';
import WebUser from '@/models/WebUser';

// PUT - Update availability
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Find user
    const user = await WebUser.findById(decoded.userId);
    if (!user || user.role !== 'coach') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Find availability
    const availability = await CoachAvailability.findById(params.id);
    if (!availability) {
      return NextResponse.json(
        { error: 'Availability not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (availability.coachId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'You can only update your own availability' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      dayOfWeek,
      startTime,
      endTime,
      blockDurationMinutes,
      individualPrice,
      groupPricePerPerson,
      maxGroupCapacity,
      isActive,
    } = body;

    // Update fields
    if (dayOfWeek !== undefined) availability.dayOfWeek = dayOfWeek;
    if (startTime) availability.startTime = startTime;
    if (endTime) availability.endTime = endTime;
    if (blockDurationMinutes) availability.blockDurationMinutes = blockDurationMinutes;
    if (individualPrice) availability.individualPrice = individualPrice;
    if (groupPricePerPerson) availability.groupPricePerPerson = groupPricePerPerson;
    if (maxGroupCapacity) availability.maxGroupCapacity = maxGroupCapacity;
    if (isActive !== undefined) availability.isActive = isActive;

    await availability.save();

    return NextResponse.json({
      success: true,
      message: 'Availability updated successfully',
      availability,
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    console.error('Error updating coach availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete availability
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Find user
    const user = await WebUser.findById(decoded.userId);
    if (!user || user.role !== 'coach') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Find availability
    const availability = await CoachAvailability.findById(params.id);
    if (!availability) {
      return NextResponse.json(
        { error: 'Availability not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (availability.coachId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: 'You can only delete your own availability' },
        { status: 403 }
      );
    }

    // Soft delete by setting isActive to false
    availability.isActive = false;
    await availability.save();

    return NextResponse.json({
      success: true,
      message: 'Availability deleted successfully',
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    console.error('Error deleting coach availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
