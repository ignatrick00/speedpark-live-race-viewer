import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';
import WebUser from '@/models/WebUser';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Invite a pilot to join the squadron
 * Only captains can invite
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const authHeader = req.headers.get('authorization');
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

    const body = await req.json();
    const { pilotId } = body;

    if (!pilotId) {
      return NextResponse.json(
        { error: 'pilotId es requerido' },
        { status: 400 }
      );
    }

    console.log(`🎯 [INVITE] Captain ${userId} inviting pilot ${pilotId}`);

    // Verificar que el usuario es capitán de una escudería
    const captain = await WebUser.findById(userId);
    if (!captain || !captain.squadron?.squadronId) {
      return NextResponse.json(
        { error: 'No perteneces a ninguna escudería' },
        { status: 400 }
      );
    }

    const squadron = await Squadron.findById(captain.squadron.squadronId);
    if (!squadron) {
      return NextResponse.json(
        { error: 'Escudería no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el usuario es el capitán
    if (squadron.captainId.toString() !== userId) {
      return NextResponse.json(
        { error: 'Solo el capitán puede invitar miembros' },
        { status: 403 }
      );
    }

    // Verificar que hay espacio (máximo 4 miembros)
    if (squadron.members.length >= 4) {
      return NextResponse.json(
        { error: 'La escudería está llena (máximo 4 miembros)' },
        { status: 400 }
      );
    }

    // Verificar que el piloto existe y NO está en una escudería
    const pilot = await WebUser.findById(pilotId);
    if (!pilot) {
      return NextResponse.json(
        { error: 'Piloto no encontrado' },
        { status: 404 }
      );
    }

    if (pilot.squadron?.squadronId) {
      return NextResponse.json(
        { error: 'Este piloto ya pertenece a una escudería' },
        { status: 400 }
      );
    }

    // Verificar que el piloto no está ya en esta escudería
    const isMember = squadron.members.some((memberId: any) => memberId.toString() === pilotId);
    if (isMember) {
      return NextResponse.json(
        { error: 'Este piloto ya es miembro de tu escudería' },
        { status: 400 }
      );
    }

    // Verificar si ya existe una invitación pendiente
    const existingInvitation = pilot.invitations?.find(
      (inv: any) =>
        inv.squadronId?.toString() === squadron._id.toString() &&
        inv.status === 'pending'
    );

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Este piloto ya tiene una invitación pendiente de tu escudería' },
        { status: 400 }
      );
    }

    console.log(`✅ [INVITE] Sending invitation to ${pilot.email} for squadron ${squadron.name}`);

    // Crear invitación en el perfil del piloto
    if (!pilot.invitations) {
      pilot.invitations = [];
    }

    pilot.invitations.push({
      squadronId: squadron._id,
      invitedBy: captain._id,
      status: 'pending',
      createdAt: new Date(),
    });

    await pilot.save();

    return NextResponse.json({
      success: true,
      message: `Invitación enviada a ${pilot.profile?.alias || pilot.profile?.firstName || pilot.email}`,
    });

  } catch (error: any) {
    console.error('❌ [INVITE] Error:', error);
    return NextResponse.json(
      { error: 'Error al invitar piloto', details: error.message },
      { status: 500 }
    );
  }
}
