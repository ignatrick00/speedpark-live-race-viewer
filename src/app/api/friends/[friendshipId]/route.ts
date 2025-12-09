import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/mongodb';
import Friendship from '@/models/Friendship';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { friendshipId: string } }
) {
  try {
    // Verify JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const { friendshipId } = params;

    await dbConnect();

    // Find the friendship
    const friendship = await Friendship.findById(friendshipId);
    if (!friendship) {
      return NextResponse.json({ error: 'Amistad no encontrada' }, { status: 404 });
    }

    // Verify that the current user is part of this friendship
    const isParticipant =
      friendship.userId.toString() === decoded.userId ||
      friendship.friendId.toString() === decoded.userId;

    if (!isParticipant) {
      return NextResponse.json({ error: 'No autorizado para eliminar esta amistad' }, { status: 403 });
    }

    // Delete the friendship
    await Friendship.findByIdAndDelete(friendshipId);

    return NextResponse.json({
      message: 'Amistad eliminada exitosamente'
    });

  } catch (error: any) {
    console.error('Error deleting friendship:', error);
    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al eliminar amistad' }, { status: 500 });
  }
}
