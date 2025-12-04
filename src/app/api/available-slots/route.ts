import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CoachAvailability from '@/models/CoachAvailability';
import TrainingClass from '@/models/TrainingClass';

// GET - Generate available slots from coach availability
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const coachId = searchParams.get('coachId');
    const weeksAhead = parseInt(searchParams.get('weeksAhead') || '2'); // Default 2 weeks

    if (!coachId) {
      return NextResponse.json(
        { error: 'coachId parameter is required' },
        { status: 400 }
      );
    }

    // Get coach availabilities
    const availabilities = await CoachAvailability.find({
      coachId,
      isActive: true,
    }).populate('coachId', 'profile');

    if (availabilities.length === 0) {
      return NextResponse.json({
        success: true,
        slots: [],
      });
    }

    // Generate date range (today + N weeks)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (weeksAhead * 7));

    // Get existing classes in this date range to check what's booked
    const existingClasses = await TrainingClass.find({
      coachId,
      date: { $gte: today, $lte: endDate },
    });

    // Create a map of existing classes by date + time
    const existingClassesMap = new Map();
    existingClasses.forEach(clase => {
      const key = `${clase.date.toISOString().split('T')[0]}_${clase.startTime}`;
      existingClassesMap.set(key, clase);
    });

    // Generate slots
    const slots: any[] = [];

    // Iterate through each day in the date range
    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();

      // Find availabilities for this day of week
      const dayAvailabilities = availabilities.filter(a => a.dayOfWeek === dayOfWeek);

      for (const availability of dayAvailabilities) {
        // Generate hourly slots within the availability window
        const [startHour, startMin] = availability.startTime.split(':').map(Number);
        const [endHour, endMin] = availability.endTime.split(':').map(Number);

        for (let hour = startHour; hour < endHour; hour++) {
          const slotStartTime = `${hour.toString().padStart(2, '0')}:00`;
          const slotEndTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
          const slotDate = new Date(d);
          const key = `${slotDate.toISOString().split('T')[0]}_${slotStartTime}`;

          // Check if there's an existing class for this slot
          const existingClass = existingClassesMap.get(key);

          let status = 'available';
          let existingClassId = null;
          let individualBooking = null;
          let groupBookings: any[] = [];
          let groupSpotsLeft = availability.maxGroupCapacity;

          if (existingClass) {
            existingClassId = existingClass._id.toString();

            // Check booking status
            if (existingClass.individualBooking && existingClass.individualBooking.studentId) {
              status = 'fully_booked';
              individualBooking = {
                studentName: existingClass.individualBooking.studentName,
                bookedAt: existingClass.individualBooking.bookedAt,
              };
            } else if (existingClass.groupBookings && existingClass.groupBookings.length > 0) {
              groupBookings = existingClass.groupBookings.map((b: any) => ({
                studentName: b.studentName,
                bookedAt: b.bookedAt,
              }));
              groupSpotsLeft = availability.maxGroupCapacity - existingClass.groupBookings.length;

              if (groupSpotsLeft > 0) {
                status = 'partially_booked';
              } else {
                status = 'fully_booked';
              }
            }
          }

          slots.push({
            // Slot identification
            date: slotDate.toISOString().split('T')[0],
            dayOfWeek,
            startTime: slotStartTime,
            endTime: slotEndTime,

            // Coach info
            coachId: availability.coachId._id || availability.coachId,
            coachName: availability.coachName,

            // Pricing
            individualPrice: availability.individualPrice,
            groupPricePerPerson: availability.groupPricePerPerson,
            maxGroupCapacity: availability.maxGroupCapacity,

            // Booking status
            status,
            existingClassId,
            individualBooking,
            groupBookings,
            groupSpotsLeft,

            // Availability reference
            availabilityId: availability._id,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      slots,
      totalSlots: slots.length,
    });
  } catch (error) {
    console.error('Error generating available slots:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
