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

export default function TopDriversDaySidebar() {
  const [bestTimes, setBestTimes] = useState<BestTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    fetchBestTimes();
    const interval = setInterval(fetchBestTimes, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchBestTimes = async () => {
    try {
      // Only show loading on first load, not on refreshes
      if (isFirstLoad) {
        console.log('🔵 TopDriversDaySidebar: FIRST LOAD - showing loading');
        setLoading(true);
      } else {
        console.log('🟢 TopDriversDaySidebar: REFRESH - keeping data visible');
      }

      const response = await fetch('/api/best-times-v2?filter=day');
      const data = await response.json();

      if (data.success) {
        console.log(`📊 TopDriversDaySidebar [V2]: Updated with ${data.bestTimesNew?.length || 0} drivers from driver_race_data`);
        setBestTimes(data.bestTimesNew || []);
      }
    } catch (error) {
      console.error('Error fetching best times:', error);
    } finally {
      if (isFirstLoad) {
        setLoading(false);
        setIsFirstLoad(false);
        console.log('✅ TopDriversDaySidebar: First load complete, future refreshes will be smooth');
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

  return (
    <section className="bg-black/30 backdrop-blur-sm border border-blue-800/30 rounded-2xl p-6 h-fit">
      <h3 className="font-racing text-2xl text-white mb-6 tracking-wider">
        🏆 <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-400 to-white">Top 10 del Día</span>
      </h3>

      <div className="space-y-3">
        {/* Show loading ONLY on first load when no data yet */}
        {loading && bestTimes.length === 0 && (
          <div className="text-center text-blue-300 py-4">Cargando mejores del día...</div>
        )}

        {/* Show "no data" only when not loading and confirmed no data */}
        {!loading && bestTimes.length === 0 && (
          <div className="text-center text-blue-300 py-4">No hay datos del día</div>
        )}

        {/* ALWAYS show data when available, even during background refresh */}
        {bestTimes.length > 0 && bestTimes.map((entry) => (
          <div
            key={entry.position}
            className={`flex items-center justify-between p-3 bg-black/30 rounded-xl border-l-3 transition-all duration-300 hover:bg-blue-900/10 hover:transform hover:translate-x-1 ${
              entry.position === 1 ? 'border-l-yellow-400 bg-gradient-to-r from-yellow-400/10 to-black/30' :
              entry.position === 2 ? 'border-l-gray-300 bg-gradient-to-r from-gray-300/10 to-black/30' :
              entry.position === 3 ? 'border-l-orange-600 bg-gradient-to-r from-orange-600/10 to-black/30' :
              'border-l-blue-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${
                entry.position === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black shadow-lg shadow-yellow-400/60' :
                entry.position === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black shadow-lg shadow-gray-400/60' :
                entry.position === 3 ? 'bg-gradient-to-br from-orange-600 to-orange-800 text-white shadow-lg shadow-orange-600/60' :
                'bg-blue-900/30 text-white border border-cyan-400'
              }`}>
                {entry.position}
              </div>
              <div className="flex-1">
                <div className="font-racing text-white font-semibold uppercase tracking-wide text-sm">{entry.driverName}</div>
                <div className="text-sky-400 text-xs">Kart #{entry.kartNumber} • {entry.sessionDateTime || entry.sessionTime}</div>
              </div>
            </div>
            <div className="font-digital text-cyan-400 text-lg font-bold">{formatTime(entry.bestTime)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
