import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';
import WebUser from '@/models/WebUser';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * POST /api/squadrons/[id]/members
 * Add a member to squadron (captain only, or join if open)
 */
export async function POST(
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

    const body = await request.json();
    const { memberId, action } = body; // action: 'join' | 'invite'

    const squadron = await Squadron.findById(params.id);

    if (!squadron) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }

    if (!squadron.isActive) {
      return NextResponse.json(
        { error: 'Escudería inactiva' },
        { status: 400 }
      );
    }

    // Check if squadron is full
    if (squadron.members.length >= 4) {
      return NextResponse.json(
        { error: 'La escudería está completa (máximo 4 miembros)' },
        { status: 400 }
      );
    }

    const targetMemberId = memberId || userId;

    // Check if user is already in a squadron
    const existingMembership = await Squadron.findOne({
      members: targetMemberId,
      isActive: true
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'El piloto ya pertenece a una escudería activa' },
        { status: 400 }
      );
    }

    // Check if user is already in this squadron
    if (squadron.members.some((m: any) => m.toString() === targetMemberId)) {
      return NextResponse.json(
        { error: 'El piloto ya es miembro de esta escudería' },
        { status: 400 }
      );
    }

    // Check permissions
    if (action === 'invite') {
      // Only captain can invite
      if (squadron.captainId.toString() !== userId) {
        return NextResponse.json(
          { error: 'Solo el capitán puede invitar miembros' },
          { status: 403 }
        );
      }
    } else if (action === 'join') {
      // User joining themselves
      if (targetMemberId !== userId) {
        return NextResponse.json(
          { error: 'Solo puedes unirte tú mismo' },
          { status: 403 }
        );
      }

      // Check if recruitment is open
      if (squadron.recruitmentMode !== 'open') {
        return NextResponse.json(
          { error: 'Esta escudería solo acepta invitaciones' },
          { status: 403 }
        );
      }
    }

    // Add member
    squadron.members.push(targetMemberId);
    await squadron.save();

    const updatedSquadron = await Squadron.findById(squadron._id)
      .populate('captainId', 'profile email')
      .populate('members', 'profile email')
      .lean();

    return NextResponse.json({
      success: true,
      squadron: updatedSquadron,
      message: action === 'join' ? 'Te has unido a la escudería' : 'Miembro invitado exitosamente'
    });

  } catch (error: any) {
    console.error('Error adding member:', error);
    return NextResponse.json(
      { error: 'Error al agregar miembro', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/squadrons/[id]/members
 * Remove a member from squadron (captain or self)
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

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId') || userId;

    const squadron = await Squadron.findById(params.id);

    if (!squadron) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }

    // Check permissions (captain or removing self)
    const isCaptain = squadron.captainId.toString() === userId;
    const isRemovingSelf = memberId === userId;

    if (!isCaptain && !isRemovingSelf) {
      return NextResponse.json(
        { error: 'No tienes permiso para expulsar miembros' },
        { status: 403 }
      );
    }

    // Cannot remove captain
    if (memberId === squadron.captainId.toString()) {
      return NextResponse.json(
        { error: 'El capitán no puede ser expulsado. Debe transferir el liderazgo o disolver la escudería.' },
        { status: 400 }
      );
    }

    // Remove member
    squadron.members = squadron.members.filter(
      (m: any) => m.toString() !== memberId
    );

    // Check minimum members (2)
    if (squadron.members.length < 2) {
      return NextResponse.json(
        { error: 'La escudería debe tener al menos 2 miembros. Considera disolverla.' },
        { status: 400 }
      );
    }

    await squadron.save();

    const updatedSquadron = await Squadron.findById(squadron._id)
      .populate('captainId', 'profile email')
      .populate('members', 'profile email')
      .lean();

    return NextResponse.json({
      success: true,
      squadron: updatedSquadron,
      message: isRemovingSelf ? 'Has abandonado la escudería' : 'Miembro expulsado exitosamente'
    });

  } catch (error: any) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Error al expulsar miembro', details: error.message },
      { status: 500 }
    );
  }
}
