'use client';

import React, { useState, useEffect } from 'react';

interface BestKart {
  position: number;
  kart: number;
  time: string;
  driver: string;
  session: string;
  date: string;
}

export default function TopKartsDayV0() {
  const [bestKarts, setBestKarts] = useState<BestKart[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default: hoy en Chile en formato YYYY-MM-DD
    const today = new Date();
    const chileDate = today.toLocaleDateString('en-CA', {
      timeZone: 'America/Santiago'
    }); // en-CA da formato YYYY-MM-DD
    return chileDate;
  });

  useEffect(() => {
    fetchBestKarts();
    const interval = setInterval(fetchBestKarts, 10000); // Auto-refresh every 10s
    return () => clearInterval(interval);
  }, [selectedDate]); // Re-fetch cuando cambia la fecha

  // Lock/unlock body scroll when modal opens/closes
  useEffect(() => {
    if (showModal) {
      // Prevent scrolling on the body
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      // Re-enable scrolling
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [showModal]);

  const fetchBestKarts = async () => {
    try {
      if (isFirstLoad) {
        setLoading(true);
      }
      // Enviar fecha seleccionada al API
      const response = await fetch(`/api/best-times-v0?period=day&type=karts&date=${selectedDate}`);
      const data = await response.json();

      if (data.success) {
        setBestKarts(data.bestTimes || []);
      }
    } catch (error) {
      console.error('Error fetching best karts:', error);
    } finally {
      if (isFirstLoad) {
        setLoading(false);
        setIsFirstLoad(false);
      }
    }
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
    // Parsear la fecha en timezone de Chile para evitar desfase de días
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day); // Crear fecha local (no UTC)
    const dayName = days[date.getDay()];
    const dayNumber = date.getDate();

    console.log('🔍 [TopKarts] selectedDate:', selectedDate);
    console.log('🔍 [TopKarts] Parsed:', { year, month, day });
    console.log('🔍 [TopKarts] date.getDay():', date.getDay(), 'dayName:', dayName);
    console.log('🔍 [TopKarts] Final:', `${dayName} ${dayNumber}`);

    return `${dayName} ${dayNumber}`;
  };

  return (
    <>
      <div
        className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6 cursor-pointer hover:border-electric-blue/40 transition-all"
        onClick={() => setShowModal(true)}
      >
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold text-electric-blue flex items-center gap-2">
              🏎️ Top Karts del Día
            </h3>
          </div>

          {/* Current Date Display (read-only) */}
          <div className="text-sm text-sky-blue/70 font-medium">
            {formatCurrentDate()}
          </div>
        </div>

      {/* Loading State - ONLY on first load when no data yet */}
      {loading && bestKarts.length === 0 && (
        <div className="text-center text-gray-400 py-8">Cargando...</div>
      )}

      {/* No Data State - only when not loading and confirmed no data */}
      {!loading && bestKarts.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          No hay datos para este período
        </div>
      )}

      {/* Best Karts List - ALWAYS show when data available */}
      {bestKarts.length > 0 && (
        <div className="space-y-3">
          {bestKarts.slice(0, 5).map((entry) => (
            <div
              key={entry.position}
              className="bg-racing-black/40 border border-sky-blue/10 rounded-lg p-4 hover:border-electric-blue/30 transition-all"
            >
              <div className="flex items-center justify-between">
                {/* Left: Position + Kart */}
                <div className="flex items-center gap-3 flex-1">
                  <div className={`text-2xl font-bold ${
                    entry.position <= 3 ? '' : 'text-sky-blue/70'
                  }`}>
                    {getMedalEmoji(entry.position) || `#${entry.position}`}
                  </div>

                  <div className="flex-1">
                    <div className="font-bold text-white text-lg">
                      Kart #{entry.kart}
                    </div>
                    <div className="text-xs text-sky-blue/60">
                      {entry.driver} • {entry.date}
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
                    {entry.time}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Modal for Top 20 Karts */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-gradient-to-br from-racing-black/95 to-racing-black/90 border border-electric-blue/30 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-racing-black/95 border-b border-electric-blue/20 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-electric-blue flex items-center gap-2">
                    🏎️ Top 20 Karts del Día
                  </h2>
                  <p className="text-sm text-sky-blue/70 font-medium mt-1">
                    {formatCurrentDate()}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white transition-colors text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {loading && bestKarts.length === 0 ? (
                <div className="text-center text-gray-400 py-8">Cargando...</div>
              ) : bestKarts.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  No hay datos para este período
                </div>
              ) : (
                <div className="space-y-3">
                  {bestKarts.slice(0, 20).map((entry) => (
                    <div
                      key={entry.position}
                      className="bg-racing-black/40 border border-sky-blue/10 rounded-lg p-4 hover:border-electric-blue/30 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        {/* Left: Position + Kart */}
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`text-2xl font-bold ${
                            entry.position <= 3 ? '' : 'text-sky-blue/70'
                          }`}>
                            {getMedalEmoji(entry.position) || `#${entry.position}`}
                          </div>

                          <div className="flex-1">
                            <div className="font-bold text-white text-lg">
                              Kart #{entry.kart}
                            </div>
                            <div className="text-xs text-sky-blue/60">
                              {entry.driver} • {entry.date}
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
                            {entry.time}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
