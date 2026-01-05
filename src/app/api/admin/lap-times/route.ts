import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import LapRecord from '@/models/LapRecord';
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const filterValid = searchParams.get('valid'); // 'true', 'false', or null (all)
    const filterDriver = searchParams.get('driver');
    const filterSession = searchParams.get('session');
    const filterDateFrom = searchParams.get('dateFrom');
    const filterDateTo = searchParams.get('dateTo');
    const sortBy = searchParams.get('sortBy') || 'date'; // 'date' or 'bestTime'
    const top10Mode = searchParams.get('top10') === 'true'; // Top 10 histórico

    await connectDB();

    // Construir query
    const query: any = {};

    // En modo Top 10, forzar solo válidos
    if (top10Mode) {
      query.isValid = true;
      query.bestTime = { $gt: 0 }; // Solo tiempos reales
    } else if (filterValid !== null && filterValid !== undefined) {
      query.isValid = filterValid === 'true';
    }

    if (filterDriver) {
      query.driverName = { $regex: filterDriver, $options: 'i' };
    }

    if (filterSession) {
      query.sessionName = { $regex: filterSession, $options: 'i' };
    }

    if (filterDateFrom || filterDateTo) {
      query.timestamp = {};
      if (filterDateFrom) {
        query.timestamp.$gte = new Date(filterDateFrom);
      }
      if (filterDateTo) {
        const endDate = new Date(filterDateTo);
        endDate.setHours(23, 59, 59, 999);
        query.timestamp.$lte = endDate;
      }
    }

    // Determinar ordenamiento
    const sortOption = sortBy === 'bestTime'
      ? { bestTime: 1 } // Ascendente (mejores primero)
      : { timestamp: -1 }; // Descendente (más recientes primero)

    // Obtener registros con paginación
    const skip = top10Mode ? 0 : (page - 1) * limit;
    const recordLimit = top10Mode ? 10 : limit;

    const [records, totalRecords, validCount, invalidCount] = await Promise.all([
      LapRecord.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(recordLimit)
        .lean(),
      LapRecord.countDocuments(query),
      LapRecord.countDocuments({ ...query, isValid: true }),
      LapRecord.countDocuments({ ...query, isValid: false })
    ]);

    console.log(`✅ Found ${totalRecords} records (${validCount} valid, ${invalidCount} invalid)`);

    return NextResponse.json({
      success: true,
      records,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit)
      },
      stats: {
        validCount,
        invalidCount,
        totalCount: totalRecords
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

// DELETE: Eliminar un registro de tiempo
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
    const recordId = searchParams.get('id');

    if (!recordId) {
      return NextResponse.json(
        { success: false, error: 'ID de registro requerido' },
        { status: 400 }
      );
    }

    await connectDB();

    const deletedRecord = await LapRecord.findByIdAndDelete(recordId);

    if (!deletedRecord) {
      return NextResponse.json(
        { success: false, error: 'Registro no encontrado' },
        { status: 404 }
      );
    }

    console.log(`✅ Registro eliminado: ${recordId} (${deletedRecord.driverName})`);

    return NextResponse.json({
      success: true,
      message: 'Registro eliminado exitosamente',
      deletedRecord: {
        id: deletedRecord._id,
        driverName: deletedRecord.driverName,
        sessionName: deletedRecord.sessionName,
        bestTime: deletedRecord.bestTime
      }
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

// PATCH: Marcar registro como válido/inválido
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

    const body = await request.json();
    const { recordId, isValid, invalidReason } = body;

    if (!recordId) {
      return NextResponse.json(
        { success: false, error: 'ID de registro requerido' },
        { status: 400 }
      );
    }

    if (isValid === undefined) {
      return NextResponse.json(
        { success: false, error: 'Campo isValid requerido' },
        { status: 400 }
      );
    }

    await connectDB();

    const updates: any = {
      isValid,
      validatedAt: new Date()
    };

    if (!isValid && invalidReason) {
      updates.invalidReason = invalidReason;
    }

    const updatedRecord = await LapRecord.findByIdAndUpdate(
      recordId,
      updates,
      { new: true }
    );

    if (!updatedRecord) {
      return NextResponse.json(
        { success: false, error: 'Registro no encontrado' },
        { status: 404 }
      );
    }

    console.log(`✅ Registro actualizado: ${recordId} - isValid: ${isValid}`);

    return NextResponse.json({
      success: true,
      message: 'Registro actualizado exitosamente',
      record: updatedRecord
    });

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
