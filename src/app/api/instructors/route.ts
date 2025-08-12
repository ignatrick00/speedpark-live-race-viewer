import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Instructor from '@/models/Instructor';

export async function GET(request: NextRequest) {
  try {
    console.log('🧑‍🏫 GET /api/instructors - Fetching instructors');
    
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('active') !== 'false'; // Default to active only
    const specialty = searchParams.get('specialty');
    
    // Build query
    let query: any = { isActive };
    if (specialty) {
      query.specialties = { $in: [specialty] };
    }
    
    const instructors = await Instructor.find(query)
      .select('name email photo specialties experience rating totalClasses availableDays availableHours pricePerHourIndividual pricePerHourGroup')
      .sort({ rating: -1, totalClasses: -1 });
    
    console.log(`✅ Found ${instructors.length} instructors`);
    
    return NextResponse.json({
      success: true,
      instructors,
      timestamp: new Date().toISOString(),
      total: instructors.length
    });
    
  } catch (error) {
    console.error('❌ Error fetching instructors:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error fetching instructors',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🧑‍🏫 POST /api/instructors - Creating instructor');
    
    await connectDB();
    
    const body = await request.json();
    const {
      name,
      email,
      phone,
      photo,
      specialties,
      experience,
      availableDays,
      availableHours,
      pricePerHourIndividual,
      pricePerHourGroup
    } = body;
    
    // Validate required fields
    if (!name || !email || !specialties || !experience || !availableDays || !availableHours || !pricePerHourIndividual || !pricePerHourGroup) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields',
          required: ['name', 'email', 'specialties', 'experience', 'availableDays', 'availableHours', 'pricePerHourIndividual', 'pricePerHourGroup']
        },
        { status: 400 }
      );
    }
    
    // Check if instructor already exists
    const existingInstructor = await Instructor.findOne({ email });
    if (existingInstructor) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Instructor with this email already exists'
        },
        { status: 409 }
      );
    }
    
    // Create new instructor
    const instructor = new Instructor({
      name,
      email,
      phone,
      photo,
      specialties: Array.isArray(specialties) ? specialties : [specialties],
      experience,
      availableDays: Array.isArray(availableDays) ? availableDays : [availableDays],
      availableHours,
      pricePerHourIndividual: Number(pricePerHourIndividual),
      pricePerHourGroup: Number(pricePerHourGroup)
    });
    
    await instructor.save();
    
    console.log(`✅ Created instructor: ${instructor.name}`);
    
    return NextResponse.json({
      success: true,
      instructor: {
        id: instructor._id,
        name: instructor.name,
        email: instructor.email,
        specialties: instructor.specialties,
        experience: instructor.experience,
        rating: instructor.rating,
        isActive: instructor.isActive
      },
      message: 'Instructor created successfully'
    }, { status: 201 });
    
  } catch (error) {
    console.error('❌ Error creating instructor:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error creating instructor',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}