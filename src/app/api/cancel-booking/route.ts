import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import TrainingClass from '@/models/TrainingClass';
import WebUser from '@/models/WebUser';
import notificationService from '@/lib/notificationService';

// POST - Cancel a student's booking
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
    const { classId } = body;

    if (!classId) {
      return NextResponse.json(
        { error: 'Missing classId' },
        { status: 400 }
      );
    }

    // Find the class
    const trainingClass = await TrainingClass.findById(classId);
    if (!trainingClass) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Check if student has an individual booking
    if (trainingClass.individualBooking?.studentId?.toString() === user._id.toString()) {
      if (trainingClass.individualBooking.status === 'cancelled') {
        return NextResponse.json(
          { error: 'Booking already cancelled' },
          { status: 400 }
        );
      }

      // Get coach info before removing booking
      const coachId = trainingClass.coachId;
      const coach = await WebUser.findById(coachId);
      const studentName = user.profile.firstName + ' ' + user.profile.lastName;

      // Cancel individual booking by removing it
      trainingClass.individualBooking = undefined;
      trainingClass.updateStatus();

      // Send notification to coach
      if (coach) {
        try {
          await notificationService.notifyCoachOfCancellation({
            userId: coach._id.toString(),
            userEmail: coach.email,
            userName: coach.profile.firstName,
            type: 'booking_cancelled_by_student',
            classData: {
              classId: trainingClass._id.toString(),
              date: trainingClass.date.toISOString().split('T')[0],
              startTime: trainingClass.startTime,
              endTime: trainingClass.endTime,
              studentName,
            },
          });
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
          // Continue even if notification fails
        }
      }

      // If class is now empty (no bookings), delete it entirely
      const hasGroupBookings = trainingClass.groupBookings && trainingClass.groupBookings.length > 0;
      if (!hasGroupBookings) {
        await TrainingClass.findByIdAndDelete(classId);
        return NextResponse.json({
          success: true,
          message: 'Booking cancelled and empty class removed',
          bookingType: 'individual',
          classDeleted: true
        });
      }

      await trainingClass.save();

      return NextResponse.json({
        success: true,
        message: 'Individual booking cancelled successfully',
        bookingType: 'individual'
      });
    }

    // Check if student has a group booking
    const groupBookingIndex = trainingClass.groupBookings.findIndex(
      b => b.studentId.toString() === user._id.toString()
    );

    if (groupBookingIndex !== -1) {
      const groupBooking = trainingClass.groupBookings[groupBookingIndex];

      if (groupBooking.status === 'cancelled') {
        return NextResponse.json(
          { error: 'Booking already cancelled' },
          { status: 400 }
        );
      }

      // Get coach info before removing booking
      const coachId = trainingClass.coachId;
      const coach = await WebUser.findById(coachId);
      const studentName = user.profile.firstName + ' ' + user.profile.lastName;

      // Remove the booking from the array
      trainingClass.groupBookings.splice(groupBookingIndex, 1);
      trainingClass.updateStatus();

      // Send notification to coach
      if (coach) {
        try {
          await notificationService.notifyCoachOfCancellation({
            userId: coach._id.toString(),
            userEmail: coach.email,
            userName: coach.profile.firstName,
            type: 'booking_cancelled_by_student',
            classData: {
              classId: trainingClass._id.toString(),
              date: trainingClass.date.toISOString().split('T')[0],
              startTime: trainingClass.startTime,
              endTime: trainingClass.endTime,
              studentName,
            },
          });
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
          // Continue even if notification fails
        }
      }

      // If class is now empty (no bookings), delete it entirely
      const hasIndividualBooking = trainingClass.individualBooking && trainingClass.individualBooking.studentId;
      const hasOtherGroupBookings = trainingClass.groupBookings.length > 0;

      if (!hasIndividualBooking && !hasOtherGroupBookings) {
        await TrainingClass.findByIdAndDelete(classId);
        return NextResponse.json({
          success: true,
          message: 'Booking cancelled and empty class removed',
          bookingType: 'group',
          classDeleted: true
        });
      }

      await trainingClass.save();

      return NextResponse.json({
        success: true,
        message: 'Group booking cancelled successfully',
        bookingType: 'group'
      });
    }

    // No booking found for this student
    return NextResponse.json(
      { error: 'No active booking found for this class' },
      { status: 404 }
    );

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
