import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import TrainingClass from '@/models/TrainingClass';
import WebUser from '@/models/WebUser';

// GET - Get student's bookings
export async function GET(request: NextRequest) {
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

    // Get current date (start of today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all classes where the student has a booking (individual or group)
    // Only show upcoming classes (date >= today)
    const classes = await TrainingClass.find({
      date: { $gte: today },
      $or: [
        { 'individualBooking.studentId': user._id, 'individualBooking.status': { $ne: 'cancelled' } },
        {
          groupBookings: {
            $elemMatch: {
              studentId: user._id,
              status: { $ne: 'cancelled' }
            }
          }
        }
      ]
    }).sort({ date: 1, startTime: 1 });

    // Transform to simplified format
    const bookings = classes.map(clase => {
      const isIndividual = clase.individualBooking?.studentId?.toString() === user._id.toString();
      const groupBooking = clase.groupBookings.find(
        b => b.studentId.toString() === user._id.toString() && b.status !== 'cancelled'
      );

      return {
        classId: clase._id,
        coachName: clase.coachName,
        title: clase.title,
        description: clase.description,
        date: clase.date,
        startTime: clase.startTime,
        endTime: clase.endTime,
        bookingType: isIndividual ? 'individual' : 'group',
        price: isIndividual ? clase.individualPrice : clase.groupPricePerPerson,
        bookedAt: isIndividual ? clase.individualBooking?.bookedAt : groupBooking?.bookedAt,
        status: isIndividual ? clase.individualBooking?.status : groupBooking?.status,
        groupInfo: !isIndividual ? {
          currentStudents: clase.groupBookings.filter(b => b.status !== 'cancelled').length,
          maxCapacity: clase.maxGroupCapacity
        } : null
      };
    });

    return NextResponse.json({
      success: true,
      bookings
    });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    console.error('Error fetching student bookings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
