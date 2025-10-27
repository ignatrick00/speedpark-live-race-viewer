import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Squadron from '@/models/Squadron';
import WebUser from '@/models/WebUser';
import FairRacingScore from '@/models/FairRacingScore';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface CreateSquadronRequest {
  name: string;
  description?: string;
  colors: {
    primary: string;
    secondary: string;
  };
  recruitmentMode: 'open' | 'invite-only';
}

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

    // Conectar a MongoDB
    await connectDB();

    // Obtener datos del request
    const body: CreateSquadronRequest = await req.json();
    const { name, description, colors, recruitmentMode } = body;

    // Validaciones
    if (!name || name.length < 3 || name.length > 30) {
      return NextResponse.json(
        { error: 'El nombre debe tener entre 3 y 30 caracteres' },
        { status: 400 }
      );
    }

    // Validar formato de colores (hex)
    const hexColorRegex = /^#[0-9A-F]{6}$/i;
    if (!colors?.primary || !hexColorRegex.test(colors.primary)) {
      return NextResponse.json(
        { error: 'Color primario inválido (debe ser formato hex #RRGGBB)' },
        { status: 400 }
      );
    }

    if (!colors?.secondary || !hexColorRegex.test(colors.secondary)) {
      return NextResponse.json(
        { error: 'Color secundario inválido (debe ser formato hex #RRGGBB)' },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe
    const user = await WebUser.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario NO está en una escudería
    if (user.squadron.squadronId) {
      return NextResponse.json(
        { error: 'Ya perteneces a una escudería. Debes salir primero.' },
        { status: 400 }
      );
    }

    // Verificar que el nombre no está en uso
    const existingSquadron = await Squadron.findOne({ name });
    if (existingSquadron) {
      return NextResponse.json(
        { error: 'Ya existe una escudería con ese nombre' },
        { status: 400 }
      );
    }

    // Obtener Fair Racing Score del usuario
    let fairRacingScore = await FairRacingScore.findOne({ pilotId: userId });

    // Si no existe, crear uno nuevo (todos empiezan en 85)
    if (!fairRacingScore) {
      fairRacingScore = await FairRacingScore.create({
        pilotId: userId,
        currentScore: 85,
        initialScore: 85,
      });
    }

    // Generar squadronId único
    const squadronId = `SQ-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Crear escudería
    const squadron = await Squadron.create({
      squadronId,
      name,
      description: description || '',
      colors: {
        primary: colors.primary,
        secondary: colors.secondary,
      },
      captainId: userId,
      members: [userId], // El creador es el primer miembro
      recruitmentMode: recruitmentMode || 'open',
      fairRacingAverage: fairRacingScore.currentScore,
      totalPoints: 0,
      ranking: 0,
      division: 'Open', // Todas empiezan en Open
    });

    // Actualizar usuario para asignarlo como capitán
    user.squadron.squadronId = squadron._id;
    user.squadron.role = 'captain';
    user.squadron.joinedAt = new Date();
    await user.save();

    // Populate para devolver datos completos
    const populatedSquadron = await Squadron.findById(squadron._id)
      .populate('captainId', 'email profile')
      .populate('members', 'email profile');

    return NextResponse.json({
      success: true,
      message: 'Escudería creada exitosamente',
      squadron: populatedSquadron,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating squadron:', error);
    return NextResponse.json(
      { error: 'Error al crear la escudería', details: error.message },
      { status: 500 }
    );
  }
}
