'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AdminGuard from '@/components/AdminGuard';
import AdminNavbar from '@/components/AdminNavbar';

interface OnlineUser {
  sessionId: string;
  userId: string | null;
  isAuthenticated: boolean;
  ipAddress: string;
  userAgent: string;
  lastPage: string;
  lastActivity: string;
  geolocation: {
    country?: string;
    city?: string;
    region?: string;
  };
  user: {
    profile: {
      firstName: string;
      lastName: string;
      alias?: string;
    };
    email: string;
  } | null;
}

interface ActivityData {
  onlineUsers: {
    total: number;
    authenticated: number;
    anonymous: number;
    users: OnlineUser[];
  };
  activityStats: {
    totalPageViews: number;
    uniqueVisitors: number;
    avgSessionMinutes: number;
    hourlyActivity: Array<{
      _id: string;
      count: number;
      authenticated: number;
      anonymous: number;
    }>;
    topPages: Array<{
      page: string;
      views: number;
      uniqueVisitors: number;
    }>;
  };
  activeIPs: Array<{
    ipAddress: string;
    isAuthenticated: boolean;
    userId: string | null;
    userAgent: string;
    lastActivity: string;
    lastPage: string;
    geolocation: {
      country?: string;
      city?: string;
      region?: string;
    };
    pageViews: number;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
      email: string;
    } | null;
  }>;
  conversionMetrics: {
    totalVisitors: number;
    newRegistrations: number;
    loginEvents: number;
    conversionRate: number;
  };
}

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchAnalytics = async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/admin/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch analytics');
      }

    } catch (error) {
      console.error('Error fetching analytics:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [token]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchAnalytics, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, token]);

  const formatTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  if (loading) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-cyan-400 text-xl">Cargando analytics...</p>
          </div>
        </div>
      </AdminGuard>
    );
  }

  if (error) {
    return (
      <AdminGuard>
        <AdminNavbar currentPage="Analytics & Monitoreo" />
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="max-w-md text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-red-400 font-racing text-2xl mb-4">ERROR</h2>
            <p className="text-sky-blue/80 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-gradient-to-r from-electric-blue to-sky-blue text-midnight font-racing rounded hover:opacity-90 transition-all"
            >
              RECARGAR
            </button>
          </div>
        </div>
      </AdminGuard>
    );
  }

  if (!data) {
    return (
      <AdminGuard>
        <AdminNavbar currentPage="Analytics & Monitoreo" />
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <p className="text-yellow-400 text-xl">⚠️ No hay datos disponibles</p>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-black text-white">
        <AdminNavbar currentPage="Analytics & Monitoreo en Tiempo Real" />

        {/* Background Effects */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(0, 212, 255, 0.1) 2px, transparent 2px)',
            backgroundSize: '100px 100px'
          }}/>
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-400/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto p-8">
          {/* Header */}
          <header className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="font-racing text-5xl md:text-6xl mb-2 tracking-wider bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                📈 ANALYTICS
              </h1>
              <p className="text-blue-300 text-lg">Monitoreo en Tiempo Real • Última actualización: {new Date().toLocaleTimeString('es-CL')}</p>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-cyan-400">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="text-sm">Auto-refresh (10s)</span>
              </label>
              <button
                onClick={fetchAnalytics}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg hover:opacity-90 transition-all"
              >
                🔄 Actualizar
              </button>
            </div>
          </header>

          {/* Quick Stats Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Online Users */}
            <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-400/30 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-300 text-sm uppercase tracking-wider">🟢 Online</span>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <p className="font-digital text-4xl text-white font-bold">{data.onlineUsers.total}</p>
              <p className="text-green-300 text-xs mt-2">
                {data.onlineUsers.authenticated} autenticados • {data.onlineUsers.anonymous} anónimos
              </p>
            </div>

            {/* Total Page Views */}
            <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-400/30 rounded-xl p-6">
              <span className="text-blue-300 text-sm uppercase tracking-wider block mb-2">📊 Page Views (24h)</span>
              <p className="font-digital text-4xl text-white font-bold">{data.activityStats.totalPageViews.toLocaleString()}</p>
              <p className="text-blue-300 text-xs mt-2">
                {data.activityStats.uniqueVisitors} visitantes únicos
              </p>
            </div>

            {/* Average Session */}
            <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-400/30 rounded-xl p-6">
              <span className="text-purple-300 text-sm uppercase tracking-wider block mb-2">⏱️ Sesión Promedio</span>
              <p className="font-digital text-4xl text-white font-bold">{data.activityStats.avgSessionMinutes}</p>
              <p className="text-purple-300 text-xs mt-2">minutos</p>
            </div>

            {/* Conversion Rate */}
            <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border border-yellow-400/30 rounded-xl p-6">
              <span className="text-yellow-300 text-sm uppercase tracking-wider block mb-2">💰 Conversión</span>
              <p className="font-digital text-4xl text-white font-bold">{data.conversionMetrics.conversionRate}%</p>
              <p className="text-yellow-300 text-xs mt-2">
                {data.conversionMetrics.newRegistrations} registros hoy
              </p>
            </div>
          </section>

          {/* Online Users Table */}
          <section className="bg-gradient-to-br from-slate-900/50 to-blue-900/30 backdrop-blur-sm border border-blue-800/30 rounded-2xl p-6 mb-8">
            <h2 className="font-racing text-2xl text-white mb-4">
              🟢 Usuarios Online ({data.onlineUsers.total})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-blue-800/30">
                    <th className="text-left py-3 px-4 font-racing text-sky-400 text-sm">Usuario</th>
                    <th className="text-left py-3 px-4 font-racing text-sky-400 text-sm">IP</th>
                    <th className="text-left py-3 px-4 font-racing text-sky-400 text-sm">Ubicación</th>
                    <th className="text-left py-3 px-4 font-racing text-sky-400 text-sm">Página</th>
                    <th className="text-left py-3 px-4 font-racing text-sky-400 text-sm">Última Actividad</th>
                    <th className="text-center py-3 px-4 font-racing text-sky-400 text-sm">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.onlineUsers.users.map((user) => (
                    <tr key={user.sessionId} className="border-b border-blue-800/20 hover:bg-blue-900/20 transition-colors">
                      <td className="py-3 px-4">
                        {user.isAuthenticated && user.user ? (
                          <div>
                            <div className="text-white font-medium">
                              {user.user.profile.alias || `${user.user.profile.firstName} ${user.user.profile.lastName}`}
                            </div>
                            <div className="text-blue-300 text-xs">{user.user.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Anónimo</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-cyan-400 text-sm">{user.ipAddress}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-white text-sm">
                          {user.geolocation.city || 'Unknown'}, {user.geolocation.country || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-blue-300 text-sm">{user.lastPage}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-400 text-sm">{formatTimeAgo(user.lastActivity)}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {user.isAuthenticated ? (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">✅ Auth</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded">❌ Anon</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Active IPs Table */}
          <section className="bg-gradient-to-br from-slate-900/50 to-purple-900/30 backdrop-blur-sm border border-purple-800/30 rounded-2xl p-6 mb-8">
            <h2 className="font-racing text-2xl text-white mb-4">
              🌍 IPs Activas ({data.activeIPs.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-purple-800/30">
                    <th className="text-left py-3 px-4 font-racing text-pink-400 text-sm">IP Address</th>
                    <th className="text-left py-3 px-4 font-racing text-pink-400 text-sm">País / Ciudad</th>
                    <th className="text-left py-3 px-4 font-racing text-pink-400 text-sm">Usuario</th>
                    <th className="text-center py-3 px-4 font-racing text-pink-400 text-sm">Views</th>
                    <th className="text-center py-3 px-4 font-racing text-pink-400 text-sm">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.activeIPs.map((ip, idx) => (
                    <tr key={idx} className="border-b border-purple-800/20 hover:bg-purple-900/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono text-cyan-400">{ip.ipAddress}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-white">
                          {ip.geolocation.country || 'Unknown'} • {ip.geolocation.city || 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {ip.user ? (
                          <div>
                            <div className="text-white">{ip.user.profile.firstName} {ip.user.profile.lastName}</div>
                            <div className="text-purple-300 text-xs">{ip.user.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No autenticado</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-digital text-white">{ip.pageViews}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {ip.isAuthenticated ? (
                          <span className="text-green-400">✅</span>
                        ) : (
                          <span className="text-gray-400">❌</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Top Pages */}
          <section className="bg-gradient-to-br from-slate-900/50 to-green-900/30 backdrop-blur-sm border border-green-800/30 rounded-2xl p-6">
            <h2 className="font-racing text-2xl text-white mb-4">
              🔥 Páginas Más Visitadas (24h)
            </h2>

            <div className="space-y-3">
              {data.activityStats.topPages.map((page, idx) => (
                <div key={idx} className="bg-black/30 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-white font-medium">{page.page}</div>
                    <div className="text-green-300 text-sm">{page.uniqueVisitors} visitantes únicos</div>
                  </div>
                  <div className="text-right">
                    <div className="font-digital text-2xl text-green-400">{page.views}</div>
                    <div className="text-gray-400 text-xs">views</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AdminGuard>
  );
}
