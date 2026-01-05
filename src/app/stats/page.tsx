'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import AdminGuard from '@/components/AdminGuard'
import AdminNavbar from '@/components/AdminNavbar'
import { useAuth } from '@/hooks/useAuth'

// Importar los gráficos dinámicamente para evitar problemas de SSR
const HourlyRevenueChart = dynamic(() => import('@/components/HourlyRevenueChart'), {
  ssr: false,
  loading: () => <div className="h-80 w-full flex items-center justify-center text-cyan-400">📊 Cargando gráfico...</div>
})

const TopDriversChart = dynamic(() => import('@/components/TopDriversChart'), {
  ssr: false,
  loading: () => <div className="h-80 w-full flex items-center justify-center text-cyan-400">📊 Cargando gráfico...</div>
})

const DailyRevenueChart = dynamic(() => import('@/components/DailyRevenueChart'), {
  ssr: false,
  loading: () => <div className="h-80 w-full flex items-center justify-center text-cyan-400">📊 Cargando gráfico...</div>
})

const UsageHeatmap = dynamic(() => import('@/components/UsageHeatmap'), {
  ssr: false,
  loading: () => <div className="h-80 w-full flex items-center justify-center text-cyan-400">📊 Cargando mapa...</div>
})

interface TopDriverData {
  driverName: string
  classificationsCount: number
  totalSpent: number
}

interface DailyData {
  date: string
  revenue: number
  sessions: number
  drivers: number
}

interface UsageAnalysis {
  hourlyUsage: Array<{
    hour: number
    sessions: number
    drivers: number
    revenue: number
  }>
  weekdayUsage: Array<{
    day: number
    dayName: string
    sessions: number
    drivers: number
    revenue: number
  }>
  lowUsageHours: Array<{
    hour: number
    sessions: number
  }>
  lowUsageDays: Array<{
    day: number
    dayName: string
    sessions: number
  }>
}

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
  topDriversThisMonth: TopDriverData[]
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [usageAnalysis, setUsageAnalysis] = useState<UsageAnalysis | null>(null)
  const [heatmap, setHeatmap] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Date range state
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { token } = useAuth()

  // Calcular fechas según el rango seleccionado
  const getDateRange = () => {
    const end = new Date()
    let start = new Date()

    if (dateRange === 'today') {
      start.setHours(0, 0, 0, 0)
    } else if (dateRange === 'week') {
      start.setDate(end.getDate() - 7)
    } else if (dateRange === 'month') {
      start.setMonth(end.getMonth() - 1)
    } else if (dateRange === 'custom' && startDate && endDate) {
      start = new Date(startDate)
      end.setTime(new Date(endDate).getTime())
    }

    return { start, end }
  }

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) {
        setError('Token de autenticación requerido')
        setLoading(false)
        return
      }

      try {
        const { start, end } = getDateRange()
        const params = new URLSearchParams()
        if (start) params.append('startDate', start.toISOString())
        if (end) params.append('endDate', end.toISOString())

        // Fetch main stats
        const response = await fetch(`/api/stats?${params}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        // Asegurar que todos los campos tengan valores por defecto
        const processedData: StatsData = {
          totalRaces: data.totalRaces || 0,
          totalDrivers: data.totalDrivers || 0,
          driversToday: data.driversToday || 0,
          revenueToday: data.revenueToday || 0,
          revenueTotal: data.revenueTotal || 0,
          averageDriversPerRace: data.averageDriversPerRace || 0,
          lastUpdate: data.lastUpdate || new Date().toLocaleString(),
          recentSessions: data.recentSessions || [],
          hourlyRevenue: data.hourlyRevenue || [],
          topDriversThisMonth: data.topDriversThisMonth || [],
        }

        setStats(processedData)

        // Fetch daily revenue data
        if (dateRange !== 'today') {
          const dailyParams = new URLSearchParams()
          dailyParams.append('mode', 'daily')
          dailyParams.append('startDate', start.toISOString())
          dailyParams.append('endDate', end.toISOString())

          const dailyResponse = await fetch(`/api/stats?${dailyParams}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const dailyResult = await dailyResponse.json()
          setDailyData(dailyResult.dailyRevenue || [])
        } else {
          setDailyData([])
        }

        // Fetch usage analysis
        const usageParams = new URLSearchParams()
        usageParams.append('mode', 'usage')
        usageParams.append('startDate', start.toISOString())
        usageParams.append('endDate', end.toISOString())

        const usageResponse = await fetch(`/api/stats?${usageParams}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const usageResult = await usageResponse.json()
        setUsageAnalysis(usageResult.usageAnalysis || null)

        // Fetch heatmap
        const heatmapParams = new URLSearchParams()
        heatmapParams.append('mode', 'heatmap')
        heatmapParams.append('startDate', start.toISOString())
        heatmapParams.append('endDate', end.toISOString())

        const heatmapResponse = await fetch(`/api/stats?${heatmapParams}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const heatmapResult = await heatmapResponse.json()
        setHeatmap(heatmapResult.heatmap || null)

        setError(null)
      } catch (error) {
        console.error('Error fetching stats:', error)
        setError(error instanceof Error ? error.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()

    // Actualizar cada 30 segundos
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [token, dateRange, startDate, endDate])

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-cyan-400 text-xl animate-pulse">🔄 Cargando estadísticas...</div>
      </div>
    )
  }

  if (error) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="max-w-md text-center">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <h2 className="text-red-400 font-racing text-2xl mb-4">ERROR</h2>
            <p className="text-sky-blue/80 font-digital mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-gradient-to-r from-electric-blue to-sky-blue text-midnight font-racing font-bold rounded hover:from-electric-blue/90 hover:to-sky-blue/90 transition-all"
            >
              RECARGAR
            </button>
          </div>
        </div>
      </AdminGuard>
    )
  }

  if (!stats) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-yellow-400 text-xl">⚠️ No hay datos de estadísticas disponibles</div>
        </div>
      </AdminGuard>
    )
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-black text-white overflow-x-hidden relative">
      <AdminNavbar currentPage="Estadísticas del Sistema - Panel completo de métricas" />
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
        <header className="text-center mb-8">
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

        {/* Date Range Selector */}
        <section className="bg-gradient-to-br from-slate-900/50 to-blue-900/30 backdrop-blur-sm border border-blue-800/30 rounded-2xl p-6 mb-8">
          <h3 className="font-racing text-xl text-white mb-4 tracking-wider">📅 RANGO DE FECHAS</h3>

          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={() => setDateRange('today')}
              className={`px-4 py-2 rounded-lg font-digital transition-all ${
                dateRange === 'today'
                  ? 'bg-cyan-400 text-black font-bold'
                  : 'bg-black/40 text-cyan-400 border border-cyan-400/30 hover:border-cyan-400/50'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setDateRange('week')}
              className={`px-4 py-2 rounded-lg font-digital transition-all ${
                dateRange === 'week'
                  ? 'bg-cyan-400 text-black font-bold'
                  : 'bg-black/40 text-cyan-400 border border-cyan-400/30 hover:border-cyan-400/50'
              }`}
            >
              Última Semana
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`px-4 py-2 rounded-lg font-digital transition-all ${
                dateRange === 'month'
                  ? 'bg-cyan-400 text-black font-bold'
                  : 'bg-black/40 text-cyan-400 border border-cyan-400/30 hover:border-cyan-400/50'
              }`}
            >
              Último Mes
            </button>
            <button
              onClick={() => setDateRange('custom')}
              className={`px-4 py-2 rounded-lg font-digital transition-all ${
                dateRange === 'custom'
                  ? 'bg-cyan-400 text-black font-bold'
                  : 'bg-black/40 text-cyan-400 border border-cyan-400/30 hover:border-cyan-400/50'
              }`}
            >
              Personalizado
            </button>
          </div>

          {dateRange === 'custom' && (
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <label className="block text-blue-300 text-sm mb-2">Desde:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-black/40 border border-cyan-400/30 rounded-lg px-4 py-2 text-white font-digital focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-blue-300 text-sm mb-2">Hasta:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-black/40 border border-cyan-400/30 rounded-lg px-4 py-2 text-white font-digital focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>
          )}
        </section>

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
              }}>Clasificaciones Recientes</span>
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
                  {stats.recentSessions.length > 0 ? stats.recentSessions
                    .filter(session => session.name.toLowerCase().includes('clasificacion'))
                    .map((session) => (
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
                        📊 Sin clasificaciones registradas aún
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
          {/* Hourly Revenue Chart */}
          <section className="bg-gradient-to-br from-slate-900/50 to-blue-900/30 backdrop-blur-sm border border-blue-800/30 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-cyan-400/5 to-blue-600/5 rounded-2xl"></div>
            
            <div className="relative z-10">
              <h2 className="font-racing text-2xl text-white mb-6 tracking-wider">
                📊 <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-400 to-white" style={{
                  textShadow: '0 0 10px rgba(135, 206, 235, 0.8), 0 0 20px rgba(0, 87, 184, 0.4)'
                }}>Ganancias por Hora (Hoy)</span>
              </h2>
              
              <div className="bg-black/30 backdrop-blur-sm border border-blue-800/20 rounded-xl p-4 mb-4">
                <HourlyRevenueChart hourlyData={stats.hourlyRevenue || []} />
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="text-center">
                  <div className="text-cyan-400 font-bold">Horario Pico</div>
                  <div className="text-white font-digital">
                    {stats.hourlyRevenue?.length > 0 ? 
                      `${stats.hourlyRevenue.reduce((max, curr) => curr.revenue > max.revenue ? curr : max, stats.hourlyRevenue[0]).hour}:00` 
                      : '--:--'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-cyan-400 font-bold">Mayor Ganancia</div>
                  <div className="text-white font-digital">
                    ${stats.hourlyRevenue?.length > 0 ? 
                      Math.max(...stats.hourlyRevenue.map(h => h.revenue)).toLocaleString('es-CL') 
                      : '0'}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Top Drivers Chart */}
          <section className="bg-gradient-to-br from-slate-900/50 to-purple-900/30 backdrop-blur-sm border border-purple-800/30 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-pink-400/5 to-purple-600/5 rounded-2xl"></div>
            
            <div className="relative z-10">
              <h2 className="font-racing text-2xl text-white mb-6 tracking-wider">
                🏆 <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-400 to-white" style={{
                  textShadow: '0 0 10px rgba(236, 72, 153, 0.8), 0 0 20px rgba(147, 51, 234, 0.4)'
                }}>Top 10 Corredores (Este Mes)</span>
              </h2>
              
              <div className="bg-black/30 backdrop-blur-sm border border-purple-800/20 rounded-xl p-4 mb-4">
                <TopDriversChart topDrivers={stats.topDriversThisMonth || []} />
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="text-center">
                  <div className="text-pink-400 font-bold">Total Corredores</div>
                  <div className="text-white font-digital">
                    {stats.topDriversThisMonth?.length || 0}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-pink-400 font-bold">Gasto Líder</div>
                  <div className="text-white font-digital">
                    ${stats.topDriversThisMonth?.[0]?.totalSpent?.toLocaleString('es-CL') || '0'}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Daily Revenue Chart (only show if not today) */}
        {dateRange !== 'today' && dailyData.length > 0 && (
          <section className="bg-gradient-to-br from-slate-900/50 to-green-900/30 backdrop-blur-sm border border-green-800/30 rounded-2xl p-6 mb-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 via-emerald-400/5 to-green-600/5 rounded-2xl"></div>

            <div className="relative z-10">
              <h2 className="font-racing text-2xl text-white mb-6 tracking-wider">
                💰 <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-400 to-white" style={{
                  textShadow: '0 0 10px rgba(52, 211, 153, 0.8), 0 0 20px rgba(16, 185, 129, 0.4)'
                }}>Ingresos Diarios</span>
              </h2>

              <div className="bg-black/30 backdrop-blur-sm border border-green-800/20 rounded-xl p-4 mb-4">
                <DailyRevenueChart dailyData={dailyData} />
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="text-center">
                  <div className="text-emerald-400 font-bold">Promedio Diario</div>
                  <div className="text-white font-digital">
                    ${(dailyData.reduce((sum, d) => sum + d.revenue, 0) / dailyData.length).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-emerald-400 font-bold">Mejor Día</div>
                  <div className="text-white font-digital">
                    ${Math.max(...dailyData.map(d => d.revenue)).toLocaleString('es-CL')}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-emerald-400 font-bold">Total Período</div>
                  <div className="text-white font-digital">
                    ${dailyData.reduce((sum, d) => sum + d.revenue, 0).toLocaleString('es-CL')}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Usage Heatmap */}
        {heatmap && (
          <section className="bg-gradient-to-br from-slate-900/50 to-purple-900/30 backdrop-blur-sm border border-purple-800/30 rounded-2xl p-6 mb-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-fuchsia-400/5 to-purple-600/5 rounded-2xl"></div>

            <div className="relative z-10">
              <h2 className="font-racing text-2xl text-white mb-6 tracking-wider">
                🔥 <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-fuchsia-400 to-white" style={{
                  textShadow: '0 0 10px rgba(232, 121, 249, 0.8), 0 0 20px rgba(192, 38, 211, 0.4)'
                }}>Mapa de Calor - Uso por Hora y Día</span>
              </h2>

              <div className="bg-black/30 backdrop-blur-sm border border-purple-800/20 rounded-xl p-4">
                <UsageHeatmap heatmap={heatmap} />
              </div>
            </div>
          </section>
        )}

        {/* Low Usage Analysis */}
        {usageAnalysis && usageAnalysis.lowUsageHours.length > 0 && (
          <section className="bg-gradient-to-br from-slate-900/50 to-orange-900/30 backdrop-blur-sm border border-orange-800/30 rounded-2xl p-6 mb-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600/5 via-amber-400/5 to-orange-600/5 rounded-2xl"></div>

            <div className="relative z-10">
              <h2 className="font-racing text-2xl text-white mb-6 tracking-wider">
                📉 <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-400 to-white" style={{
                  textShadow: '0 0 10px rgba(251, 191, 36, 0.8), 0 0 20px rgba(245, 158, 11, 0.4)'
                }}>Horarios de Bajo Uso</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Low Usage Hours */}
                <div className="bg-black/30 backdrop-blur-sm border border-orange-800/20 rounded-xl p-4">
                  <h3 className="text-amber-400 font-bold mb-3 text-sm">⏰ Horas con Menos Actividad</h3>
                  <div className="space-y-2">
                    {usageAnalysis.lowUsageHours.slice(0, 5).map((hour) => (
                      <div key={hour.hour} className="flex justify-between items-center text-xs">
                        <span className="text-white font-digital">{hour.hour}:00 - {hour.hour + 1}:00</span>
                        <span className="text-amber-400">{hour.sessions} sesiones</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-amber-900/20 border border-amber-600/30 rounded text-xs text-amber-200">
                    💡 Considera promociones u ofertas en estos horarios
                  </div>
                </div>

                {/* Low Usage Days */}
                <div className="bg-black/30 backdrop-blur-sm border border-orange-800/20 rounded-xl p-4">
                  <h3 className="text-amber-400 font-bold mb-3 text-sm">📅 Días con Menos Actividad</h3>
                  <div className="space-y-2">
                    {usageAnalysis.lowUsageDays.slice(0, 5).map((day) => (
                      <div key={day.day} className="flex justify-between items-center text-xs">
                        <span className="text-white font-digital">{day.dayName}</span>
                        <span className="text-amber-400">{day.sessions} sesiones</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-amber-900/20 border border-amber-600/30 rounded text-xs text-amber-200">
                    💡 Días ideales para eventos especiales o descuentos
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
    </AdminGuard>
  )
}