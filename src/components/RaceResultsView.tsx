'use client';

import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';

interface DriverResult {
  driverName: string;
  position: number;
  finalPosition: number;
  bestTime: number;
  lastTime: number;
  averageTime: number;
  totalLaps: number;
  kartNumber: number;
  laps: any[];
}

interface RaceDetails {
  sessionId: string;
  sessionName: string;
  sessionDate: string;
  sessionType: string;
  totalDrivers: number;
  totalLaps: number;
  drivers: DriverResult[];
}

interface RaceResultsViewProps {
  raceDetails: RaceDetails;
  highlightedParticipants?: Array<{ name: string; kartNumber: number; userId?: string }>;
  onBack?: () => void;
  showBackButton?: boolean;
}

export default function RaceResultsView({
  raceDetails,
  highlightedParticipants = [],
  onBack,
  showBackButton = true
}: RaceResultsViewProps) {
  const [highlightedDriver, setHighlightedDriver] = useState<string | null>(null);

  const formatTime = (timeMs: number) => {
    if (!timeMs || timeMs === 0) return '--:--';
    const minutes = Math.floor(timeMs / 60000);
    const seconds = ((timeMs % 60000) / 1000).toFixed(3);
    return `${minutes}:${parseFloat(seconds).toFixed(3).padStart(6, '0')}`;
  };

  const getPositionColor = (position: number) => {
    if (position === 1) return 'text-karting-gold';
    if (position === 2) return 'text-gray-300';
    if (position === 3) return 'text-orange-400';
    return 'text-electric-blue';
  };

  const getMedalEmoji = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `#${position}`;
  };

  const isParticipant = (driverName: string) => {
    return highlightedParticipants.some(p =>
      driverName.toLowerCase().includes(p.name.toLowerCase()) ||
      p.name.toLowerCase().includes(driverName.toLowerCase())
    );
  };

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
    '#EC7063', '#AF7AC5', '#5DADE2', '#48C9B0', '#F4D03F',
    '#EB984E', '#A569BD', '#5499C7', '#45B39D', '#F5B041',
    '#DC7633', '#9B59B6', '#3498DB', '#1ABC9C', '#F39C12',
    '#E74C3C', '#8E44AD', '#2980B9', '#16A085', '#D68910'
  ];

  // Memoize chart data to prevent recalculation on every render
  const positionChartData = useMemo(() => {
    if (!raceDetails || raceDetails.drivers.length === 0) return [];

    const maxLaps = Math.max(...raceDetails.drivers.map(d => d.laps?.length || 0));
    const chartData: any[] = [];

    for (let lapNum = 1; lapNum <= maxLaps; lapNum++) {
      const lapData: any = { lap: lapNum };

      raceDetails.drivers.forEach((driver: any) => {
        const lap = driver.laps?.find((l: any) => l.lapNumber === lapNum);
        if (lap) {
          lapData[driver.driverName] = lap.finalPosition || lap.position;
        }
      });

      chartData.push(lapData);
    }

    return chartData;
  }, [raceDetails]);

  const timeChartData = useMemo(() => {
    if (!raceDetails || raceDetails.drivers.length === 0) return [];

    const maxLaps = Math.max(...raceDetails.drivers.map(d => d.laps?.length || 0));
    const chartData: any[] = [];

    for (let lapNum = 1; lapNum <= maxLaps; lapNum++) {
      const lapData: any = { lap: lapNum };

      raceDetails.drivers.forEach((driver: any) => {
        const lap = driver.laps?.find((l: any) => l.lapNumber === lapNum);
        if (lap && lap.time > 0) {
          lapData[driver.driverName] = (lap.time / 1000).toFixed(2);
        }
      });

      chartData.push(lapData);
    }

    return chartData;
  }, [raceDetails]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-racing text-electric-blue mb-1">
            🏁 {raceDetails.sessionName}
          </h3>
          <p className="text-sm text-sky-blue/60">
            {new Date(raceDetails.sessionDate).toLocaleDateString('es-CL')} • {' '}
            {new Date(raceDetails.sessionDate).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: true })} • {' '}
            {raceDetails.totalDrivers} pilotos
          </p>
        </div>
        {showBackButton && onBack && (
          <button
            onClick={onBack}
            className="text-electric-blue hover:text-cyan-400 font-racing text-lg px-4 py-2 border border-electric-blue/30 rounded-lg hover:bg-electric-blue/10 transition-colors"
          >
            ← Volver
          </button>
        )}
      </div>

      {/* Participants highlight */}
      {highlightedParticipants.length > 0 && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-sm text-green-400 mb-2 font-racing">
            👥 Participantes destacados:
          </p>
          <div className="flex flex-wrap gap-2">
            {highlightedParticipants.map((p, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-green-500/20 border border-green-400/30 text-green-300 rounded-full text-sm"
              >
                {p.name} (Kart #{p.kartNumber})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Results Table */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full">
          <thead>
            <tr className="border-b border-electric-blue/20">
              <th className="text-left py-3 px-4 text-sky-blue/70 font-racing text-sm">Pos</th>
              <th className="text-left py-3 px-4 text-sky-blue/70 font-racing text-sm">Piloto</th>
              <th className="text-left py-3 px-4 text-sky-blue/70 font-racing text-sm">Kart</th>
              <th className="text-left py-3 px-4 text-sky-blue/70 font-racing text-sm">Vueltas</th>
              <th className="text-left py-3 px-4 text-sky-blue/70 font-racing text-sm">Mejor Vuelta</th>
              <th className="text-left py-3 px-4 text-sky-blue/70 font-racing text-sm">Última Vuelta</th>
              <th className="text-left py-3 px-4 text-sky-blue/70 font-racing text-sm">Promedio</th>
            </tr>
          </thead>
          <tbody>
            {raceDetails.drivers.map((driver) => {
              const isPart = isParticipant(driver.driverName);
              return (
                <tr
                  key={driver.position}
                  className={`border-b border-electric-blue/10 hover:bg-electric-blue/5 cursor-pointer transition-colors ${
                    isPart ? 'bg-green-500/10' : ''
                  }`}
                  onMouseEnter={() => setHighlightedDriver(driver.driverName)}
                  onMouseLeave={() => setHighlightedDriver(null)}
                >
                  <td className={`py-3 px-4 font-racing ${getPositionColor(driver.finalPosition || driver.position)}`}>
                    {getMedalEmoji(driver.finalPosition || driver.position)}
                  </td>
                  <td className="py-3 px-4 text-white font-medium">
                    {driver.driverName}
                    {isPart && <span className="ml-2 text-green-400">✓</span>}
                  </td>
                  <td className="py-3 px-4 text-gold font-digital">#{driver.kartNumber}</td>
                  <td className="py-3 px-4 text-sky-blue">{driver.totalLaps}</td>
                  <td className="py-3 px-4 text-electric-blue font-digital">{formatTime(driver.bestTime)}</td>
                  <td className="py-3 px-4 text-sky-blue/70 font-digital">{formatTime(driver.lastTime)}</td>
                  <td className="py-3 px-4 text-sky-blue/70 font-digital">{formatTime(driver.averageTime)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Position Chart */}
      <div className="mb-8">
        <h4 className="text-lg font-racing text-electric-blue mb-4">
          📊 Evolución de Posiciones por Vuelta
        </h4>
        <div className="bg-racing-black/50 border border-electric-blue/20 rounded-lg p-4">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={positionChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
              <XAxis
                dataKey="lap"
                stroke="#7dd3fc"
                label={{ value: 'Vuelta', position: 'insideBottom', offset: -5, fill: '#7dd3fc' }}
              />
              <YAxis
                domain={[1, 'dataMax']}
                stroke="#7dd3fc"
                label={{ value: 'Posición', angle: -90, position: 'insideLeft', fill: '#7dd3fc' }}
              />
              <Legend />
              {raceDetails.drivers.map((driver, idx) => (
                <Line
                  key={driver.driverName}
                  type="monotone"
                  dataKey={driver.driverName}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={highlightedDriver === driver.driverName ? 3 : 1}
                  opacity={highlightedDriver === null || highlightedDriver === driver.driverName ? 1 : 0.2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Time Chart */}
      <div>
        <h4 className="text-lg font-racing text-electric-blue mb-4">
          ⏱️ Evolución de Tiempos por Vuelta
        </h4>
        <div className="bg-racing-black/50 border border-electric-blue/20 rounded-lg p-4">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
              <XAxis
                dataKey="lap"
                stroke="#7dd3fc"
                label={{ value: 'Vuelta', position: 'insideBottom', offset: -5, fill: '#7dd3fc' }}
              />
              <YAxis
                stroke="#7dd3fc"
              />
              <Legend />
              {raceDetails.drivers.map((driver, idx) => (
                <Line
                  key={driver.driverName}
                  type="monotone"
                  dataKey={driver.driverName}
                  stroke={colors[idx % colors.length]}
                  strokeWidth={highlightedDriver === driver.driverName ? 3 : 1}
                  opacity={highlightedDriver === null || highlightedDriver === driver.driverName ? 1 : 0.2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
