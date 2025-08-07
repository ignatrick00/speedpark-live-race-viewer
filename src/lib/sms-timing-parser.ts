// Tipos para tu estructura actual (basado en mockDrivers)
export interface DriverData {
  pos: number
  name: string
  kart: number
  lap: number
  bestTime: string
  lastTime: string
  avgTime: string
  gap: string
}

export interface DailyBestTime {
  pos: number
  name: string
  time: string
  details: string
}

export interface KartBestTime {
  kart: number
  time: string
  driver: string
  session: string
}

export interface ParsedSMSData {
  sessionName: string
  drivers: DriverData[]
  dailyBest: DailyBestTime[]
  kartRanking: KartBestTime[]
  activeDrivers: number
  bestLap: string
  totalLaps: number
  averageTime: string
}

// Parser que convierte formato SMS-Timing a tu estructura
export function parseSMSTimingData(rawData: string): ParsedSMSData | null {
  try {
    // Si no hay datos o están vacíos
    if (!rawData || rawData.trim() === '' || rawData === '{}') {
      return null
    }

    const data = JSON.parse(rawData)
    
    // Debug: mostrar estructura real de datos
    console.log('📊 Estructura SMS recibida:', {
      tieneN: !!data.N,
      tieneD: !!data.D,
      esArray: Array.isArray(data.D),
      claves: Object.keys(data),
      sessionName: data.N
    })
    
    // Formato SMS-Timing: { "N": "session name", "D": [...drivers] }
    if (!data.N || !data.D || !Array.isArray(data.D)) {
      console.log('❌ Formato SMS incorrecto')
      return null
    }

    console.log('✅ Procesando', data.D.length, 'pilotos de la sesión:', data.N)

    const drivers: DriverData[] = data.D.map((driver: any, index: number) => ({
      pos: driver.P || (index + 1),
      name: driver.N || 'Unknown',
      kart: parseInt(driver.K) || 0,
      lap: driver.L || 0,
      bestTime: formatTime(driver.B || 0),
      lastTime: formatTime(driver.T || 0),
      avgTime: formatTime(driver.A || 0),
      gap: driver.G || '--'
    }))

    // Crear dailyBest basado en mejores tiempos
    const dailyBest: DailyBestTime[] = drivers
      .filter(d => d.bestTime !== '--:--.---')
      .sort((a, b) => timeToMs(a.bestTime) - timeToMs(b.bestTime))
      .slice(0, 5)
      .map((driver, index) => ({
        pos: index + 1,
        name: driver.name,
        time: driver.bestTime,
        details: `Kart #${driver.kart} • Vuelta ${driver.lap}`
      }))

    // Crear ranking por kart (mejores tiempos de cada kart)
    const kartMap = new Map<number, DriverData>()
    
    // Para cada kart, encontrar el mejor tiempo
    drivers.forEach(driver => {
      if (driver.bestTime !== '--:--.---') {
        const existingKart = kartMap.get(driver.kart)
        if (!existingKart || timeToMs(driver.bestTime) < timeToMs(existingKart.bestTime)) {
          kartMap.set(driver.kart, driver)
        }
      }
    })

    // Convertir a array y ordenar por tiempo
    const kartRanking: KartBestTime[] = Array.from(kartMap.values())
      .sort((a, b) => timeToMs(a.bestTime) - timeToMs(b.bestTime))
      .map(driver => ({
        kart: driver.kart,
        time: driver.bestTime,
        driver: driver.name,
        session: data.N
      }))

    // Calcular estadísticas
    const bestLap = drivers.length > 0 ? 
      drivers.reduce((best, current) => 
        timeToMs(current.bestTime) < timeToMs(best.bestTime) ? current : best
      ).bestTime : '0:00.000'

    const totalLaps = drivers.reduce((sum, driver) => sum + driver.lap, 0)
    
    const validTimes = drivers.filter(d => d.avgTime !== '--:--.---')
    const averageTime = validTimes.length > 0 ? 
      formatTime(validTimes.reduce((sum, driver) => sum + timeToMs(driver.avgTime), 0) / validTimes.length) : 
      '0:00.000'

    return {
      sessionName: data.N,
      drivers: drivers,
      dailyBest: dailyBest,
      kartRanking: kartRanking,
      activeDrivers: drivers.length,
      bestLap,
      totalLaps,
      averageTime
    }
  } catch (error) {
    console.error('❌ Error parsing SMS data:', error)
    return null
  }
}

// Utility: Convertir milisegundos a formato "M:SS.mmm"
function formatTime(milliseconds: number): string {
  if (milliseconds === 0 || !milliseconds) return '--:--.---'
  
  const minutes = Math.floor(milliseconds / 60000)
  const seconds = Math.floor((milliseconds % 60000) / 1000)
  const ms = milliseconds % 1000
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}

// Utility: Convertir tiempo a milisegundos para comparar
function timeToMs(timeString: string): number {
  if (timeString === '--:--.---') return Infinity
  
  const parts = timeString.split(':')
  const minutes = parseInt(parts[0])
  const secondsParts = parts[1].split('.')
  const seconds = parseInt(secondsParts[0])
  const milliseconds = parseInt(secondsParts[1])
  
  return (minutes * 60000) + (seconds * 1000) + milliseconds
}

