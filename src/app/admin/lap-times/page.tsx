'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminGuard from '@/components/AdminGuard';

interface LapRecord {
  _id: string;
  sessionName: string;
  driverName: string;
  lapNumber: number;
  bestTime: number;
  lastTime: number;
  kartNumber: number;
  position: number;
  timestamp: string;
  isValid: boolean;
  invalidReason?: string;
}

interface SystemConfig {
  minLapTime: number;
  maxLapTime?: number;
  validSessionTypes: string[];
  lastUpdatedBy?: string;
  updatedAt: string;
}

export default function LapTimesAdminPage() {
  const router = useRouter();
  const [records, setRecords] = useState<LapRecord[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);

  // Filters
  const [filterValid, setFilterValid] = useState<string>('all');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterSession, setFilterSession] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'bestTime'>('date');
  const [top10Mode, setTop10Mode] = useState(false);

  // Config editing
  const [minLapTimeSeconds, setMinLapTimeSeconds] = useState(35);
  const [maxLapTimeSeconds, setMaxLapTimeSeconds] = useState(120);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Stats
  const [stats, setStats] = useState({ validCount: 0, invalidCount: 0, totalCount: 0 });

  // Cargar configuración
  useEffect(() => {
    loadConfig();
  }, []);

  // Cargar registros
  useEffect(() => {
    loadRecords();
  }, [page, filterValid, filterDriver, filterSession, sortBy, top10Mode]);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/admin/system-config');
      const data = await res.json();

      if (data.success) {
        setConfig(data.config);
        setMinLapTimeSeconds(Math.floor(data.config.minLapTime / 1000));
        setMaxLapTimeSeconds(Math.floor((data.config.maxLapTime || 120000) / 1000));
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const loadRecords = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        sortBy: sortBy
      });

      if (top10Mode) {
        params.set('top10', 'true');
      } else {
        if (filterValid !== 'all') {
          params.append('valid', filterValid);
        }
        if (filterDriver) {
          params.append('driver', filterDriver);
        }
        if (filterSession) {
          params.append('session', filterSession);
        }
      }

      const res = await fetch(`/api/admin/lap-times?${params}`);
      const data = await res.json();

      if (data.success) {
        setRecords(data.records);
        setTotalPages(data.pagination.totalPages);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setLoading(false);
    }
  };

  const enableTop10Mode = () => {
    setTop10Mode(true);
    setSortBy('bestTime');
    setPage(1);
    setFilterValid('all');
    setFilterDriver('');
    setFilterSession('');
  };

  const disableTop10Mode = () => {
    setTop10Mode(false);
    setSortBy('date');
    setPage(1);
  };

  const updateConfig = async () => {
    try {
      setConfigLoading(true);

      const res = await fetch('/api/admin/system-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minLapTime: minLapTimeSeconds * 1000,
          maxLapTime: maxLapTimeSeconds * 1000
        })
      });

      const data = await res.json();

      if (data.success) {
        alert('✅ Configuración actualizada');
        loadConfig();
        loadRecords(); // Recargar para aplicar nuevos filtros
      } else {
        alert('❌ Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error updating config:', error);
      alert('❌ Error al actualizar configuración');
    } finally {
      setConfigLoading(false);
    }
  };

  const deleteRecord = async (recordId: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/lap-times?id=${recordId}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (data.success) {
        alert('✅ Registro eliminado');
        loadRecords();
      } else {
        alert('❌ Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('❌ Error al eliminar registro');
    }
  };

  const toggleValidity = async (recordId: string, currentValid: boolean) => {
    try {
      const res = await fetch('/api/admin/lap-times', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId,
          isValid: !currentValid,
          invalidReason: currentValid ? 'manual_deletion' : undefined
        })
      });

      const data = await res.json();

      if (data.success) {
        loadRecords();
      } else {
        alert('❌ Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error toggling validity:', error);
      alert('❌ Error al actualizar registro');
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-black text-white p-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                Gestión de Tiempos de Vuelta
              </h1>
              <p className="text-gray-400 mt-2">Configuración y administración de registros</p>
            </div>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              ← Volver
            </button>
          </div>

          {/* Configuration Section */}
          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              ⚙️ Configuración de Validación
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tiempo Mínimo Válido (segundos)
                </label>
                <input
                  type="number"
                  value={minLapTimeSeconds}
                  onChange={(e) => setMinLapTimeSeconds(parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-black/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                  min="1"
                  max="300"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Tiempos menores a {minLapTimeSeconds}s serán marcados como inválidos
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Tiempo Máximo Válido (segundos)
                </label>
                <input
                  type="number"
                  value={maxLapTimeSeconds}
                  onChange={(e) => setMaxLapTimeSeconds(parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-black/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                  min={minLapTimeSeconds}
                  max="600"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Tiempos mayores a {maxLapTimeSeconds}s serán marcados como inválidos
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                {config?.lastUpdatedBy && (
                  <p>Última actualización: {config.lastUpdatedBy} - {formatDate(config.updatedAt)}</p>
                )}
              </div>
              <button
                onClick={updateConfig}
                disabled={configLoading}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-lg font-medium transition disabled:opacity-50"
              >
                {configLoading ? 'Guardando...' : '💾 Guardar Configuración'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <p className="text-sm text-gray-400">Registros Válidos</p>
              <p className="text-3xl font-bold text-green-400">{stats.validCount}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-sm text-gray-400">Registros Inválidos</p>
              <p className="text-3xl font-bold text-red-400">{stats.invalidCount}</p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <p className="text-sm text-gray-400">Total</p>
              <p className="text-3xl font-bold text-blue-400">{stats.totalCount}</p>
            </div>
          </div>

          {/* Top 10 Mode Toggle */}
          <div className="mb-6">
            {!top10Mode ? (
              <button
                onClick={enableTop10Mode}
                className="w-full py-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 hover:border-yellow-500/80 rounded-xl font-bold text-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
              >
                🏆 Ver Top 10 Mejores Tiempos Históricos
              </button>
            ) : (
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🏆</span>
                    <div>
                      <h3 className="text-xl font-bold text-yellow-400">Top 10 Mejores Tiempos Históricos</h3>
                      <p className="text-sm text-gray-400">Mostrando los 10 mejores tiempos válidos de todos los tiempos</p>
                    </div>
                  </div>
                  <button
                    onClick={disableTop10Mode}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                  >
                    ← Ver Todos
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Filters */}
          {!top10Mode && (
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mb-6">
              <h3 className="font-bold mb-4">🔍 Filtros y Ordenamiento</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm mb-2">Ordenar por</label>
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as 'date' | 'bestTime');
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg"
                  >
                    <option value="date">📅 Más reciente</option>
                    <option value="bestTime">⏱️ Mejor tiempo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2">Estado</label>
                  <select
                    value={filterValid}
                    onChange={(e) => {
                      setFilterValid(e.target.value);
                      setPage(1);
                    }}
                    className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg"
                  >
                    <option value="all">Todos</option>
                    <option value="true">Válidos</option>
                    <option value="false">Inválidos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2">Piloto</label>
                  <input
                    type="text"
                    value={filterDriver}
                    onChange={(e) => {
                      setFilterDriver(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Buscar por nombre..."
                    className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">Sesión</label>
                  <input
                    type="text"
                    value={filterSession}
                    onChange={(e) => {
                      setFilterSession(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Buscar por sesión..."
                    className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Records Table */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    {top10Mode && <th className="px-4 py-3 text-left">Ranking</th>}
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Sesión</th>
                    <th className="px-4 py-3 text-left">Piloto</th>
                    <th className="px-4 py-3 text-left">Vuelta</th>
                    <th className="px-4 py-3 text-left">Mejor Tiempo</th>
                    <th className="px-4 py-3 text-left">Kart</th>
                    {!top10Mode && <th className="px-4 py-3 text-left">Pos</th>}
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                        Cargando registros...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                        No se encontraron registros
                      </td>
                    </tr>
                  ) : (
                    records.map((record, index) => {
                      const isBelowMin = config && record.bestTime < config.minLapTime;
                      const isAboveMax = config && config.maxLapTime && record.bestTime > config.maxLapTime;
                      const rankingPosition = index + 1;
                      const getMedal = (pos: number) => {
                        if (pos === 1) return '🥇';
                        if (pos === 2) return '🥈';
                        if (pos === 3) return '🥉';
                        return `#${pos}`;
                      };

                      return (
                        <tr
                          key={record._id}
                          className={`border-t border-gray-800 hover:bg-gray-800/50 ${
                            !record.isValid || isBelowMin || isAboveMax ? 'bg-red-500/5' : ''
                          } ${top10Mode && rankingPosition <= 3 ? 'bg-yellow-500/5' : ''}`}
                        >
                          {top10Mode && (
                            <td className="px-4 py-3">
                              <span className="text-2xl font-bold">
                                {getMedal(rankingPosition)}
                              </span>
                            </td>
                          )}
                          <td className="px-4 py-3">
                            {record.isValid ? (
                              <span className="inline-block px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                                ✓ Válido
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                                ✗ Inválido
                              </span>
                            )}
                            {isBelowMin && (
                              <span className="ml-1 text-xs text-orange-400">(bajo mín)</span>
                            )}
                            {isAboveMax && (
                              <span className="ml-1 text-xs text-orange-400">(sobre máx)</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {formatDate(record.timestamp)}
                          </td>
                          <td className="px-4 py-3 text-sm">{record.sessionName}</td>
                          <td className="px-4 py-3 font-medium">{record.driverName}</td>
                          <td className="px-4 py-3">#{record.lapNumber}</td>
                          <td className={`px-4 py-3 font-mono ${top10Mode && rankingPosition <= 3 ? 'text-yellow-400 font-bold text-lg' : 'text-cyan-400'}`}>
                            {formatTime(record.bestTime)}
                          </td>
                          <td className="px-4 py-3">#{record.kartNumber}</td>
                          {!top10Mode && <td className="px-4 py-3">{record.position}°</td>}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => toggleValidity(record._id, record.isValid)}
                                className="px-2 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs rounded transition"
                                title={record.isValid ? 'Marcar como inválido' : 'Marcar como válido'}
                              >
                                {record.isValid ? '⊗' : '✓'}
                              </button>
                              <button
                                onClick={() => deleteRecord(record._id)}
                                className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded transition"
                                title="Eliminar registro"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!top10Mode && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-800">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                <span className="text-gray-400">
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
