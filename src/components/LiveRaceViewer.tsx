'use client'

import { useState, useEffect } from 'react'

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
  const [isLive, setIsLive] = useState(true)
  const [sessionTime, setSessionTime] = useState("15:42")
  const [activeDrivers, setActiveDrivers] = useState(5)
  const [bestLap, setBestLap] = useState("0:42.157")
  const [totalLaps, setTotalLaps] = useState(87)
  const [averageTime, setAverageTime] = useState("0:43.456")

  useEffect(() => {
    // Simulate live updates
    const interval = setInterval(() => {
      const [minutes, seconds] = sessionTime.split(':').map(Number)
      const totalSeconds = minutes * 60 + seconds + 1
      const newMinutes = Math.floor(totalSeconds / 60)
      const newSeconds = totalSeconds % 60
      setSessionTime(`${newMinutes}:${newSeconds.toString().padStart(2, '0')}`)
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionTime])

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden relative">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `
            linear-gradient(rgba(0, 212, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Navigation Bar */}
      <nav className="relative z-20 border-b border-blue-800/30 bg-black/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-400/25">
                <span className="text-white font-bold text-xl">🏁</span>
              </div>
              <div>
                <h1 className="font-racing text-2xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider">
                  KARTEANDO<span className="text-sky-400">.CL</span>
                </h1>
                <p className="text-blue-300 text-xs font-medium">Racing Platform</p>
              </div>
            </div>

            {/* Navigation Links & Auth */}
            <div className="flex items-center space-x-6">
              {/* Navigation Links */}
              <div className="hidden md:flex items-center space-x-6">
                <a href="#" className="text-blue-300 hover:text-cyan-400 transition-colors font-medium uppercase tracking-wider text-sm">
                  Live View
                </a>
                <a href="#" className="text-blue-300 hover:text-cyan-400 transition-colors font-medium uppercase tracking-wider text-sm">
                  Rankings
                </a>
                <a href="#" className="text-blue-300 hover:text-cyan-400 transition-colors font-medium uppercase tracking-wider text-sm">
                  Carreras
                </a>
              </div>

              {/* Auth Buttons */}
              <div className="flex items-center space-x-4">
                <button className="px-4 py-2 text-cyan-400 hover:text-white transition-all border border-cyan-400/30 rounded-lg hover:bg-cyan-400/10 hover:shadow-lg hover:shadow-cyan-400/20 font-medium uppercase tracking-wider text-sm">
                  Login
                </button>
                <button className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-lg hover:from-cyan-500 hover:to-blue-600 transition-all shadow-lg hover:shadow-cyan-400/25 transform hover:scale-105 font-medium uppercase tracking-wider text-sm">
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto p-8">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="font-racing text-6xl md:text-8xl mb-4 tracking-wider bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent" style={{
            textShadow: '0 0 30px rgba(0, 87, 184, 0.5)'
          }}>
            🏁 SPEEDPARK
          </h1>
          <div className={`inline-flex items-center gap-2 ${isLive ? 'text-cyan-400' : 'text-red-400'} font-digital font-bold text-lg uppercase tracking-wider`}>
            <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-cyan-400 animate-pulse' : 'bg-red-400'}`} style={{
              boxShadow: isLive ? '0 0 20px #00FFFF' : '0 0 20px #FF6B6B'
            }}></div>
            {isLive ? 'EN VIVO - SESIÓN ACTIVA' : 'DESCONECTADO'}
          </div>
          <p className="text-blue-300 mt-4 text-lg tracking-wide">SPEEDPARK KARTING CHAMPIONSHIP</p>
        </header>

        {/* Statistics Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <div className="bg-black/30 backdrop-blur-sm border border-blue-800/30 rounded-2xl p-6 text-center relative overflow-hidden">
            <div className="absolute inset-[-2px] bg-gradient-to-45deg from-cyan-400 via-blue-500 to-sky-400 opacity-50 rounded-2xl -z-10" style={{
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude'
            }}></div>
            <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">Sesión Actual</p>
            <p className="font-digital text-2xl text-white font-bold mb-2">SpeedPark Live</p>
            <p className="text-blue-300 text-xs uppercase tracking-wider">NOMBRE</p>
          </div>

          <div className="bg-black/30 backdrop-blur-sm border border-blue-800/30 rounded-2xl p-6 text-center relative overflow-hidden">
            <div className="absolute inset-[-2px] bg-gradient-to-45deg from-cyan-400 via-blue-500 to-sky-400 opacity-50 rounded-2xl -z-10" style={{
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude'
            }}></div>
            <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">Pilotos Activos</p>
            <p className="font-digital text-2xl text-white font-bold mb-2">{activeDrivers}</p>
            <p className="text-blue-300 text-xs uppercase tracking-wider">EN PISTA</p>
          </div>

          <div className="bg-black/30 backdrop-blur-sm border border-blue-800/30 rounded-2xl p-6 text-center relative overflow-hidden">
            <div className="absolute inset-[-2px] bg-gradient-to-45deg from-cyan-400 via-blue-500 to-sky-400 opacity-50 rounded-2xl -z-10" style={{
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude'
            }}></div>
            <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">Tiempo Activo</p>
            <p className="font-digital text-2xl text-white font-bold mb-2">{sessionTime}</p>
            <p className="text-blue-300 text-xs uppercase tracking-wider">MM:SS</p>
          </div>

          <div className="bg-black/30 backdrop-blur-sm border border-blue-800/30 rounded-2xl p-6 text-center relative overflow-hidden">
            <div className="absolute inset-[-2px] bg-gradient-to-45deg from-cyan-400 via-blue-500 to-sky-400 opacity-50 rounded-2xl -z-10" style={{
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude'
            }}></div>
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
                    {mockDrivers.map((driver) => (
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Daily Best Times Sidebar */}
          <section className="bg-black/30 backdrop-blur-sm border border-blue-800/30 rounded-2xl p-6 h-fit">
            <h3 className="font-racing text-2xl text-white mb-6 tracking-wider">
              🥇 <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-400 to-white">Mejores del Día</span>
            </h3>
            
            <div className="space-y-3">
              {mockDailyBest.map((record) => (
                <div 
                  key={record.pos}
                  className={`flex items-center justify-between p-3 bg-black/30 rounded-xl border-l-3 transition-all duration-300 hover:bg-blue-900/10 hover:transform hover:translate-x-1 ${
                    record.pos === 1 ? 'border-l-yellow-400 bg-gradient-to-r from-yellow-400/10 to-black/30' :
                    record.pos === 2 ? 'border-l-gray-300 bg-gradient-to-r from-gray-300/10 to-black/30' :
                    record.pos === 3 ? 'border-l-orange-600 bg-gradient-to-r from-orange-600/10 to-black/30' :
                    'border-l-blue-400'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-racing text-white font-semibold uppercase tracking-wide text-sm">{record.name}</div>
                    <div className="text-sky-400 text-xs">{record.details}</div>
                  </div>
                  <div className="font-digital text-cyan-400 text-lg font-bold">{record.time}</div>
                </div>
              ))}
            </div>
          </section>
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
                <span className="text-blue-300 text-sm uppercase tracking-wider">Modalidad:</span>
                <span className="font-digital text-white font-bold">Práctica Libre</span>
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
                <span className="font-digital text-cyan-400 font-bold text-lg">0:42.157</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-300 text-sm uppercase tracking-wider">Mejor Hoy:</span>
                <span className="font-digital text-yellow-400 font-bold">{bestLap}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-300 text-sm uppercase tracking-wider">Promedio General:</span>
                <span className="font-digital text-white font-bold">{averageTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-300 text-sm uppercase tracking-wider">Total Vueltas:</span>
                <span className="font-digital text-white font-bold">{totalLaps}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}