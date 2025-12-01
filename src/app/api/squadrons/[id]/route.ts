import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';
import WebUser from '@/models/WebUser';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * GET /api/squadrons/[id]
 * Get squadron details by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const squadron = await Squadron.findById(params.id)
      .populate('captainId', 'profile email kartingLink stats')
      .populate('members', 'profile email kartingLink stats')
      .lean();

    if (!squadron) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      squadron
    });

  } catch (error) {
    console.error('Error getting squadron:', error);
    return NextResponse.json(
      { error: 'Error al obtener escudería' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/squadrons/[id]
 * Update squadron details (captain only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const squadron = await Squadron.findById(params.id);

    if (!squadron) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }

    // Check if user is the captain
    if (squadron.captainId.toString() !== userId) {
      return NextResponse.json(
        { error: 'Solo el capitán puede modificar la escudería' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, colors, recruitmentMode, logo } = body;

    // Update allowed fields
    if (name) {
      // Check if new name is taken
      const existingName = await Squadron.findOne({
        name,
        _id: { $ne: params.id }
      });

      if (existingName) {
        return NextResponse.json(
          { error: 'El nombre ya está en uso' },
          { status: 400 }
        );
      }

      squadron.name = name;
    }

    if (description !== undefined) squadron.description = description;
    if (colors) squadron.colors = colors;
    if (recruitmentMode) squadron.recruitmentMode = recruitmentMode;
    if (logo !== undefined) squadron.logo = logo;

    await squadron.save();

    const updatedSquadron = await Squadron.findById(squadron._id)
      .populate('captainId', 'profile email')
      .populate('members', 'profile email')
      .lean();

    return NextResponse.json({
      success: true,
      squadron: updatedSquadron,
      message: 'Escudería actualizada exitosamente'
    });

  } catch (error: any) {
    console.error('Error updating squadron:', error);
    return NextResponse.json(
      { error: 'Error al actualizar escudería', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/squadrons/[id]
 * Disband squadron (captain only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const squadron = await Squadron.findById(params.id);

    if (!squadron) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }

    // Check if user is the captain
    if (squadron.captainId.toString() !== userId) {
      return NextResponse.json(
        { error: 'Solo el capitán puede disolver la escudería' },
        { status: 403 }
      );
    }

    // Mark as inactive instead of deleting
    squadron.isActive = false;
    await squadron.save();

    return NextResponse.json({
      success: true,
      message: 'Escudería disuelta exitosamente'
    });

  } catch (error: any) {
    console.error('Error deleting squadron:', error);
    return NextResponse.json(
      { error: 'Error al disolver escudería', details: error.message },
      { status: 500 }
    );
  }
}
