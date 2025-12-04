import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import TrainingClass from '@/models/TrainingClass';
import CoachAvailability from '@/models/CoachAvailability';
import WebUser from '@/models/WebUser';

// POST - Book a slot (auto-creates TrainingClass if needed)
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

    // Find user
    const user = await WebUser.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { availabilityId, date, startTime, endTime, bookingType } = body;

    if (!availabilityId || !date || !startTime || !endTime || !bookingType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['individual', 'group'].includes(bookingType)) {
      return NextResponse.json(
        { error: 'Invalid booking type. Must be "individual" or "group"' },
        { status: 400 }
      );
    }

    // Find the availability to get pricing and limits
    const availability = await CoachAvailability.findById(availabilityId);
    if (!availability || !availability.isActive) {
      return NextResponse.json(
        { error: 'Availability not found or no longer active' },
        { status: 404 }
      );
    }

    const studentName = user.profile.alias || `${user.profile.firstName} ${user.profile.lastName}`;

    // Check if a training class already exists for this slot
    const slotDate = new Date(date);
    let trainingClass = await TrainingClass.findOne({
      coachId: availability.coachId,
      date: slotDate,
      startTime,
      endTime,
    });

    // If no class exists, create one
    if (!trainingClass) {
      trainingClass = await TrainingClass.create({
        coachId: availability.coachId,
        coachName: availability.coachName,
        title: `Clase ${startTime} - ${endTime}`,
        description: 'Clase generada automáticamente desde disponibilidad',
        specialties: [],
        date: slotDate,
        startTime,
        endTime,
        durationMinutes: 60,
        bookingType: 'both',
        maxGroupCapacity: availability.maxGroupCapacity,
        individualPrice: availability.individualPrice,
        groupPricePerPerson: availability.groupPricePerPerson,
        groupBookings: [],
        status: 'available',
      });
    }

    // Now book the class
    if (bookingType === 'individual') {
      // Check availability
      if ((trainingClass.individualBooking && trainingClass.individualBooking.studentId) || trainingClass.groupBookings.length > 0) {
        return NextResponse.json(
          { error: 'Class is not available for individual booking' },
          { status: 400 }
        );
      }

      // Create individual booking
      trainingClass.individualBooking = {
        studentId: user._id,
        studentName,
        bookedAt: new Date(),
        status: 'confirmed',
      };

      trainingClass.updateStatus();
      await trainingClass.save();

      return NextResponse.json({
        success: true,
        message: 'Individual class booked successfully',
        booking: trainingClass.individualBooking,
        price: trainingClass.individualPrice,
        classId: trainingClass._id,
      });
    }

    // Handle group booking
    if (bookingType === 'group') {
      // Check availability
      if (trainingClass.individualBooking && trainingClass.individualBooking.studentId) {
        return NextResponse.json(
          { error: 'Class is booked for individual session' },
          { status: 400 }
        );
      }

      if (trainingClass.groupBookings.length >= trainingClass.maxGroupCapacity) {
        return NextResponse.json(
          { error: 'Class is fully booked' },
          { status: 400 }
        );
      }

      // Check if user already booked
      const alreadyBooked = trainingClass.groupBookings.some(
        (booking) => booking.studentId.toString() === user._id.toString()
      );

      if (alreadyBooked) {
        return NextResponse.json(
          { error: 'You have already booked this class' },
          { status: 400 }
        );
      }

      // Add to group bookings
      trainingClass.groupBookings.push({
        studentId: user._id,
        studentName,
        bookedAt: new Date(),
        status: 'confirmed',
      });

      trainingClass.updateStatus();
      await trainingClass.save();

      return NextResponse.json({
        success: true,
        message: 'Group class booked successfully',
        booking: trainingClass.groupBookings[trainingClass.groupBookings.length - 1],
        price: trainingClass.groupPricePerPerson,
        spotsLeft: trainingClass.maxGroupCapacity - trainingClass.groupBookings.length,
        classId: trainingClass._id,
      });
    }
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    console.error('Error booking slot:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
