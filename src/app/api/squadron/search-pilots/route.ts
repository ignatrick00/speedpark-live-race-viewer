import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Search for pilots by name, email, or alias
 * Only returns pilots who are NOT in a squadron
 */
export async function GET(req: NextRequest) {
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

    try {
      jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    if (query.length < 2) {
      return NextResponse.json({
        success: true,
        pilots: [],
        message: 'Escribe al menos 2 caracteres para buscar'
      });
    }

    console.log(`🔍 [SEARCH PILOTS] Searching for: "${query}"`);

    // Buscar pilotos que NO están en una escudería
    // Buscar por nombre, apellido, alias o email
    const pilots = await WebUser.find({
      $and: [
        {
          $or: [
            { 'profile.firstName': { $regex: query, $options: 'i' } },
            { 'profile.lastName': { $regex: query, $options: 'i' } },
            { 'profile.alias': { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } }
          ]
        },
        {
          'squadron.squadronId': { $exists: false }
        }
      ]
    })
      .select('_id email profile.firstName profile.lastName profile.alias createdAt')
      .limit(20)
      .lean();

    console.log(`✅ [SEARCH PILOTS] Found ${pilots.length} pilots without squadron`);

    const formattedPilots = pilots.map((pilot: any) => ({
      _id: pilot._id.toString(),
      email: pilot.email,
      displayName: pilot.profile?.alias ||
                   `${pilot.profile?.firstName || ''} ${pilot.profile?.lastName || ''}`.trim() ||
                   pilot.email,
      firstName: pilot.profile?.firstName || '',
      lastName: pilot.profile?.lastName || '',
      alias: pilot.profile?.alias || '',
      memberSince: pilot.createdAt
    }));

    return NextResponse.json({
      success: true,
      pilots: formattedPilots,
      total: formattedPilots.length
    });

  } catch (error: any) {
    console.error('❌ [SEARCH PILOTS] Error:', error);
    return NextResponse.json(
      { error: 'Error al buscar pilotos', details: error.message },
      { status: 500 }
    );
  }
}
