'use client';

import React, { useState, useEffect } from 'react';

interface BestTime {
  position: number;
  driverName: string;
  bestTime: number;
  kartNumber: number;
  sessionName: string;
  sessionDate: string;
  sessionTime: string;
  sessionDateTime?: string;
}

export default function TopDriversV0Day() {
  const [bestTimes, setBestTimes] = useState<BestTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default: hoy en Chile en formato YYYY-MM-DD
    const today = new Date();
    const chileDate = today.toLocaleDateString('en-CA', {
      timeZone: 'America/Santiago'
    }); // en-CA da formato YYYY-MM-DD
    return chileDate;
  });

  useEffect(() => {
    fetchBestTimes();
    const interval = setInterval(fetchBestTimes, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, [selectedDate]); // Re-fetch cuando cambia la fecha

  const fetchBestTimes = async () => {
    try {
      if (isFirstLoad) {
        setLoading(true);
      }
      // Enviar fecha seleccionada al API
      const response = await fetch(`/api/best-times-v0?period=day&type=drivers&date=${selectedDate}`);
      const data = await response.json();

      if (data.success) {
        setBestTimes(data.bestTimes || []);
      }
    } catch (error) {
      console.error('Error fetching best times:', error);
    } finally {
      if (isFirstLoad) {
        setLoading(false);
        setIsFirstLoad(false);
      }
    }
  };

  const formatTime = (timeMs: number) => {
    if (!timeMs || timeMs === 0) return '--:--';
    const minutes = Math.floor(timeMs / 60000);
    const seconds = ((timeMs % 60000) / 1000).toFixed(3);
    return `${minutes}:${parseFloat(seconds).toFixed(3).padStart(6, '0')}`;
  };

  const getMedalEmoji = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return null;
  };

  // Format current date as "Lunes 11"
  const formatCurrentDate = () => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const date = new Date(selectedDate);
    const dayName = days[date.getDay()];
    const dayNumber = date.getDate();
    return `${dayName} ${dayNumber}`;
  };

  return (
    <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-bold text-electric-blue flex items-center gap-2">
            🏆 Top 5 Pilotos del Día
          </h3>
        </div>

        {/* Current Date Display (read-only) */}
        <div className="text-sm text-sky-blue/70 font-medium">
          {formatCurrentDate()}
        </div>
      </div>

      {/* Loading State - ONLY on first load when no data yet */}
      {loading && bestTimes.length === 0 && (
        <div className="text-center text-gray-400 py-8">Cargando...</div>
      )}

      {/* No Data State - only when not loading and confirmed no data */}
      {!loading && bestTimes.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          No hay datos para este período
        </div>
      )}

      {/* Best Times List - ALWAYS show when data available */}
      {bestTimes.length > 0 && (
        <div className="space-y-3">
          {bestTimes.slice(0, 5).map((entry) => (
            <div
              key={entry.position}
              className="bg-racing-black/40 border border-sky-blue/10 rounded-lg p-4 hover:border-electric-blue/30 transition-all"
            >
              <div className="flex items-center justify-between">
                {/* Left: Position + Driver */}
                <div className="flex items-center gap-3 flex-1">
                  <div className={`text-2xl font-bold ${
                    entry.position <= 3 ? '' : 'text-sky-blue/70'
                  }`}>
                    {getMedalEmoji(entry.position) || `#${entry.position}`}
                  </div>

                  <div className="flex-1">
                    <div className="font-bold text-white text-lg">
                      {entry.driverName}
                    </div>
                    <div className="text-xs text-sky-blue/60">
                      Kart #{entry.kartNumber} • {entry.sessionDateTime || entry.sessionTime}
                    </div>
                  </div>
                </div>

                {/* Right: Time */}
                <div className="text-right">
                  <div className={`font-mono text-lg font-bold ${
                    entry.position === 1
                      ? 'text-karting-gold'
                      : entry.position === 2
                      ? 'text-gray-300'
                      : entry.position === 3
                      ? 'text-orange-400'
                      : 'text-electric-blue'
                  }`}>
                    {formatTime(entry.bestTime)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
