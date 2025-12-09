import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import RaceSessionV0 from '@/models/RaceSessionV0';
import WebUser from '@/models/WebUser';

/**
 * GET - Buscar carreras para asignar a eventos de escuderías
 * Query params:
 * - startDate: Fecha inicial (YYYY-MM-DD)
 * - endDate: Fecha final (YYYY-MM-DD)
 * - sessionType: Tipo de sesión (carrera, clasificacion, etc.)
 * - search: Búsqueda por nombre de sesión
 * - limit: Cantidad de resultados (default: 20)
 * - page: Página de resultados (default: 1)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Verificar autenticación
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
    };

    // Verificar que sea organizador
    const user = await WebUser.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const userRoles = (user as any).roles && Array.isArray((user as any).roles)
      ? (user as any).roles
      : ((user as any).role ? [(user as any).role] : ['user']);

    if (!userRoles.includes('organizer')) {
      return NextResponse.json(
        { error: 'Solo los organizadores pueden buscar carreras' },
        { status: 403 }
      );
    }

    // Obtener parámetros de búsqueda
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sessionType = searchParams.get('sessionType');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');

    // Construir query
    const query: any = {};

    // Filtrar por rango de fechas
    if (startDate || endDate) {
      query.sessionDate = {};
      if (startDate) {
        query.sessionDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.sessionDate.$lte = end;
      }
    }

    // Filtrar por tipo de sesión
    if (sessionType && sessionType !== 'all') {
      query.sessionType = sessionType;
    }

    // Buscar por nombre de sesión
    if (search && search.trim()) {
      query.sessionName = { $regex: search.trim(), $options: 'i' };
    }

    // Solo carreras procesadas
    query.processed = true;

    // Ejecutar query con paginación
    const skip = (page - 1) * limit;
    const [sessions, total] = await Promise.all([
      RaceSessionV0.find(query)
        .sort({ sessionDate: -1 })
        .skip(skip)
        .limit(limit)
        .select('sessionId sessionName sessionDate sessionType drivers totalDrivers totalLaps processed')
        .lean(),
      RaceSessionV0.countDocuments(query)
    ]);

    // Formatear resultados
    const formattedSessions = sessions.map((session: any) => ({
      sessionId: session.sessionId,
      sessionName: session.sessionName,
      sessionDate: session.sessionDate,
      sessionType: session.sessionType,
      totalDrivers: session.totalDrivers,
      totalLaps: session.totalLaps,
      processed: session.processed,
      // Extraer información básica de los pilotos sin incluir todas las vueltas
      driversPreview: (session.drivers || []).slice(0, 10).map((d: any) => ({
        driverName: d.driverName,
        finalPosition: d.finalPosition,
        kartNumber: d.kartNumber,
        bestTime: d.bestTime,
        totalLaps: d.totalLaps
      }))
    }));

    return NextResponse.json({
      success: true,
      sessions: formattedSessions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    console.error('Error searching race sessions:', error);
    return NextResponse.json(
      { error: 'Error al buscar carreras' },
      { status: 500 }
    );
  }
}
