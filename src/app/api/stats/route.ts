import { NextResponse } from 'next/server'
import { getStatsTracker } from '@/lib/stats-tracker'

export async function GET() {
  try {
    const tracker = await getStatsTracker()
    const stats = await tracker.getStats()
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('❌ Error en API de estadísticas:', error)
    return NextResponse.json(
      { error: 'Error obteniendo estadísticas' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { action, sessionName, drivers } = await request.json()
    const tracker = await getStatsTracker()
    
    if (action === 'record_session' && sessionName && drivers) {
      const session = await tracker.recordSession(sessionName, drivers)
      return NextResponse.json({ success: true, session })
    }
    
    if (action === 'reset_stats') {
      await tracker.resetStats()
      return NextResponse.json({ success: true, message: 'Estadísticas reseteadas' })
    }

    if (action === 'clean_duplicates') {
      await tracker.cleanDuplicates()
      return NextResponse.json({ success: true, message: 'Duplicados limpiados' })
    }
    
    return NextResponse.json(
      { error: 'Acción no válida' },
      { status: 400 }
    )
  } catch (error) {
    console.error('❌ Error en POST de estadísticas:', error)
    return NextResponse.json(
      { error: 'Error procesando solicitud' },
      { status: 500 }
    )
  }
}