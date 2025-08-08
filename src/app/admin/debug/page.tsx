'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';

export default function DebugPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        router.push('/');
        return;
      }
      
      // Solo permitir acceso a icabreraquezada@gmail.com
      if (user.email !== 'icabreraquezada@gmail.com') {
        alert('❌ Acceso denegado. Solo administradores pueden acceder a esta página.');
        router.push('/dashboard');
        return;
      }
      
      loadDebugData();
    }
  }, [isLoading, isAuthenticated, user, router]);

  const loadDebugData = async () => {
    try {
      setLoading(true);
      
      // Get token from localStorage (same way useAuth does it)
      const token = localStorage.getItem('auth-token');
      
      if (!token) {
        setError('Token de autenticación no encontrado');
        return;
      }
      
      const response = await fetch('/api/debug-mongo', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setDebugData(data);
        setError(null);
      } else {
        setError(data.error || data.details || 'Error loading debug data');
      }
    } catch (err) {
      setError('Error fetching debug data');
      console.error('Debug error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <AdminNavbar currentPage="Cargando..." />
        <div className="flex items-center justify-center pt-20">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Cargando datos de debug...</p>
          </div>
        </div>
      </div>
    );
  }

  // Verificar acceso de administrador
  if (user.email !== 'icabreraquezada@gmail.com') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-red-400 mb-4">Acceso Denegado</h1>
          <p className="text-gray-400 mb-6">
            Solo administradores pueden acceder a esta página.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <AdminNavbar currentPage="Debug MongoDB - Error" />
        <div className="max-w-6xl mx-auto p-6">
          <h1 className="text-3xl font-bold text-red-400 mb-6">❌ Error de Debug</h1>
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-6">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!debugData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 flex items-center justify-center">
        <p>No hay datos de debug disponibles</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <AdminNavbar currentPage="Debug MongoDB - Inspección de colecciones de base de datos" />
      
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-cyan-400 mb-2">🔍 Debug MongoDB Collections</h1>
          <p className="text-sm text-gray-400">
            👤 Admin: {user.email} | 🕐 {new Date(debugData.timestamp).toLocaleString()}
          </p>
        </div>

        {/* Collections Summary */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">📊 Resumen de Colecciones</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(debugData.collections).map(([name, count]) => (
              <div key={name} className="bg-gray-700 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-cyan-400">{count as number}</div>
                <div className="text-sm text-gray-300">{name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Diego/User Data */}
        {debugData.diegoData && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">🎯 Datos del Usuario Diego</h2>
            <div className="bg-gray-700 p-4 rounded-lg mb-4">
              <h3 className="font-bold text-green-400 mb-2">Usuario Web:</h3>
              <p className="text-white">
                <strong>Nombre:</strong> {debugData.diegoData.user.profile?.firstName} {debugData.diegoData.user.profile?.lastName}
              </p>
              <p className="text-white">
                <strong>Alias:</strong> {debugData.diegoData.user.profile?.alias || 'Sin alias'}
              </p>
              <p className="text-white">
                <strong>Email:</strong> {debugData.diegoData.user.email}
              </p>
              <p className="text-white">
                <strong>WebUserId:</strong> {debugData.diegoData.user._id}
              </p>
              <p className="text-white">
                <strong>Karting Status:</strong> {debugData.diegoData.user.kartingLink?.status || 'No definido'}
              </p>
              <p className="text-white">
                <strong>Driver Name:</strong> {debugData.diegoData.user.kartingLink?.driverName || 'Ninguno'}
              </p>
            </div>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="font-bold text-yellow-400 mb-2">Registros de Vueltas: ({debugData.diegoData.totalLaps} total)</h3>
              {debugData.diegoData.lapRecords.length > 0 ? (
                <div className="space-y-2">
                  {debugData.diegoData.lapRecords.map((lap: any, index: number) => (
                    <div key={index} className="text-sm bg-gray-600 p-3 rounded">
                      <p><strong>Sesión:</strong> {lap.sessionName}</p>
                      <p><strong>Vuelta:</strong> {lap.lapNumber} | <strong>Posición:</strong> {lap.position} | <strong>Tiempo:</strong> {lap.lastTime}ms</p>
                      <p><strong>Conductor:</strong> {lap.driverName} | <strong>Vinculado:</strong> {lap.webUserId ? 'SÍ' : 'NO'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No tiene registros de vueltas</p>
              )}
            </div>
          </div>
        )}

        {/* Recent Lap Records */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">🏁 Últimos Registros de Vueltas</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left p-2">Driver</th>
                  <th className="text-left p-2">Sesión</th>
                  <th className="text-center p-2">Vuelta</th>
                  <th className="text-center p-2">Posición</th>
                  <th className="text-right p-2">Tiempo</th>
                  <th className="text-center p-2">Vinculado</th>
                </tr>
              </thead>
              <tbody>
                {debugData.samples.lap_records.map((lap: any, index: number) => (
                  <tr key={index} className="border-b border-gray-700">
                    <td className="p-2 text-white">{lap.driverName}</td>
                    <td className="p-2 text-gray-300">{lap.sessionName}</td>
                    <td className="p-2 text-center text-cyan-400">{lap.lapNumber}</td>
                    <td className="p-2 text-center text-green-400">P{lap.position}</td>
                    <td className="p-2 text-right text-yellow-400">{lap.lastTime}ms</td>
                    <td className="p-2 text-center">
                      {lap.webUserId ? (
                        <span className="text-green-400">✅</span>
                      ) : (
                        <span className="text-red-400">❌</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Race Sessions */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">🏆 Últimas Sesiones de Carrera</h2>
          <div className="space-y-3">
            {debugData.samples.racesessions.map((session: any, index: number) => (
              <div key={index} className="bg-gray-700 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white">{session.sessionName}</h3>
                    <p className="text-sm text-gray-300">
                      {session.drivers?.length || 0} pilotos | ${session.revenue}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(session.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    session.processed ? 'bg-green-600' : 'bg-yellow-600'
                  }`}>
                    {session.processed ? 'Procesado' : 'Pendiente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">⚙️ Acciones</h2>
          <div className="flex gap-4">
            <button
              onClick={loadDebugData}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
            >
              🔄 Recargar Datos
            </button>
            <button
              onClick={() => router.push('/admin/drivers')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              🏁 Admin Corredores
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}