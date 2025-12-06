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

    // Find user and verify they are a coach
    const user = await WebUser.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is a coach (support both legacy 'role' and new 'roles' array)
    const isCoach = (user as any).roles?.includes('coach') || (user as any).role === 'coach';
    if (!isCoach) {
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
    console.log('📨 PUT request received with body:', body);
    const {
      availabilityType,
      dayOfWeek,
      specificDate,
      startTime,
      endTime,
      blockDurationMinutes,
      individualPrice,
      groupPricePerPerson,
      maxGroupCapacity,
      isActive,
    } = body;

    // Update fields
    console.log('🔧 Before update - blockDurationMinutes:', availability.blockDurationMinutes);

    // Always update coachName to reflect current user name
    availability.coachName = `${user.profile.firstName} ${user.profile.lastName}`;

    // Update availability type and related fields
    if (availabilityType) {
      availability.availabilityType = availabilityType;
      if (availabilityType === 'recurring') {
        if (dayOfWeek !== undefined) availability.dayOfWeek = dayOfWeek;
        availability.specificDate = undefined;
      } else if (availabilityType === 'specific') {
        if (specificDate) availability.specificDate = new Date(specificDate);
        availability.dayOfWeek = undefined;
      }
    } else {
      // Legacy support - if no type specified, update fields as before
      if (dayOfWeek !== undefined) availability.dayOfWeek = dayOfWeek;
      if (specificDate) availability.specificDate = new Date(specificDate);
    }

    if (startTime) availability.startTime = startTime;
    if (endTime) availability.endTime = endTime;
    if (blockDurationMinutes !== undefined) {
      console.log('🔧 Updating blockDurationMinutes from', availability.blockDurationMinutes, 'to', blockDurationMinutes);
      availability.blockDurationMinutes = blockDurationMinutes;
    }
    if (individualPrice !== undefined) availability.individualPrice = individualPrice;
    if (groupPricePerPerson !== undefined) availability.groupPricePerPerson = groupPricePerPerson;
    if (maxGroupCapacity !== undefined) availability.maxGroupCapacity = maxGroupCapacity;
    if (isActive !== undefined) availability.isActive = isActive;

    console.log('💾 Saving availability with blockDurationMinutes:', availability.blockDurationMinutes);
    await availability.save();
    console.log('✅ Saved successfully');

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

    // Find user and verify they are a coach
    const user = await WebUser.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is a coach (support both legacy 'role' and new 'roles' array)
    const isCoach = (user as any).roles?.includes('coach') || (user as any).role === 'coach';
    if (!isCoach) {
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
