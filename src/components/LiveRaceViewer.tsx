'use client'

import { useState, useEffect } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useAuth } from '@/hooks/useAuth'
import Navbar from '@/components/Navbar'
import TopDriversDayV0 from '@/components/TopDriversDayV0'
import TopKartsDayV0 from '@/components/TopKartsDayV0'
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

  // Estado para hora actual de Chile
  const [currentTime, setCurrentTime] = useState("")

  // Estados para mejores tiempos del día
  const [dailyBest, setDailyBest] = useState<DailyBestTime[]>([])
  const [bestTimesLoading, setBestTimesLoading] = useState(true)
  const [bestTimesError, setBestTimesError] = useState<string | null>(null)
  const [bestTimesFirstLoad, setBestTimesFirstLoad] = useState(true)

  // Estados para mejores karts del día
  const [kartRanking, setKartRanking] = useState<any[]>([])
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
  const leaderLaps = drivers.length > 0 ? drivers[0].lap : 0

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
    // Update Chile time every second
    const updateChileTime = () => {
      const now = new Date();
      const chileTime = now.toLocaleTimeString('es-CL', {
        timeZone: 'America/Santiago',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      setCurrentTime(chileTime);
    };

    updateChileTime(); // Set initial time
    const interval = setInterval(updateChileTime, 1000);

    return () => clearInterval(interval);
  }, [])

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
            <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">Carrera Actual</p>
            <p className="font-digital text-2xl text-white font-bold mb-2">
              {raceData?.sessionName ? raceData.sessionName.replace('[HEAT] ', '') : 'En espera'}
            </p>
            <p className="text-blue-300 text-xs uppercase tracking-wider">NÚMERO</p>
          </div>

          <div className="bg-black/30 backdrop-blur-sm border border-blue-400/30 rounded-2xl p-6 text-center relative hover:border-blue-400/50 transition-colors">
            <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">Pilotos Activos</p>
            <p className="font-digital text-2xl text-white font-bold mb-2">{activeDrivers}</p>
            <p className="text-blue-300 text-xs uppercase tracking-wider">EN PISTA</p>
          </div>

          <div className="bg-black/30 backdrop-blur-sm border border-blue-400/30 rounded-2xl p-6 text-center relative hover:border-blue-400/50 transition-colors">
            <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">Hora Actual</p>
            <p className="font-digital text-2xl text-white font-bold mb-2">{currentTime || '--:--:--'}</p>
            <p className="text-blue-300 text-xs uppercase tracking-wider">CHILE</p>
          </div>

          <div className="bg-black/30 backdrop-blur-sm border border-blue-400/30 rounded-2xl p-6 text-center relative hover:border-blue-400/50 transition-colors">
            <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">Vuelta de Carrera</p>
            <p className="font-digital text-2xl text-white font-bold mb-2">{leaderLaps || 0}</p>
            <p className="text-blue-300 text-xs uppercase tracking-wider">LÍDER</p>
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
            {/* Top 10 Drivers of the Day - V0 Version */}
            <TopDriversDayV0 />

            {/* Best Karts of the Day - V0 Version */}
            <TopKartsDayV0 />
          </div>
        </div>

      </div>
    </div>
  )
}