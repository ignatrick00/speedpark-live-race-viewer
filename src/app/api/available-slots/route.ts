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
    const daysAhead = parseInt(searchParams.get('daysAhead') || '30'); // Default 30 days (1 month)

    // Build query filter
    const filter: any = { isActive: true };
    if (coachId) {
      filter.coachId = coachId;
    }

    // Get coach availabilities (all coaches if no coachId specified)
    const availabilities = await CoachAvailability.find(filter).populate('coachId', 'profile');

    if (availabilities.length === 0) {
      return NextResponse.json({
        success: true,
        slots: [],
      });
    }

    // Generate date range (today + N days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + daysAhead);

    // Get existing classes in this date range to check what's booked
    const classQuery: any = {
      date: { $gte: today, $lte: endDate },
    };
    if (coachId) {
      classQuery.coachId = coachId;
    }
    const existingClasses = await TrainingClass.find(classQuery);

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
      const currentDateStr = d.toISOString().split('T')[0];

      // Find availabilities for this day:
      // 1. Recurring availabilities matching dayOfWeek
      // 2. Specific date availabilities matching this exact date
      const dayAvailabilities = availabilities.filter(a => {
        if (a.availabilityType === 'specific') {
          // For specific dates, check if the date matches
          if (!a.specificDate) return false;
          const specificDateStr = new Date(a.specificDate).toISOString().split('T')[0];
          return specificDateStr === currentDateStr;
        } else {
          // For recurring (or legacy without type), check dayOfWeek
          return a.dayOfWeek === dayOfWeek;
        }
      });

      for (const availability of dayAvailabilities) {
        // Generate slots based on block duration
        const [startHour, startMin] = availability.startTime.split(':').map(Number);
        const [endHour, endMin] = availability.endTime.split(':').map(Number);

        // Calculate total minutes in availability window
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        const blockDuration = availability.blockDurationMinutes || 45;

        // Generate slots based on block duration
        for (let minutes = startMinutes; minutes < endMinutes; minutes += blockDuration) {
          const slotStartHour = Math.floor(minutes / 60);
          const slotStartMin = minutes % 60;
          const slotEndMinutes = minutes + blockDuration;

          // Stop if the end time exceeds the availability window
          if (slotEndMinutes > endMinutes) break;

          const slotEndHour = Math.floor(slotEndMinutes / 60);
          const slotEndMin = slotEndMinutes % 60;

          const slotStartTime = `${slotStartHour.toString().padStart(2, '0')}:${slotStartMin.toString().padStart(2, '0')}`;
          const slotEndTime = `${slotEndHour.toString().padStart(2, '0')}:${slotEndMin.toString().padStart(2, '0')}`;
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

            // Availability type
            availabilityType: availability.availabilityType || 'recurring',

            // Block duration
            durationMinutes: availability.blockDurationMinutes || 45,

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
