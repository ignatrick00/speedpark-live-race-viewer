'use client';

import React, { useState, useEffect } from 'react';

interface KartTime {
  position: number;
  kartNumber: number;
  driverName: string;
  bestTime: number;
  sessionName: string;
  sessionDate: string;
  sessionTime: string;
}

type TimeFilter = 'day' | 'week' | 'month';

export default function AllKartsRankingCard() {
  const [kartTimes, setKartTimes] = useState<KartTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TimeFilter>('week');

  useEffect(() => {
    fetchKartTimes();
  }, [filter]);

  const fetchKartTimes = async () => {
    try {
      setLoading(true);
      // Fetch ALL karts, not just top 20
      const response = await fetch(`/api/best-karts?filter=${filter}&limit=50`);
      const data = await response.json();

      if (data.success) {
        setKartTimes(data.bestKarts || []);
      }
    } catch (error) {
      console.error('Error fetching kart times:', error);
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

  const getMedalEmoji = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return null;
  };

  const getFilterLabel = () => {
    switch (filter) {
      case 'day': return 'del Día';
      case 'week': return 'de la Semana';
      case 'month': return 'del Mes';
      default: return 'de la Semana';
    }
  };

  return (
    <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-electric-blue flex items-center gap-2">
          🏎️ Ranking de Karts {getFilterLabel()}
        </h3>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('day')}
            className={`px-3 py-1 text-sm rounded transition-all ${
              filter === 'day'
                ? 'bg-electric-blue text-racing-black font-bold'
                : 'bg-racing-black/50 text-sky-blue/70 hover:bg-racing-black/70'
            }`}
          >
            Día
          </button>
          <button
            onClick={() => setFilter('week')}
            className={`px-3 py-1 text-sm rounded transition-all ${
              filter === 'week'
                ? 'bg-electric-blue text-racing-black font-bold'
                : 'bg-racing-black/50 text-sky-blue/70 hover:bg-racing-black/70'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setFilter('month')}
            className={`px-3 py-1 text-sm rounded transition-all ${
              filter === 'month'
                ? 'bg-electric-blue text-racing-black font-bold'
                : 'bg-racing-black/50 text-sky-blue/70 hover:bg-racing-black/70'
            }`}
          >
            Mes
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center text-gray-400 py-8">Cargando...</div>
      )}

      {/* No Data State */}
      {!loading && kartTimes.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          No hay datos para este período
        </div>
      )}

      {/* Karts Grid - Muestra TODOS los karts en grid */}
      {!loading && kartTimes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-2">
          {kartTimes.map((kart) => (
            <div
              key={kart.kartNumber}
              className="bg-racing-black/40 border border-sky-blue/10 rounded-lg p-3 hover:border-electric-blue/30 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                {/* Kart Number */}
                <div className="flex items-center gap-2">
                  {getMedalEmoji(kart.position) && (
                    <span className="text-xl">{getMedalEmoji(kart.position)}</span>
                  )}
                  <div className="font-bold text-white text-lg">
                    Kart #{kart.kartNumber}
                  </div>
                </div>

                {/* Position Badge */}
                <div className={`text-xs px-2 py-1 rounded ${
                  kart.position <= 3
                    ? 'bg-karting-gold/20 text-karting-gold'
                    : kart.position <= 10
                    ? 'bg-electric-blue/20 text-electric-blue'
                    : 'bg-sky-blue/10 text-sky-blue/70'
                }`}>
                  #{kart.position}
                </div>
              </div>

              {/* Driver Name */}
              <div className="text-sm text-sky-blue/80 mb-2">
                {kart.driverName}
              </div>

              {/* Time */}
              <div className={`font-mono text-base font-bold ${
                kart.position === 1
                  ? 'text-karting-gold'
                  : kart.position === 2
                  ? 'text-gray-300'
                  : kart.position === 3
                  ? 'text-orange-400'
                  : 'text-electric-blue'
              }`}>
                {formatTime(kart.bestTime)}
              </div>

              {/* Session Info */}
              <div className="text-xs text-sky-blue/50 mt-1">
                {kart.sessionTime}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total Count */}
      {!loading && kartTimes.length > 0 && (
        <div className="mt-4 pt-4 border-t border-sky-blue/10 text-center text-sm text-sky-blue/60">
          Mostrando {kartTimes.length} karts
        </div>
      )}
    </div>
  );
}
