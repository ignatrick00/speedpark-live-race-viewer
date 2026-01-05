import { NextRequest, NextResponse } from 'next/server'
import { getStatsTracker } from '@/lib/stats-tracker'
import StatsService from '@/lib/statsService'
import { verifyAdminAccess } from '@/middleware/adminAuth'

export async function GET(request: NextRequest) {
  // Check admin access
  const adminCheck = await verifyAdminAccess(request);

  if (!adminCheck.isValid) {
    return NextResponse.json(
      {
        error: 'Access denied. Admin privileges required.',
        details: adminCheck.error
      },
      { status: 401 }
    );
  }
  try {
    // Get date range from query params
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const mode = searchParams.get('mode'); // 'daily', 'usage', 'heatmap'

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateParam) {
      startDate = new Date(startDateParam);
    }
    if (endDateParam) {
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999); // Incluir todo el día final
    }

    // Handle special modes
    if (mode === 'daily' && startDate && endDate) {
      const dailyRevenue = await StatsService.getDailyRevenue(startDate, endDate);
      return NextResponse.json({ dailyRevenue });
    }

    if (mode === 'usage' && startDate && endDate) {
      const usageAnalysis = await StatsService.getLowUsageAnalysis(startDate, endDate);
      return NextResponse.json({ usageAnalysis });
    }

    if (mode === 'heatmap' && startDate && endDate) {
      const heatmap = await StatsService.getUsageHeatmap(startDate, endDate);
      return NextResponse.json({ heatmap });
    }

    // Get stats from race_sessions_v0 (NEW)
    let v0Stats = null
    let recentSessions = []
    let error = null

    try {
      v0Stats = await StatsService.getCombinedStatsFromV0(startDate, endDate)
      recentSessions = await StatsService.getRecentSessions(20)
    } catch (v0Error) {
      console.warn('⚠️ V0 stats unavailable:', v0Error)
      error = 'V0 stats unavailable'

      // Fallback to JSON stats
      const tracker = await getStatsTracker()
      const jsonStats = await tracker.getStats()
      return NextResponse.json({
        ...jsonStats,
        sources: {
          v0: 'failed',
          json: 'available'
        },
        error
      })
    }

    // Return V0 stats with recent sessions
    return NextResponse.json({
      ...v0Stats,
      recentSessions: recentSessions.map(s => ({
        id: s.id,
        name: s.name,
        drivers: s.driversCount,
        revenue: s.revenue,
        timestamp: new Date(s.timestamp).toLocaleString('es-CL')
      })),
      dateRange: startDate && endDate ? {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      } : null,
      sources: {
        v0: 'available',
        json: 'deprecated'
      }
    })

  } catch (error) {
    console.error('❌ Error en API de estadísticas:', error)
    return NextResponse.json(
      { error: 'Error obteniendo estadísticas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Check admin access for POST operations
  const adminCheck = await verifyAdminAccess(request);
  
  if (!adminCheck.isValid) {
    return NextResponse.json(
      { 
        error: 'Access denied. Admin privileges required.',
        details: adminCheck.error 
      },
      { status: 401 }
    );
  }
  try {
    const { action, sessionName, drivers, smsData } = await request.json()
    
    if (action === 'record_session' && sessionName && drivers) {
      // Use new integrated service that saves to both JSON and MongoDB
      const result = await StatsService.recordSession(sessionName, drivers, smsData)
      
      console.log(`📊 Session recorded - JSON: ${result.jsonSession ? 'OK' : 'FAIL'}, MongoDB: ${result.mongoSession ? 'OK' : 'FAIL'}`)
      
      return NextResponse.json({ 
        success: true, 
        session: result.jsonSession,
        mongoSession: result.mongoSession,
        message: result.message,
        sources: {
          json: result.jsonSession ? 'recorded' : 'failed',
          mongo: result.mongoSession ? 'recorded' : 'failed',
        }
      })
    }
    
    if (action === 'reset_stats') {
      // Only reset JSON stats for now (MongoDB data should be preserved)
      const tracker = await getStatsTracker()
      await tracker.resetStats()
      return NextResponse.json({ 
        success: true, 
        message: 'JSON estadísticas reseteadas (MongoDB preservado)' 
      })
    }

    if (action === 'clean_duplicates') {
      // Only clean JSON duplicates for now
      const tracker = await getStatsTracker()
      await tracker.cleanDuplicates()
      return NextResponse.json({ 
        success: true, 
        message: 'JSON duplicados limpiados (MongoDB preservado)' 
      })
    }

    if (action === 'get_recent_sessions') {
      const sessions = await StatsService.getRecentSessions(20)
      return NextResponse.json({ 
        success: true, 
        sessions 
      })
    }
    
    return NextResponse.json(
      { error: 'Acción no válida' },
      { status: 400 }
    )
  } catch (error) {
    console.error('❌ Error en POST de estadísticas:', error)
    return NextResponse.json(
      { error: 'Error procesando solicitud', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}