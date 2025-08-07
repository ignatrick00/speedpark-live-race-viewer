'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Importar el gráfico dinámicamente para evitar problemas de SSR
const HourlyRevenueChart = dynamic(() => import('@/components/HourlyRevenueChart'), { 
  ssr: false,
  loading: () => <div className="h-80 w-full flex items-center justify-center text-cyan-400">📊 Cargando gráfico...</div>
})

interface StatsData {
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
  hourlyRevenue: Array<{
    hour: number
    revenue: number
    sessions: number
  }>
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats')
        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-cyan-400 text-xl animate-pulse">🔄 Cargando estadísticas...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden relative">
      {/* Background Effects - Same as main page */}
      <div className="fixed inset-0 z-0 will-change-auto">
        <div 
          className="absolute inset-0 opacity-20" 
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(0, 212, 255, 0.1) 2px, transparent 2px)',
            backgroundSize: '100px 100px'
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-2xl animate-pulse transform-gpu"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-400/15 rounded-full blur-2xl animate-pulse transform-gpu" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-8">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="font-racing text-6xl md:text-8xl mb-4 tracking-wider bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-400 bg-clip-text text-transparent" style={{
            textShadow: '0 0 30px rgba(0, 87, 184, 0.5)'
          }}>
            📊 ESTADÍSTICAS
          </h1>
          <div className="flex items-center justify-center gap-2 text-cyan-400 font-digital font-bold text-lg uppercase tracking-wider">
            <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" style={{
              boxShadow: '0 0 20px #00FFFF'
            }}></div>
            PANEL ADMINISTRATIVO
          </div>
          <p className="text-blue-300 mt-4 text-lg tracking-wide">SPEEDPARK BUSINESS METRICS</p>
          <p className="text-blue-400 text-sm mt-2">Última actualización: {stats.lastUpdate}</p>
        </header>

        {/* Main Stats Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {/* Total Races */}
          <div className="bg-black/30 backdrop-blur-sm border border-cyan-400/30 rounded-2xl p-6 text-center relative hover:border-cyan-400/50 transition-colors">
            <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">🔥 Heats Totales</p>
            <p className="font-digital text-4xl text-white font-bold mb-2">{stats.totalRaces}</p>
            <p className="text-blue-300 text-xs uppercase tracking-wider">SESIONES HEAT</p>
          </div>

          {/* Drivers Today */}
          <div className="bg-black/30 backdrop-blur-sm border border-blue-400/30 rounded-2xl p-6 text-center relative hover:border-blue-400/50 transition-colors">
            <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">👤 Corredores Hoy</p>
            <p className="font-digital text-4xl text-white font-bold mb-2">{stats.driversToday}</p>
            <p className="text-blue-300 text-xs uppercase tracking-wider">ÚNICOS HOY</p>
          </div>

          {/* Total Drivers */}
          <div className="bg-black/30 backdrop-blur-sm border border-blue-400/30 rounded-2xl p-6 text-center relative hover:border-blue-400/50 transition-colors">
            <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">🎯 Corredores Totales</p>
            <p className="font-digital text-4xl text-white font-bold mb-2">{stats.totalDrivers}</p>
            <p className="text-blue-300 text-xs uppercase tracking-wider">HISTÓRICO</p>
          </div>

          {/* Revenue Today */}
          <div className="bg-black/30 backdrop-blur-sm border border-green-400/30 rounded-2xl p-6 text-center relative hover:border-green-400/50 transition-colors">
            <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">💰 Ingresos Hoy</p>
            <p className="font-digital text-4xl text-green-400 font-bold mb-2">${stats.revenueToday.toLocaleString('es-CL')}</p>
            <p className="text-blue-300 text-xs uppercase tracking-wider">{stats.driversToday} × $17.000</p>
          </div>

          {/* Revenue Total */}
          <div className="bg-black/30 backdrop-blur-sm border border-yellow-400/30 rounded-2xl p-6 text-center relative hover:border-yellow-400/50 transition-colors">
            <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">🏆 Ingresos Totales</p>
            <p className="font-digital text-4xl text-yellow-400 font-bold mb-2">${stats.revenueTotal.toLocaleString('es-CL')}</p>
            <p className="text-blue-300 text-xs uppercase tracking-wider">HISTÓRICO ACUMULADO</p>
          </div>

          {/* Average per Race */}
          <div className="bg-black/30 backdrop-blur-sm border border-purple-400/30 rounded-2xl p-6 text-center relative hover:border-purple-400/50 transition-colors">
            <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">📈 Promedio por Heat</p>
            <p className="font-digital text-4xl text-purple-400 font-bold mb-2">{stats.averageDriversPerRace.toFixed(1)}</p>
            <p className="text-blue-300 text-xs uppercase tracking-wider">CORREDORES/HEAT</p>
          </div>
        </section>

        {/* Recent Sessions Table */}
        <section className="bg-gradient-to-br from-slate-900/50 to-blue-900/30 backdrop-blur-sm border border-blue-800/30 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-cyan-400/5 to-blue-600/5 rounded-2xl"></div>
          
          <div className="relative z-10">
            <h2 className="font-racing text-3xl text-white mb-8 tracking-wider">
              🕐 <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-400 to-white" style={{
                textShadow: '0 0 10px rgba(135, 206, 235, 0.8), 0 0 20px rgba(0, 87, 184, 0.4)'
              }}>Sesiones Recientes</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border-spacing-y-2">
                <thead>
                  <tr className="border-b-2 border-blue-800/30">
                    <th className="text-left py-4 px-4 font-racing text-sky-400 tracking-wider uppercase text-sm">SESIÓN</th>
                    <th className="text-center py-4 px-4 font-racing text-sky-400 tracking-wider uppercase text-sm">CORREDORES</th>
                    <th className="text-right py-4 px-4 font-racing text-sky-400 tracking-wider uppercase text-sm">INGRESOS</th>
                    <th className="text-right py-4 px-4 font-racing text-sky-400 tracking-wider uppercase text-sm">FECHA</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentSessions.length > 0 ? stats.recentSessions.map((session) => (
                    <tr 
                      key={session.id}
                      className="bg-black/40 hover:bg-blue-900/20 transition-all duration-300"
                    >
                      <td className="py-4 px-4">
                        <div className="font-racing text-white text-lg font-semibold uppercase tracking-wide">{session.name}</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="font-digital text-cyan-400 font-bold">{session.drivers}</div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="font-digital text-green-400 text-lg font-bold">${session.revenue.toLocaleString('es-CL')}</div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="font-digital text-blue-300">{session.timestamp}</div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-blue-300">
                        📊 Sin sesiones HEAT registradas aún
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Hourly Revenue Chart */}
        <section className="bg-gradient-to-br from-slate-900/50 to-blue-900/30 backdrop-blur-sm border border-blue-800/30 rounded-2xl p-6 relative overflow-hidden mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-cyan-400/5 to-blue-600/5 rounded-2xl"></div>
          
          <div className="relative z-10">
            <h2 className="font-racing text-3xl text-white mb-8 tracking-wider">
              📊 <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-400 to-white" style={{
                textShadow: '0 0 10px rgba(135, 206, 235, 0.8), 0 0 20px rgba(0, 87, 184, 0.4)'
              }}>Ganancias por Hora (Hoy)</span>
            </h2>
            
            <div className="bg-black/30 backdrop-blur-sm border border-blue-800/20 rounded-xl p-4">
              <HourlyRevenueChart hourlyData={stats.hourlyRevenue || []} />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="text-center">
                <div className="text-cyan-400 text-sm font-bold">Horario Pico</div>
                <div className="text-white font-digital">
                  {stats.hourlyRevenue?.length > 0 ? 
                    `${stats.hourlyRevenue.reduce((max, curr) => curr.revenue > max.revenue ? curr : max, stats.hourlyRevenue[0]).hour}:00` 
                    : '--:--'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-cyan-400 text-sm font-bold">Mayor Ganancia</div>
                <div className="text-white font-digital">
                  ${stats.hourlyRevenue?.length > 0 ? 
                    Math.max(...stats.hourlyRevenue.map(h => h.revenue)).toLocaleString('es-CL') 
                    : '0'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-cyan-400 text-sm font-bold">Total Sesiones</div>
                <div className="text-white font-digital">
                  {stats.hourlyRevenue?.reduce((sum, h) => sum + h.sessions, 0) || 0}
                </div>
              </div>
              <div className="text-center">
                <div className="text-cyan-400 text-sm font-bold">Promedio/Hora</div>
                <div className="text-white font-digital">
                  ${stats.hourlyRevenue?.length > 0 ? 
                    Math.round(stats.hourlyRevenue.reduce((sum, h) => sum + h.revenue, 0) / stats.hourlyRevenue.filter(h => h.revenue > 0).length || 1).toLocaleString('es-CL') 
                    : '0'}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}