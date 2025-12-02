'use client'

import { useState, useEffect } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useAuth } from '@/hooks/useAuth'
import Navbar from '@/components/Navbar'
import TopDriversDaySidebar from '@/components/TopDriversDaySidebar'
import TopDriversDay from '@/components/TopDriversDay'
import TopDriversWeek from '@/components/TopDriversWeek'
import TopDriversMonth from '@/components/TopDriversMonth'
import TopDriversAllTime from '@/components/TopDriversAllTime'
import KartRecordsSelector from '@/components/KartRecordsSelector'
import RaceBrowser from '@/components/RaceBrowser'

interface Driver {
  pos: number
  name: string
  kart: number
  lap: number
  bestTime: string
  lastTime: string
  avgTime: string
  gap: string
}

interface DailyBestTime {
  pos: number
  name: string
  time: string
  details: string
}

const mockDrivers: Driver[] = [
  { pos: 1, name: "Break Pitt", kart: 12, lap: 15, bestTime: "0:42.157", lastTime: "0:42.890", avgTime: "0:43.245", gap: "--" },
  { pos: 2, name: "Speed Demon", kart: 8, lap: 14, bestTime: "0:42.456", lastTime: "0:43.120", avgTime: "0:43.567", gap: "+0.299" },
  { pos: 3, name: "Lightning Luke", kart: 3, lap: 15, bestTime: "0:42.789", lastTime: "0:43.445", avgTime: "0:43.890", gap: "+0.632" },
  { pos: 4, name: "Turbo Tom", kart: 15, lap: 13, bestTime: "0:43.012", lastTime: "0:43.789", avgTime: "0:44.123", gap: "+0.855" },
  { pos: 5, name: "Racing Rachel", kart: 7, lap: 14, bestTime: "0:43.345", lastTime: "0:44.012", avgTime: "0:44.456", gap: "+1.188" },
]

const mockDailyBest: DailyBestTime[] = [
  { pos: 1, name: "Break Pitt", time: "0:42.157", details: "Kart #12 • 14:25" },
  { pos: 2, name: "Speed King", time: "0:42.445", details: "Kart #5 • 13:40" },
  { pos: 3, name: "Velocity V", time: "0:42.789", details: "Kart #8 • 15:12" },
  { pos: 4, name: "Thunder T", time: "0:43.023", details: "Kart #11 • 12:55" },
  { pos: 5, name: "Flash F", time: "0:43.456", details: "Kart #2 • 16:30" },
]

export default function LiveRaceViewer() {
  // ✅ USAR HOOK WEBSOCKET EN LUGAR DE MOCK DATA
  const { isConnected, raceData, error, retryCount, reconnect } = useWebSocket()
  
  // Auth hooks
  const { user, logout, isLoading } = useAuth()
  
  // Estado local (mantener el timer)
  const [sessionTime, setSessionTime] = useState("00:00")
  
  // 🆕 Estado para mejores tiempos desde MongoDB
  const [dailyBest, setDailyBest] = useState<DailyBestTime[]>([])
  const [bestTimesLoading, setBestTimesLoading] = useState(true)
  const [bestTimesError, setBestTimesError] = useState<string | null>(null)
  const [bestTimesFirstLoad, setBestTimesFirstLoad] = useState(true)

  // 🆕 Estado para mejores karts desde MongoDB
  const [kartRanking, setKartRanking] = useState<Array<{kart: number, time: string, driver: string}>>([])
  const [kartsLoading, setKartsLoading] = useState(true)
  const [kartsError, setKartsError] = useState<string | null>(null)
  const [kartsFirstLoad, setKartsFirstLoad] = useState(true)
  
  // Estados derivados de WebSocket (mantener para datos en tiempo real)
  const isLive = isConnected && !!raceData
  const activeDrivers = raceData?.activeDrivers || 0
  const drivers = raceData?.drivers || []
  const bestLap = raceData?.bestLap || "--:--.---"
  const totalLaps = raceData?.totalLaps || 0
  const averageTime = raceData?.averageTime || "--:--.---"

  // 🆕 Función para obtener mejores tiempos desde MongoDB
  const fetchBestTimes = async () => {
    try {
      // Only show loading on first load, not on refreshes
      if (bestTimesFirstLoad) {
        setBestTimesLoading(true)
      }
      setBestTimesError(null)

      const response = await fetch('/api/best-times')
      const data = await response.json()

      if (data.success) {
        setDailyBest(data.bestTimes)
        console.log(`🏆 Loaded ${data.bestTimes.length} best times from MongoDB`)
      } else {
        setBestTimesError(data.error || 'Error loading best times')
        console.error('❌ Error fetching best times:', data.error)
      }
    } catch (error) {
      setBestTimesError('Connection error')
      console.error('❌ Fetch error:', error)
    } finally {
      if (bestTimesFirstLoad) {
        setBestTimesLoading(false)
        setBestTimesFirstLoad(false)
      }
    }
  }

  // 🆕 Función para obtener mejores karts desde MongoDB
  const fetchBestKarts = async () => {
    try {
      // Only show loading on first load, not on refreshes
      if (kartsFirstLoad) {
        setKartsLoading(true)
      }
      setKartsError(null)

      const response = await fetch('/api/best-karts-v2?filter=day')
      const data = await response.json()

      if (data.success) {
        setKartRanking(data.bestKarts)
        console.log(`🏎️ [V2] Loaded ${data.bestKarts.length} best karts from driver_race_data`)
      } else {
        setKartsError(data.error || 'Error loading best karts')
        console.error('❌ Error fetching best karts:', data.error)
      }
    } catch (error) {
      setKartsError('Connection error')
      console.error('❌ Fetch error:', error)
    } finally {
      if (kartsFirstLoad) {
        setKartsLoading(false)
        setKartsFirstLoad(false)
      }
    }
  }

  // Auth handlers
  // 🆕 useEffect para cargar mejores tiempos y karts desde MongoDB
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        await fetchBestTimes();
        await fetchBestKarts();
      }
    };

    // Cargar datos iniciales
    loadData();

    // Actualizar cada 30 segundos
    const dataInterval = setInterval(() => {
      if (isMounted) {
        loadData();
      }
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(dataInterval);
    };
  }, [])

  useEffect(() => {
    // Optimized timer - no dependencies to prevent re-creation
    const interval = setInterval(() => {
      setSessionTime(prevTime => {
        const [minutes, seconds] = prevTime.split(':').map(Number)
        const totalSeconds = minutes * 60 + seconds + 1
        const newMinutes = Math.floor(totalSeconds / 60)
        const newSeconds = totalSeconds % 60
        return `${newMinutes}:${newSeconds.toString().padStart(2, '0')}`
      })
    }, 1000)

    return () => clearInterval(interval)
  }, []) // Empty deps - timer created only once

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden relative">
      {/* Optimized Background Effects */}
      <div className="fixed inset-0 z-0 will-change-auto">
        {/* Simplified grid - less GPU intensive */}
        <div 
          className="absolute inset-0 opacity-20" 
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(0, 212, 255, 0.1) 2px, transparent 2px)',
            backgroundSize: '100px 100px'
          }}
        />
        {/* Optimized glows - reduced blur and using transform3d for GPU acceleration */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-2xl animate-pulse transform-gpu"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-400/15 rounded-full blur-2xl animate-pulse transform-gpu" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Navigation Bar */}
      <Navbar />

      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto p-8">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="font-racing text-6xl md:text-8xl mb-4 tracking-wider bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent" style={{
            textShadow: '0 0 30px rgba(0, 87, 184, 0.5)'
          }}>
            🏁 SPEEDPARK
          </h1>
          <div className="flex items-center gap-4">
            <div className={`inline-flex items-center gap-2 ${isLive ? 'text-cyan-400' : error ? 'text-red-400' : 'text-yellow-400'} font-digital font-bold text-lg uppercase tracking-wider`}>
              <div className={`w-3 h-3 rounded-full ${
                isLive ? 'bg-cyan-400 animate-pulse' : 
                error ? 'bg-red-400' : 
                'bg-yellow-400 animate-pulse'
              }`} style={{
                boxShadow: isLive ? '0 0 20px #00FFFF' : 
                         error ? '0 0 20px #FF6B6B' : 
                         '0 0 20px #FFFF00'
              }}></div>
              {isLive ? 'EN VIVO - SMS TIMING' : 
               error ? 'ERROR DE CONEXIÓN' : 
               'CONECTANDO...'}
            </div>
            
            {error && (
              <button 
                onClick={reconnect}
                className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-sm hover:bg-blue-500/30 transition-colors">
                Reintentar ({retryCount > 0 ? `Intento ${retryCount}` : 'Conectar'})
              </button>
            )}
          </div>
          <p className="text-blue-300 mt-4 text-lg tracking-wide">SPEEDPARK KARTING CHAMPIONSHIP</p>
        </header>

        {/* Statistics Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="bg-black/30 backdrop-blur-sm border border-cyan-400/30 rounded-2xl p-6 text-center relative hover:border-cyan-400/50 transition-colors">
            <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">Sesión Actual</p>
            <p className="font-digital text-2xl text-white font-bold mb-2">SpeedPark Live</p>
            <p className="text-blue-300 text-xs uppercase tracking-wider">NOMBRE</p>
          </div>

          <div className="bg-black/30 backdrop-blur-sm border border-blue-400/30 rounded-2xl p-6 text-center relative hover:border-blue-400/50 transition-colors">
            <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">Pilotos Activos</p>
            <p className="font-digital text-2xl text-white font-bold mb-2">{activeDrivers}</p>
            <p className="text-blue-300 text-xs uppercase tracking-wider">EN PISTA</p>
          </div>

          <div className="bg-black/30 backdrop-blur-sm border border-blue-400/30 rounded-2xl p-6 text-center relative hover:border-blue-400/50 transition-colors">
            <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">Tiempo Activo</p>
            <p className="font-digital text-2xl text-white font-bold mb-2">{sessionTime}</p>
            <p className="text-blue-300 text-xs uppercase tracking-wider">MM:SS</p>
          </div>

          <div className="bg-black/30 backdrop-blur-sm border border-blue-400/30 rounded-2xl p-6 text-center relative hover:border-blue-400/50 transition-colors">
            <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">Mejor Vuelta Global</p>
            <p className="font-digital text-2xl text-white font-bold mb-2">{bestLap}</p>
            <p className="text-blue-300 text-xs uppercase tracking-wider">M:SS.mmm</p>
          </div>
        </section>

        {/* Main Race Section */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-8 items-start">
          {/* Live Leaderboard Table */}
          <section className="bg-gradient-to-br from-slate-900/50 to-blue-900/30 backdrop-blur-sm border border-blue-800/30 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-cyan-400/5 to-blue-600/5 rounded-2xl"></div>
            
            <div className="relative z-10">
              <h2 className="font-racing text-3xl text-white mb-8 tracking-wider">
                🏆 <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-400 to-white" style={{
                  textShadow: '0 0 10px rgba(135, 206, 235, 0.8), 0 0 20px rgba(0, 87, 184, 0.4)'
                }}>Posiciones en Tiempo Real</span>
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-spacing-y-2">
                  <thead>
                    <tr className="border-b-2 border-blue-800/30">
                      <th className="text-left py-4 px-2 font-racing text-sky-400 tracking-wider uppercase text-sm" style={{ width: '60px' }}>POS</th>
                      <th className="text-left py-4 px-4 font-racing text-sky-400 tracking-wider uppercase text-sm">PILOTO</th>
                      <th className="text-right py-4 px-4 font-racing text-sky-400 tracking-wider uppercase text-sm">KART</th>
                      <th className="text-right py-4 px-4 font-racing text-sky-400 tracking-wider uppercase text-sm">VUELTA</th>
                      <th className="text-right py-4 px-4 font-racing text-sky-400 tracking-wider uppercase text-sm">MEJOR TIEMPO</th>
                      <th className="text-right py-4 px-4 font-racing text-sky-400 tracking-wider uppercase text-sm">ÚLTIMA VUELTA</th>
                      <th className="text-right py-4 px-4 font-racing text-sky-400 tracking-wider uppercase text-sm">PROMEDIO</th>
                      <th className="text-right py-4 px-4 font-racing text-sky-400 tracking-wider uppercase text-sm">DIFERENCIA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.length > 0 ? drivers.map((driver) => (
                      <tr 
                        key={driver.pos}
                        className="bg-black/40 hover:bg-blue-900/20 transition-all duration-300 hover:transform hover:translate-x-2"
                      >
                        <td className="py-4 px-2">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${
                            driver.pos === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-lg shadow-yellow-400/60' :
                            driver.pos === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black shadow-lg shadow-gray-400/60' :
                            driver.pos === 3 ? 'bg-gradient-to-br from-orange-600 to-orange-800 text-white shadow-lg shadow-orange-600/60' :
                            'bg-blue-900/30 text-white border border-cyan-400'
                          }`}>
                            {driver.pos}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-racing text-white text-lg font-semibold uppercase tracking-wide">{driver.name}</div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="font-digital text-sky-400 font-bold">#{driver.kart}</div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="font-digital text-white">{driver.lap}</div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="font-digital text-cyan-400 text-lg font-bold">{driver.bestTime}</div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="font-digital text-blue-300">{driver.lastTime}</div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="font-digital text-blue-300">{driver.avgTime}</div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className={`font-digital font-bold ${driver.gap === '--' ? 'text-green-400' : 'text-orange-400'}`}>
                            {driver.gap}
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center">
                          <div className="text-blue-300">
                            {error ? (
                              <div>
                                <div className="text-red-400 mb-2">❌ Error: {error}</div>
                                <button onClick={reconnect} className="text-cyan-400 hover:text-white transition-colors">
                                  🔄 Reintentar conexión
                                </button>
                              </div>
                            ) : !isConnected ? (
                              <div className="animate-pulse">
                                🔄 Conectando a SMS-Timing...
                              </div>
                            ) : (
                              <div>
                                ⏳ Esperando datos de carrera...
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Sidebar with both sections */}
          <div className="space-y-6">
            {/* Top 10 Drivers of the Day - Sidebar Version */}
            <TopDriversDaySidebar />

            {/* Kart Ranking Sidebar */}
            <section className="bg-black/30 backdrop-blur-sm border border-blue-800/30 rounded-2xl p-6 h-fit">
              <h3 className="font-racing text-2xl text-white mb-6 tracking-wider">
                🏎️ <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-400 to-white">Mejores Karts del Día</span>
              </h3>

              <div className="space-y-3">
                {kartRanking.length > 0 ? kartRanking.slice(0, 10).map((kart, index) => (
                  <div 
                    key={`kart-${kart.kart}`}
                    className={`flex items-center justify-between p-3 bg-black/30 rounded-xl border-l-3 transition-all duration-300 hover:bg-blue-900/10 hover:transform hover:translate-x-1 ${
                      index === 0 ? 'border-l-yellow-400 bg-gradient-to-r from-yellow-400/10 to-black/30' :
                      index === 1 ? 'border-l-gray-300 bg-gradient-to-r from-gray-300/10 to-black/30' :
                      index === 2 ? 'border-l-orange-600 bg-gradient-to-r from-orange-600/10 to-black/30' :
                      'border-l-blue-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-lg shadow-yellow-400/60' :
                        index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black shadow-lg shadow-gray-400/60' :
                        index === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-800 text-white shadow-lg shadow-orange-600/60' :
                        'bg-blue-900/30 text-white border border-cyan-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-racing text-white font-semibold uppercase tracking-wide text-sm">Kart #{kart.kart}</div>
                        <div className="text-sky-400 text-xs">{kart.driver}</div>
                      </div>
                    </div>
                    <div className="font-digital text-cyan-400 text-lg font-bold">{kart.time}</div>
                  </div>
                )) : (
                  <div className="text-center text-blue-300 py-4">
                    {kartsError ? 'Error cargando karts' : 
                     kartsLoading ? 'Cargando mejores karts...' : 
                     'No hay datos de karts disponibles'}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Bottom Information Cards */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
          {/* Session Info Card */}
          <div className="bg-black/30 backdrop-blur-sm border border-blue-800/30 rounded-2xl p-6">
            <h3 className="font-racing text-2xl text-white mb-6 tracking-wider">
              📊 <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-400 to-white">Información de Sesión</span>
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-blue-300 text-sm uppercase tracking-wider">Circuito:</span>
                <span className="font-digital text-white font-bold">SpeedPark</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-300 text-sm uppercase tracking-wider">Sesión:</span>
                <span className="font-digital text-white font-bold">{raceData?.sessionName || 'Práctica Libre'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-300 text-sm uppercase tracking-wider">Tiempo Activo:</span>
                <span className="font-digital text-white font-bold">{sessionTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-300 text-sm uppercase tracking-wider">Sesiones Guardadas:</span>
                <span className="font-digital text-white font-bold">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-300 text-sm uppercase tracking-wider">Estado:</span>
                <span className="inline-flex px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                  ACTIVA
                </span>
              </div>
              <div className="mt-6">
                <button className="inline-flex px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-blue-600/30 transition-all">
                  📋 Ver Historial
                </button>
              </div>
            </div>
          </div>

          {/* Track Records Card */}
          <div className="bg-black/30 backdrop-blur-sm border border-blue-800/30 rounded-2xl p-6">
            <h3 className="font-racing text-2xl text-white mb-6 tracking-wider">
              🎯 <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-400 to-white">Récords del Circuito</span>
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-blue-300 text-sm uppercase tracking-wider">Récord Absoluto:</span>
                <span className="font-digital text-cyan-400 font-bold text-lg">{bestLap !== "--:--.---" ? bestLap : "0:42.157"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-300 text-sm uppercase tracking-wider">Mejor Hoy:</span>
                <span className="font-digital text-yellow-400 font-bold">{bestLap}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-300 text-sm uppercase tracking-wider">Promedio General:</span>
                <span className="font-digital text-white font-bold">
                  {averageTime !== "--:--.---" && averageTime ? 
                    (() => {
                      // Formatear tiempo quitando decimales extras
                      // Ejemplo: "0:48.109.75" -> "0:48.109"
                      const timeStr = averageTime.toString()
                      
                      // Si hay múltiples puntos, quedarse solo con el primero
                      const firstDotIndex = timeStr.indexOf('.')
                      if (firstDotIndex !== -1) {
                        const beforeFirstDot = timeStr.substring(0, firstDotIndex)
                        const afterFirstDot = timeStr.substring(firstDotIndex + 1)
                        // Tomar solo números después del primer punto (máximo 3)
                        const decimals = afterFirstDot.replace(/[^\d]/g, '').substring(0, 3)
                        return `${beforeFirstDot}.${decimals}`
                      }
                      
                      return timeStr
                    })() 
                    : "--:--.---"
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-300 text-sm uppercase tracking-wider">Total Vueltas:</span>
                <span className="font-digital text-white font-bold">{totalLaps}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Top 10 Driver Rankings - 4 Categories */}
        <section className="mt-12">
          <h2 className="font-racing text-3xl text-white mb-8 text-center tracking-wider">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-400 to-white">
              🏆 Rankings de Pilotos
            </span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TopDriversDay />
            <TopDriversWeek />
            <TopDriversMonth />
            <TopDriversAllTime />
          </div>
        </section>

        {/* Kart Records Section */}
        <section className="mt-12">
          <KartRecordsSelector />
        </section>

        {/* Race Browser Section */}
        <section className="mt-12">
          <RaceBrowser />
        </section>
      </div>
    </div>
  )
}