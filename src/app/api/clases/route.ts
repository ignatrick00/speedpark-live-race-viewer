import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ClaseBloque from '@/models/ClaseBloque';
import Instructor from '@/models/Instructor';

export async function GET(request: NextRequest) {
  try {
    console.log('📚 GET /api/clases - Fetching class blocks');
    
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const instructorId = searchParams.get('instructorId');
    const date = searchParams.get('date');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const status = searchParams.get('status') || 'available';
    
    // Build query
    let query: any = {};
    
    if (instructorId) {
      query.instructorId = instructorId;
    }
    
    if (date) {
      // Specific date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query.date = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    } else if (dateFrom || dateTo) {
      // Date range
      query.date = {};
      if (dateFrom) {
        query.date.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.date.$lte = new Date(dateTo);
      }
    } else {
      // Default: from today onwards
      query.date = { $gte: new Date() };
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const clases = await ClaseBloque.find(query)
      .populate('instructorId', 'name email specialties rating')
      .sort({ date: 1, startTime: 1 });
    
    console.log(`✅ Found ${clases.length} class blocks`);
    
    return NextResponse.json({
      success: true,
      clases,
      timestamp: new Date().toISOString(),
      total: clases.length,
      query: {
        instructorId,
        date,
        dateFrom,
        dateTo,
        status
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching classes:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error fetching classes',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📚 POST /api/clases - Creating class block');
    
    await connectDB();
    
    const body = await request.json();
    const {
      instructorId,
      date,
      startTime,
      endTime,
      duration,
      isGroupClass,
      maxCapacity,
      pricePerPerson,
      title,
      description,
      level
    } = body;
    
    // Validate required fields
    if (!instructorId || !date || !startTime || !endTime || !pricePerPerson) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields',
          required: ['instructorId', 'date', 'startTime', 'endTime', 'pricePerPerson']
        },
        { status: 400 }
      );
    }
    
    // Verify instructor exists
    const instructor = await Instructor.findById(instructorId);
    if (!instructor) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Instructor not found'
        },
        { status: 404 }
      );
    }
    
    // Check for time conflicts
    const classDate = new Date(date);
    const startOfDay = new Date(classDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(classDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const conflictingClasses = await ClaseBloque.find({
      instructorId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $ne: 'cancelled' },
      $or: [
        {
          $and: [
            { startTime: { $lte: startTime } },
            { endTime: { $gt: startTime } }
          ]
        },
        {
          $and: [
            { startTime: { $lt: endTime } },
            { endTime: { $gte: endTime } }
          ]
        },
        {
          $and: [
            { startTime: { $gte: startTime } },
            { endTime: { $lte: endTime } }
          ]
        }
      ]
    });
    
    if (conflictingClasses.length > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Time slot conflict with existing class',
          conflictingClasses: conflictingClasses.map(c => ({
            id: c._id,
            date: c.date,
            startTime: c.startTime,
            endTime: c.endTime
          }))
        },
        { status: 409 }
      );
    }
    
    // Calculate duration if not provided
    let calculatedDuration = duration;
    if (!calculatedDuration) {
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      calculatedDuration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    }
    
    // Create new class block
    const claseBloque = new ClaseBloque({
      instructorId,
      date: new Date(date),
      startTime,
      endTime,
      duration: calculatedDuration,
      isGroupClass: isGroupClass !== false, // Default to true
      maxCapacity: maxCapacity || (isGroupClass !== false ? 6 : 1),
      pricePerPerson: Number(pricePerPerson),
      title,
      description,
      level: level || 'all'
    });
    
    await claseBloque.save();
    
    // Populate instructor info for response
    await claseBloque.populate('instructorId', 'name email specialties rating');
    
    console.log(`✅ Created class block: ${claseBloque.date} ${claseBloque.startTime}-${claseBloque.endTime}`);
    
    return NextResponse.json({
      success: true,
      claseBloque,
      message: 'Class block created successfully'
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Error creating class block:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error creating class block',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}