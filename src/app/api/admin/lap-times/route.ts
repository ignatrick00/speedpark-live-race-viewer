import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RaceSessionV0 from '@/models/RaceSessionV0';
import { verifyAdmin } from '@/lib/authHelpers';

// GET: Obtener todos los registros de tiempos con filtros
export async function GET(request: NextRequest) {
  try {
    console.log('📊 GET /api/admin/lap-times');

    // Verificar que sea admin
    const adminCheck = await verifyAdmin(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'date'; // 'date' or 'bestTime'
    const top10Mode = searchParams.get('top10') === 'true'; // Top 10 histórico

    await connectDB();

    if (top10Mode) {
      // TOP 10 MODE: Agregación para obtener los 10 mejores tiempos
      console.log('🏆 TOP 10 MODE: Fetching historical best times');

      const top10 = await RaceSessionV0.aggregate([
        // Sesiones de carrera y clasificación válidas (excluir F1, K1, GT, etc.)
        {
          $match: {
            sessionType: { $in: ['carrera', 'clasificacion'] },
            // Excluir carreras de otras categorías/pistas (K1, K2, K3, GT, F1, Mujeres, Junior, etc.)
            sessionName: {
              $not: {
                $regex: /f\s?1|f\s?2|f\s?3|k\s?1|k\s?2|k\s?3|gt|mujeres|women|junior| m(?!\w)/i
              }
            }
          }
        },
        // Desenrollar drivers
        { $unwind: '$drivers' },
        // Solo tiempos válidos (> 0)
        { $match: { 'drivers.bestTime': { $gt: 0 } } },
        // Ordenar por mejor tiempo
        { $sort: { 'drivers.bestTime': 1 } },
        // Agrupar por piloto para obtener su mejor tiempo absoluto
        {
          $group: {
            _id: '$drivers.driverName',
            bestTime: { $first: '$drivers.bestTime' },
            kartNumber: { $first: '$drivers.kartNumber' },
            sessionName: { $first: '$sessionName' },
            sessionDate: { $first: '$sessionDate' },
            sessionId: { $first: '$_id' },
            position: { $first: '$drivers.position' },
            lapNumber: { $first: '$drivers.lapCount' }
          }
        },
        // Ordenar de nuevo por mejor tiempo
        { $sort: { bestTime: 1 } },
        // Limitar a top 10
        { $limit: 10 }
      ]);

      // Formatear para la UI
      const records = top10.map((entry, index) => ({
        _id: `${entry.sessionId}-${entry._id}`,
        sessionId: entry.sessionId, // Guardar sessionId para eliminar
        sessionName: entry.sessionName,
        driverName: entry._id,
        lapNumber: entry.lapNumber || 0,
        bestTime: entry.bestTime,
        lastTime: entry.bestTime, // No tenemos lastTime en aggregate
        kartNumber: entry.kartNumber,
        position: index + 1, // Posición en el top 10
        timestamp: entry.sessionDate?.toISOString() || new Date().toISOString(),
        isValid: true
      }));

      console.log(`✅ Found ${records.length} top 10 records`);

      return NextResponse.json({
        success: true,
        records,
        pagination: {
          page: 1,
          limit: 10,
          totalRecords: records.length,
          totalPages: 1
        },
        stats: {
          validCount: records.length,
          invalidCount: 0,
          totalCount: records.length
        }
      });
    }

    // NORMAL MODE: Todavía no implementado para históricos completos
    // Por ahora retornamos vacío
    console.log('⚠️ Normal mode not yet implemented for race_sessions_v0');

    return NextResponse.json({
      success: true,
      records: [],
      pagination: {
        page: 1,
        limit: 50,
        totalRecords: 0,
        totalPages: 0
      },
      stats: {
        validCount: 0,
        invalidCount: 0,
        totalCount: 0
      }
    });

  } catch (error) {
    console.error('❌ Error fetching lap times:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener registros',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un registro de tiempo de un piloto en una sesión
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ DELETE /api/admin/lap-times');

    // Verificar que sea admin
    const adminCheck = await verifyAdmin(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const driverName = searchParams.get('driverName');

    if (!sessionId || !driverName) {
      return NextResponse.json(
        { success: false, error: 'Se requiere sessionId y driverName' },
        { status: 400 }
      );
    }

    await connectDB();

    // Eliminar el driver del array de drivers en la sesión
    const result = await RaceSessionV0.findByIdAndUpdate(
      sessionId,
      { $pull: { drivers: { driverName } } },
      { new: true }
    );

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    console.log(`✅ Driver eliminado: ${driverName} de sesión ${sessionId}`);

    return NextResponse.json({
      success: true,
      message: `Registro de ${driverName} eliminado exitosamente`
    });

  } catch (error) {
    console.error('❌ Error deleting lap time:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar registro',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PATCH: Marcar registro como válido/inválido (TODO: Implementar para RaceSessionV0)
export async function PATCH(request: NextRequest) {
  try {
    console.log('✏️ PATCH /api/admin/lap-times');

    // Verificar que sea admin
    const adminCheck = await verifyAdmin(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Funcionalidad de validación aún no implementada para RaceSessionV0'
      },
      { status: 501 }
    );

  } catch (error) {
    console.error('❌ Error updating lap time:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar registro',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
