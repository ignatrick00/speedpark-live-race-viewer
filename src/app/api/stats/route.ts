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
    // Always start with JSON stats to maintain compatibility
    const tracker = await getStatsTracker()
    const jsonStats = await tracker.getStats()
    
    // Try to enhance with MongoDB data
    let mongoStats = null
    let error = null
    
    try {
      const combinedStats = await StatsService.getCombinedStats()
      mongoStats = combinedStats.mongo
    } catch (mongoError) {
      console.warn('⚠️ MongoDB stats unavailable:', mongoError)
      error = 'MongoDB stats unavailable'
    }
    
    // Return JSON stats as base, enhanced with MongoDB info
    return NextResponse.json({
      // Core stats from JSON (ensures compatibility)
      ...jsonStats,
      
      // Enhanced info
      sources: {
        json: 'available',
        mongo: mongoStats ? 'available' : 'failed',
      },
      mongoStats,
      error
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