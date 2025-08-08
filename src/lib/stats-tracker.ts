import { promises as fs } from 'fs'
import path from 'path'

export interface SessionData {
  id: string
  name: string
  drivers: string[] // Array de nombres de pilotos únicos
  timestamp: string
  revenue: number
}

export interface TopDriverData {
  driverName: string
  classificationsCount: number
  totalSpent: number
}

export interface StatsData {
  totalRaces: number
  totalDrivers: number
  driversToday: number
  revenueToday: number
  revenueTotal: number
  averageDriversPerRace: number
  lastUpdate: string
  recentSessions: Array<{
    id: string
    name: string
    drivers: number
    revenue: number
    timestamp: string
  }>
  sessions: SessionData[]
  uniqueDrivers: Set<string>
}

const STATS_FILE_PATH = path.join(process.cwd(), 'data', 'stats.json')
const PRICE_PER_DRIVER = 17000

class StatsTracker {
  private stats: StatsData

  constructor() {
    this.stats = {
      totalRaces: 0,
      totalDrivers: 0,
      driversToday: 0,
      revenueToday: 0,
      revenueTotal: 0,
      averageDriversPerRace: 0,
      lastUpdate: new Date().toLocaleString('es-CL'),
      recentSessions: [],
      sessions: [],
      uniqueDrivers: new Set()
    }
  }

  async init() {
    await this.ensureDataDirectory()
    await this.loadStats()
  }

  private async ensureDataDirectory() {
    const dataDir = path.dirname(STATS_FILE_PATH)
    try {
      await fs.access(dataDir)
    } catch {
      await fs.mkdir(dataDir, { recursive: true })
    }
  }

  private async loadStats() {
    try {
      const data = await fs.readFile(STATS_FILE_PATH, 'utf-8')
      const parsed = JSON.parse(data)
      
      // Reconstruct Set from array
      this.stats = {
        ...parsed,
        uniqueDrivers: new Set(parsed.uniqueDriversArray || [])
      }
      
      this.calculateDerivedStats()
    } catch (error) {
      console.log('📊 Creando archivo de estadísticas nuevo')
      await this.saveStats()
    }
  }

  private async saveStats() {
    try {
      // Convert Set to array for JSON serialization
      const dataToSave = {
        ...this.stats,
        uniqueDriversArray: Array.from(this.stats.uniqueDrivers)
      }
      delete (dataToSave as any).uniqueDrivers

      await fs.writeFile(STATS_FILE_PATH, JSON.stringify(dataToSave, null, 2))
    } catch (error) {
      console.error('❌ Error guardando estadísticas:', error)
    }
  }

  private calculateDerivedStats() {
    const today = new Date().toDateString()
    const todaySessions = this.stats.sessions.filter(session => 
      new Date(session.timestamp).toDateString() === today
    )

    // Calcular conductores únicos de hoy
    const todayDrivers = new Set<string>()
    todaySessions.forEach(session => {
      session.drivers.forEach(driver => todayDrivers.add(driver))
    })

    this.stats.totalRaces = this.stats.sessions.length
    this.stats.totalDrivers = this.stats.uniqueDrivers.size
    this.stats.driversToday = todayDrivers.size
    this.stats.revenueToday = this.stats.driversToday * PRICE_PER_DRIVER
    this.stats.revenueTotal = this.stats.totalDrivers * PRICE_PER_DRIVER
    this.stats.averageDriversPerRace = this.stats.totalRaces > 0 ? 
      this.stats.totalDrivers / this.stats.totalRaces : 0
    this.stats.lastUpdate = new Date().toLocaleString('es-CL')

    // Actualizar sesiones recientes (últimas 10)
    this.stats.recentSessions = this.stats.sessions
      .slice(-10)
      .reverse()
      .map(session => ({
        id: session.id,
        name: session.name,
        drivers: session.drivers.length,
        revenue: session.drivers.length * PRICE_PER_DRIVER,
        timestamp: new Date(session.timestamp).toLocaleTimeString('es-CL', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
      }))
  }

  async recordSession(sessionName: string, drivers: string[]) {
    try {
      // 🔍 VERIFICAR SI YA EXISTE ESTA SESIÓN HOY
      const today = new Date().toDateString()
      const sessionExistsToday = this.stats.sessions.some(session => 
        session.name === sessionName && 
        new Date(session.timestamp).toDateString() === today
      )
      
      if (sessionExistsToday) {
        console.log(`🔄 Sesión ya registrada hoy: ${sessionName}`)
        return // No duplicar la misma sesión del mismo día
      }
      
      // Filtrar solo conductores únicos válidos
      const uniqueSessionDrivers = [...new Set(drivers.filter(d => d && d.trim()))]
      
      if (uniqueSessionDrivers.length === 0) {
        console.log('⚠️ No hay conductores válidos para registrar')
        return
      }

      const sessionId = `session_${Date.now()}`
      const session: SessionData = {
        id: sessionId,
        name: sessionName,
        drivers: uniqueSessionDrivers,
        timestamp: new Date().toISOString(),
        revenue: uniqueSessionDrivers.length * PRICE_PER_DRIVER
      }

      // Agregar conductores al set global
      uniqueSessionDrivers.forEach(driver => {
        this.stats.uniqueDrivers.add(driver)
      })

      // Agregar sesión
      this.stats.sessions.push(session)

      // Recalcular estadísticas derivadas
      this.calculateDerivedStats()

      // Guardar en archivo
      await this.saveStats()

      console.log(`📊 Sesión registrada: ${sessionName} - ${uniqueSessionDrivers.length} conductores`)
      
      return session
    } catch (error) {
      console.error('❌ Error registrando sesión:', error)
      throw error
    }
  }

  async getStats() {
    this.calculateDerivedStats()
    
    // Retornar datos sin el Set (que no es serializable)
    const { uniqueDrivers, sessions, ...publicStats } = this.stats
    return {
      ...publicStats,
      hourlyRevenue: this.getHourlyRevenue(),
      topDriversThisMonth: this.getTopDriversThisMonth()
    }
  }

  // Método para obtener ganancias por hora del día actual
  private getHourlyRevenue() {
    const today = new Date().toDateString()
    const todaySessions = this.stats.sessions.filter(session => 
      new Date(session.timestamp).toDateString() === today
    )

    // Inicializar array de 12 hrs a 23 hrs
    const hourlyData: { hour: number, revenue: number, sessions: number }[] = []
    for (let hour = 12; hour <= 23; hour++) {
      hourlyData.push({ hour, revenue: 0, sessions: 0 })
    }

    // Agrupar sesiones por hora
    todaySessions.forEach(session => {
      const sessionHour = new Date(session.timestamp).getHours()
      if (sessionHour >= 12 && sessionHour <= 23) {
        const hourIndex = sessionHour - 12
        hourlyData[hourIndex].revenue += session.revenue
        hourlyData[hourIndex].sessions += 1
      }
    })

    return hourlyData
  }

  // Método para obtener top 10 corredores del mes actual
  private getTopDriversThisMonth(): TopDriverData[] {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    // Filtrar solo clasificaciones del mes actual
    const thisMonthClassifications = this.stats.sessions.filter(session => {
      const sessionDate = new Date(session.timestamp)
      const isClassification = session.name.toLowerCase().includes('clasificacion')
      return isClassification && 
             sessionDate.getMonth() === currentMonth && 
             sessionDate.getFullYear() === currentYear
    })

    // Crear mapa de corredores con sus participaciones
    const driverStats = new Map<string, number>()
    
    thisMonthClassifications.forEach(session => {
      session.drivers.forEach(driverName => {
        const currentCount = driverStats.get(driverName) || 0
        driverStats.set(driverName, currentCount + 1)
      })
    })

    // Convertir a array, calcular gasto y ordenar
    const topDrivers: TopDriverData[] = Array.from(driverStats.entries())
      .map(([driverName, classificationsCount]) => ({
        driverName,
        classificationsCount,
        totalSpent: classificationsCount * PRICE_PER_DRIVER
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent) // Ordenar por gasto descendente
      .slice(0, 10) // Top 10

    return topDrivers
  }

  async resetStats() {
    this.stats = {
      totalRaces: 0,
      totalDrivers: 0,
      driversToday: 0,
      revenueToday: 0,
      revenueTotal: 0,
      averageDriversPerRace: 0,
      lastUpdate: new Date().toLocaleString('es-CL'),
      recentSessions: [],
      sessions: [],
      uniqueDrivers: new Set()
    }
    
    await this.saveStats()
    console.log('📊 Estadísticas reseteadas')
  }

  // Método para verificar si una sesión ya fue registrada
  isSessionRecorded(sessionName: string): boolean {
    return this.stats.sessions.some(session => session.name === sessionName)
  }

  // Método para limpiar duplicados existentes
  async cleanDuplicates() {
    const uniqueSessions: SessionData[] = []
    const seenToday = new Set<string>()
    
    // Procesar sesiones desde la más reciente a la más antigua
    for (const session of [...this.stats.sessions].reverse()) {
      const sessionDate = new Date(session.timestamp).toDateString()
      const sessionKey = `${session.name}_${sessionDate}`
      
      if (!seenToday.has(sessionKey)) {
        seenToday.add(sessionKey)
        uniqueSessions.unshift(session) // Agregar al inicio para mantener orden cronológico
      } else {
        console.log(`🗑️ Eliminando duplicado: ${session.name}`)
      }
    }
    
    this.stats.sessions = uniqueSessions
    this.calculateDerivedStats()
    await this.saveStats()
    console.log(`✨ Duplicados limpiados. Sesiones únicas: ${uniqueSessions.length}`)
  }
}

// Singleton instance
let statsTracker: StatsTracker | null = null

export async function getStatsTracker(): Promise<StatsTracker> {
  if (!statsTracker) {
    statsTracker = new StatsTracker()
    await statsTracker.init()
  }
  return statsTracker
}

export { StatsTracker }