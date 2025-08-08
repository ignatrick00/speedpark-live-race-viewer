'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface LapData {
  lapNumber: number;
  position: number;
  lapTime: number;
  bestTime: number;
  gapToLeader: string;
  positionChange?: number;
  isPersonalBest?: boolean;
  timestamp: string;
}

interface SessionData {
  _id: string;
  sessionName: string;
  lastLap: string;
  totalLaps: number;
  bestPosition: number;
  bestLapTime: number;
}

interface LapProgressionChartProps {
  webUserId: string;
  selectedSessionId?: string;
}

export default function LapProgressionChart({ webUserId, selectedSessionId }: LapProgressionChartProps) {
  const [recentSessions, setRecentSessions] = useState<SessionData[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>(selectedSessionId || '');
  const [lapProgression, setLapProgression] = useState<LapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch recent sessions on mount
  useEffect(() => {
    fetchRecentSessions();
  }, [webUserId]);

  // Fetch lap progression when session changes
  useEffect(() => {
    if (selectedSession) {
      fetchLapProgression(selectedSession);
    }
  }, [selectedSession, webUserId]);

  const fetchRecentSessions = async () => {
    try {
      const response = await fetch(`/api/lap-capture?action=get_recent_sessions&webUserId=${webUserId}&limit=10`);
      const data = await response.json();
      
      if (data.success) {
        setRecentSessions(data.sessions);
        if (data.sessions.length > 0 && !selectedSession) {
          setSelectedSession(data.sessions[0]._id);
        }
      } else {
        setError('Error loading recent sessions');
      }
    } catch (err) {
      setError('Error fetching sessions');
      console.error('Error fetching sessions:', err);
    }
  };

  const fetchLapProgression = async (sessionId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/lap-capture?action=get_driver_progression&webUserId=${webUserId}&sessionId=${sessionId}`);
      const data = await response.json();
      
      if (data.success) {
        setLapProgression(data.progression);
        setError(null);
      } else {
        setError('Error loading lap progression');
        setLapProgression([]);
      }
    } catch (err) {
      setError('Error fetching lap progression');
      setLapProgression([]);
      console.error('Error fetching lap progression:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeMs: number) => {
    if (!timeMs || timeMs === 0) return '--:--';
    const minutes = Math.floor(timeMs / 60000);
    const seconds = ((timeMs % 60000) / 1000).toFixed(3);
    return `${minutes}:${parseFloat(seconds).toFixed(3).padStart(6, '0')}`;
  };

  const formatGap = (gap: string) => {
    if (!gap || gap === '0.000') return 'LEADER';
    return `+${gap}s`;
  };

  // Custom tooltip for position chart
  const PositionTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 p-3 rounded-lg shadow-lg">
          <p className="text-white font-medium">Vuelta {label}</p>
          <p className="text-cyan-400">Posición: {data.position}</p>
          <p className="text-green-400">Tiempo: {formatTime(data.lapTime)}</p>
          <p className="text-yellow-400">Gap: {formatGap(data.gapToLeader)}</p>
          {data.isPersonalBest && (
            <p className="text-purple-400 font-bold">🏁 ¡MEJOR TIEMPO!</p>
          )}
          {data.positionChange !== 0 && (
            <p className={data.positionChange > 0 ? 'text-red-400' : 'text-green-400'}>
              {data.positionChange > 0 ? '↓' : '↑'} {Math.abs(data.positionChange)} posiciones
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for lap times chart
  const LapTimeTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 p-3 rounded-lg shadow-lg">
          <p className="text-white font-medium">Vuelta {label}</p>
          <p className="text-cyan-400">Tiempo: {formatTime(data.lapTime)}</p>
          <p className="text-yellow-400">Mejor: {formatTime(data.bestTime)}</p>
          {data.isPersonalBest && (
            <p className="text-purple-400 font-bold">🏁 ¡RÉCORD PERSONAL!</p>
          )}
        </div>
      );
    }
    return null;
  };

  if (recentSessions.length === 0 && !loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-400">No hay datos de carreras disponibles</p>
        <p className="text-sm text-gray-500 mt-2">
          Los datos aparecerán después de participar en una sesión
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Session Selector */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-white font-bold text-lg mb-3">📊 Progresión Vuelta por Vuelta</h3>
        
        {recentSessions.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-2">Seleccionar Sesión:</label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="bg-gray-700 text-white p-2 rounded border border-gray-600 focus:border-cyan-400 focus:outline-none"
            >
              <option value="">Seleccionar sesión...</option>
              {recentSessions.map((session) => (
                <option key={session._id} value={session._id}>
                  {session.sessionName} - {session.totalLaps} vueltas - Mejor P{session.bestPosition}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Session Stats */}
        {selectedSession && recentSessions.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {(() => {
              const session = recentSessions.find(s => s._id === selectedSession);
              if (!session) return null;
              
              return (
                <>
                  <div className="bg-gray-700 p-3 rounded">
                    <div className="text-cyan-400 font-bold text-lg">{session.totalLaps}</div>
                    <div className="text-xs text-gray-400">Total Vueltas</div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <div className="text-green-400 font-bold text-lg">P{session.bestPosition}</div>
                    <div className="text-xs text-gray-400">Mejor Posición</div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <div className="text-yellow-400 font-bold text-lg">{formatTime(session.bestLapTime)}</div>
                    <div className="text-xs text-gray-400">Mejor Tiempo</div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <div className="text-purple-400 font-bold text-lg">
                      {new Date(session.lastLap).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-400">Fecha</div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando progresión de vueltas...</p>
        </div>
      ) : error ? (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      ) : lapProgression.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">No hay datos de progresión para esta sesión</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Position Progression Chart */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-4">🏁 Progresión de Posiciones</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={lapProgression}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="lapNumber" 
                  stroke="#9CA3AF"
                  label={{ value: 'Vuelta', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  reversed={true}
                  label={{ value: 'Posición', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
                />
                <Tooltip content={<PositionTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="position" 
                  stroke="#06B6D4" 
                  strokeWidth={2}
                  dot={{ fill: '#06B6D4', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#F59E0B' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Lap Times Chart */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-4">⏱️ Tiempos por Vuelta</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={lapProgression}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="lapNumber" 
                  stroke="#9CA3AF"
                  label={{ value: 'Vuelta', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tickFormatter={formatTime}
                  label={{ value: 'Tiempo', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
                />
                <Tooltip content={<LapTimeTooltip />} />
                <Bar 
                  dataKey="lapTime" 
                  fill={(entry: any) => entry?.isPersonalBest ? '#A855F7' : '#10B981'}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Lap Details Table */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-4">📋 Detalle de Vueltas</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-300">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-2">Vuelta</th>
                    <th className="text-center p-2">Pos</th>
                    <th className="text-right p-2">Tiempo</th>
                    <th className="text-right p-2">Gap</th>
                    <th className="text-center p-2">Cambio</th>
                    <th className="text-center p-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {lapProgression.map((lap, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="p-2 font-medium">{lap.lapNumber}</td>
                      <td className="p-2 text-center font-bold text-cyan-400">P{lap.position}</td>
                      <td className="p-2 text-right font-mono">
                        <span className={lap.isPersonalBest ? 'text-purple-400 font-bold' : 'text-green-400'}>
                          {formatTime(lap.lapTime)}
                        </span>
                      </td>
                      <td className="p-2 text-right text-yellow-400 font-mono text-xs">
                        {formatGap(lap.gapToLeader)}
                      </td>
                      <td className="p-2 text-center">
                        {lap.positionChange !== undefined && lap.positionChange !== 0 && (
                          <span className={lap.positionChange > 0 ? 'text-red-400' : 'text-green-400'}>
                            {lap.positionChange > 0 ? '↓' : '↑'}{Math.abs(lap.positionChange)}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {lap.isPersonalBest && (
                          <span className="text-purple-400 text-xs font-bold">🏁 PB</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}