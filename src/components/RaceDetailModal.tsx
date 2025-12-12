'use client';

import React, { useState, useEffect } from 'react';

interface RaceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
  sessionName?: string;
  sessionDate?: Date;
}

export default function RaceDetailModal({
  isOpen,
  onClose,
  sessionId,
  sessionName,
  sessionDate
}: RaceDetailModalProps) {
  const [raceDetails, setRaceDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchRaceDetails();
    }
  }, [isOpen, sessionId]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  const fetchRaceDetails = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/race-sessions-v0/${sessionId}`);

      if (response.ok) {
        const data = await response.json();
        setRaceDetails(data.session);
      }
    } catch (error) {
      console.error('Error fetching race details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    if (!ms || ms === 0) return '--:--';
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(3);
    return `${minutes}:${seconds.padStart(6, '0')}`;
  };

  const getPositionColor = (position: number): string => {
    if (position === 1) return 'text-karting-gold';
    if (position === 2) return 'text-sky-blue';
    if (position === 3) return 'text-rb-blue';
    if (position <= 5) return 'text-electric-blue';
    return 'text-sky-blue/70';
  };

  const getPositionIcon = (position: number): string => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return '🏁';
  };

  const formatSessionName = (name?: string) => {
    if (!name) return 'Detalles de Carrera';

    // Remove [HEAT] and any other brackets
    let formatted = name.replace(/\[HEAT\]/gi, '').replace(/\[.*?\]/g, '').trim();

    // Extract number and type
    const match = formatted.match(/(\d+)\s*-\s*(.+)/);
    if (match) {
      const number = match[1];
      const type = match[2].toLowerCase().trim();

      // Determine if it's Clasificación or Carrera
      if (type.includes('clasificaci') || type.includes('premium')) {
        return `Clasificación #${number}`;
      } else if (type.includes('carrera')) {
        return `Carrera #${number}`;
      } else {
        return `Sesión #${number}`;
      }
    }

    return formatted;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-racing-black/95 to-racing-black/90 border border-electric-blue/30 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-racing-black/95 border-b border-electric-blue/20 p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-electric-blue flex items-center gap-2">
                🏁 {formatSessionName(sessionName)}
              </h2>
              {sessionDate && (
                <p className="text-sm text-sky-blue/70 font-medium mt-1 capitalize">
                  {new Date(sessionDate).toLocaleDateString('es-CL', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-electric-blue">Cargando detalles...</p>
              </div>
            </div>
          ) : raceDetails ? (
            <div className="space-y-6">
              {/* Race Stats Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-black/40 border border-cyan-400/30 rounded-lg p-4 text-center">
                  <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">Pilotos</p>
                  <p className="text-white font-bold text-2xl">{raceDetails.drivers?.length || 0}</p>
                </div>
                <div className="bg-black/40 border border-cyan-400/30 rounded-lg p-4 text-center">
                  <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">Mejor Vuelta</p>
                  <p className="text-karting-gold font-bold text-2xl">{formatTime(raceDetails.bestLap)}</p>
                </div>
                <div className="bg-black/40 border border-cyan-400/30 rounded-lg p-4 text-center">
                  <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">Total Vueltas</p>
                  <p className="text-white font-bold text-2xl">{raceDetails.totalLaps || 0}</p>
                </div>
                <div className="bg-black/40 border border-cyan-400/30 rounded-lg p-4 text-center">
                  <p className="text-blue-300 text-sm uppercase tracking-wider mb-2">Promedio</p>
                  <p className="text-electric-blue font-bold text-2xl">{formatTime(raceDetails.averageTime)}</p>
                </div>
              </div>

              {/* Drivers Results */}
              <div className="bg-black/40 border border-cyan-400/30 rounded-lg p-6">
                <h3 className="text-2xl font-bold text-electric-blue mb-4">📊 Resultados</h3>
                <div className="space-y-2">
                  {raceDetails.drivers?.map((driver: any, index: number) => (
                    <div
                      key={index}
                      className="bg-racing-black/60 border border-sky-blue/10 rounded-lg p-4 hover:border-electric-blue/30 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        {/* Position + Driver */}
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`text-3xl font-bold ${index < 3 ? '' : 'text-sky-blue/70'}`}>
                            {getPositionIcon(index + 1)}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-white text-lg">
                              {driver.driverName}
                            </div>
                            <div className="text-xs text-sky-blue/60 flex gap-4">
                              <span>Kart #{driver.kartNumber}</span>
                              <span>{driver.totalLaps} vueltas</span>
                            </div>
                          </div>
                        </div>

                        {/* Best Time + Position */}
                        <div className="text-right">
                          <div className={`font-mono text-lg font-bold ${getPositionColor(index + 1)}`}>
                            {formatTime(driver.bestTime)}
                          </div>
                          <div className="text-xs text-sky-blue/60">
                            Posición #{index + 1}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">⚠️</div>
              <p>No se pudieron cargar los detalles de la carrera</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
