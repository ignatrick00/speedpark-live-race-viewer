import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';
import WebUser from '@/models/WebUser';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * GET /api/squadrons
 * Get all squadrons with filters (public or user-specific)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const division = searchParams.get('division');
    const search = searchParams.get('search');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    let query: any = { isActive: true };

    // Filter by division
    if (division && division !== 'all') {
      query.division = division;
    }

    // Search by name
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Get squadrons
    const squadrons = await Squadron.find(query)
      .populate('captainId', 'profile email')
      .populate('members', 'profile email')
      .sort({ totalPoints: -1, ranking: 1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const total = await Squadron.countDocuments(query);

    // If userId provided, check if user is in any squadron
    let userSquadron = null;
    if (userId) {
      userSquadron = await Squadron.findOne({
        members: userId,
        isActive: true
      }).lean();
    }

    return NextResponse.json({
      success: true,
      squadrons,
      userSquadron,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error getting squadrons:', error);
    return NextResponse.json(
      { error: 'Error al obtener escuderías' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/squadrons
 * Create a new squadron
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let userId: string;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      userId = decoded.userId;
    } catch (error) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { name, description, colors, recruitmentMode, initialMembers } = body;

    // Validate required fields
    if (!name || name.length < 3 || name.length > 30) {
      return NextResponse.json(
        { error: 'El nombre debe tener entre 3 y 30 caracteres' },
        { status: 400 }
      );
    }

    // Check if user is already in a squadron
    const existingMembership = await Squadron.findOne({
      members: userId,
      isActive: true
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'Ya perteneces a una escudería activa' },
        { status: 400 }
      );
    }

    // Check if name is taken
    const existingName = await Squadron.findOne({ name });
    if (existingName) {
      return NextResponse.json(
        { error: 'El nombre de la escudería ya está en uso' },
        { status: 400 }
      );
    }

    // Generate unique squadronId
    const squadronId = `SQ-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create squadron (captain is automatically a member)
    const members = [userId];

    // Add initial members if provided (validate they're not in other squadrons)
    if (initialMembers && Array.isArray(initialMembers)) {
      for (const memberId of initialMembers) {
        if (memberId !== userId) {
          const memberCheck = await Squadron.findOne({
            members: memberId,
            isActive: true
          });

          if (!memberCheck) {
            members.push(memberId);
          }
        }
      }
    }

    // Validate member count (2-4)
    if (members.length < 2) {
      return NextResponse.json(
        { error: 'Una escudería debe tener al menos 2 miembros. Invita a otro piloto.' },
        { status: 400 }
      );
    }

    if (members.length > 4) {
      return NextResponse.json(
        { error: 'Una escudería puede tener máximo 4 miembros' },
        { status: 400 }
      );
    }

    const squadron = await Squadron.create({
      squadronId,
      name,
      description: description || '',
      colors: colors || {
        primary: '#00D4FF',
        secondary: '#0057B8'
      },
      captainId: userId,
      members,
      recruitmentMode: recruitmentMode || 'open',
      totalPoints: 0,
      ranking: 0,
      division: 'Open',
      fairRacingAverage: 85,
      totalRaces: 0,
      totalVictories: 0,
      isActive: true,
      inactivityStreak: 0
    });

    // Populate for response
    const populatedSquadron = await Squadron.findById(squadron._id)
      .populate('captainId', 'profile email')
      .populate('members', 'profile email')
      .lean();

    return NextResponse.json({
      success: true,
      squadron: populatedSquadron,
      message: 'Escudería creada exitosamente'
    });

  } catch (error: any) {
    console.error('Error creating squadron:', error);
    return NextResponse.json(
      { error: 'Error al crear escudería', details: error.message },
      { status: 500 }
    );
  }
}
