import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import FriendlyRace from '@/models/FriendlyRace';
import jwt from 'jsonwebtoken';
import WebUser from '@/models/WebUser';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * POST /api/admin/migrate-friendly-races
 * Migra carreras amistosas existentes para agregar campos de vinculación
 * Solo accesible por administradores
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
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
        { success: false, error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Verificar que sea admin
    const user = await WebUser.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const userRoles = (user as any).roles && Array.isArray((user as any).roles)
      ? (user as any).roles
      : ((user as any).role ? [(user as any).role] : ['user']);

    if (!userRoles.includes('admin')) {
      return NextResponse.json(
        { success: false, error: 'Solo administradores pueden ejecutar migraciones' },
        { status: 403 }
      );
    }

    console.log('🔧 [MIGRATION] Starting friendly races migration...');

    // Contar carreras sin campos de vinculación
    const racesWithoutFields = await FriendlyRace.countDocuments({
      linkedRaceSessionId: { $exists: false }
    });

    console.log(`📊 [MIGRATION] Found ${racesWithoutFields} races without link fields`);

    if (racesWithoutFields === 0) {
      return NextResponse.json({
        success: true,
        message: 'Todas las carreras ya tienen los campos de vinculación',
        racesUpdated: 0,
        totalRaces: await FriendlyRace.countDocuments({})
      });
    }

    // Actualizar carreras sin los campos
    const result = await FriendlyRace.updateMany(
      {
        linkedRaceSessionId: { $exists: false }
      },
      {
        $set: {
          raceStatus: 'pending',
          linkedRaceSessionId: null,
          results: null
        }
      }
    );

    console.log(`✅ [MIGRATION] Updated ${result.modifiedCount} races`);

    return NextResponse.json({
      success: true,
      message: 'Migración completada exitosamente',
      racesUpdated: result.modifiedCount,
      racesMatched: result.matchedCount,
      totalRaces: await FriendlyRace.countDocuments({})
    });

  } catch (error) {
    console.error('❌ [MIGRATION] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al ejecutar migración',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
