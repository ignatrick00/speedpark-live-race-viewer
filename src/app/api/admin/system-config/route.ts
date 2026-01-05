import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import SystemConfig from '@/models/SystemConfig';
import { verifyAdmin } from '@/lib/authHelpers';

// GET: Obtener configuración actual
export async function GET(request: NextRequest) {
  try {
    console.log('📊 GET /api/admin/system-config');

    await connectDB();

    const config = await SystemConfig.getConfig();

    return NextResponse.json({
      success: true,
      config: {
        minLapTime: config.minLapTime,
        maxLapTime: config.maxLapTime,
        validSessionTypes: config.validSessionTypes,
        lastUpdatedBy: config.lastUpdatedBy,
        updatedAt: config.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Error fetching system config:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener configuración',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT: Actualizar configuración (solo admin)
export async function PUT(request: NextRequest) {
  try {
    console.log('✏️ PUT /api/admin/system-config');

    // Verificar que sea admin
    const adminCheck = await verifyAdmin(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { minLapTime, maxLapTime, validSessionTypes } = body;

    // Validaciones
    if (minLapTime && (minLapTime < 1000 || minLapTime > 300000)) {
      return NextResponse.json(
        { success: false, error: 'Tiempo mínimo debe estar entre 1 y 300 segundos' },
        { status: 400 }
      );
    }

    if (maxLapTime && (maxLapTime < minLapTime || maxLapTime > 600000)) {
      return NextResponse.json(
        { success: false, error: 'Tiempo máximo inválido' },
        { status: 400 }
      );
    }

    await connectDB();

    const updates: any = {
      lastUpdatedBy: adminCheck.user?.email || 'admin'
    };

    if (minLapTime !== undefined) updates.minLapTime = minLapTime;
    if (maxLapTime !== undefined) updates.maxLapTime = maxLapTime;
    if (validSessionTypes) updates.validSessionTypes = validSessionTypes;

    const config = await SystemConfig.updateConfig(updates);

    console.log('✅ Configuración actualizada:', updates);

    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      config: {
        minLapTime: config.minLapTime,
        maxLapTime: config.maxLapTime,
        validSessionTypes: config.validSessionTypes,
        lastUpdatedBy: config.lastUpdatedBy,
        updatedAt: config.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Error updating system config:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar configuración',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
