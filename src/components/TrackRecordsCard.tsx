'use client';

import React, { useState, useEffect } from 'react';

interface KartRecord {
  kartNumber: number;
  bestTime: number;
  driverName: string;
  sessionDate: Date;
}

export default function TrackRecordsCard() {
  const [records, setRecords] = useState<KartRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrackRecords();
  }, []);

  const fetchTrackRecords = async () => {
    try {
      setLoading(true);
      // 🆕 Usar race_sessions_v0 - obtener mejores tiempos por kart
      const response = await fetch('/api/best-times-v0?period=all&type=karts');
      const data = await response.json();

      if (data.success) {
        // Convertir formato de V0 a formato esperado
        const formattedRecords = data.bestTimes.map((item: any) => ({
          kartNumber: item.kart,
          bestTime: parseTime(item.time), // Convertir string "M:SS.mmm" a milisegundos
          driverName: item.driver,
          sessionDate: new Date(item.date)
        }));
        setRecords(formattedRecords);
        setError(null);
      } else {
        setError('Error cargando récords');
      }
    } catch (err) {
      setError('Error obteniendo datos');
      console.error('Error fetching track records:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper: Convertir tiempo "M:SS.mmm" a milisegundos
  const parseTime = (timeString: string): number => {
    if (!timeString || timeString === '--:--.---') return 0;
    const parts = timeString.split(':');
    if (parts.length !== 2) return 0;
    const minutes = parseInt(parts[0]);
    const secondsParts = parts[1].split('.');
    const seconds = parseInt(secondsParts[0]);
    const milliseconds = parseInt(secondsParts[1] || '0');
    return (minutes * 60000) + (seconds * 1000) + milliseconds;
  };

  const formatTime = (timeMs: number) => {
    if (!timeMs || timeMs === 0) return '--:--';
    const minutes = Math.floor(timeMs / 60000);
    const seconds = ((timeMs % 60000) / 1000).toFixed(3);
    return `${minutes}:${parseFloat(seconds).toFixed(3).padStart(6, '0')}`;
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-purple-500/20 rounded-lg p-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">🏎️ Récords del Circuito</h3>
        <div className="text-center text-gray-400 py-8">Cargando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-purple-500/20 rounded-lg p-6">
        <h3 className="text-xl font-bold text-purple-400 mb-4">🏎️ Récords del Circuito</h3>
        <div className="text-center text-red-400 py-8">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-purple-500/20 rounded-lg p-6">
      <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
        <span>🏎️</span>
        <span>Récords del Circuito</span>
        <span className="text-sm text-sky-blue/70 font-normal ml-auto">Mejores Karts</span>
      </h3>

      {records.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          No hay récords disponibles
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {records.slice(0, 12).map((record, index) => (
            <div
              key={record.kartNumber}
              className={`
                p-3 rounded-lg border transition-all duration-200
                ${index === 0
                  ? 'bg-gradient-to-br from-karting-gold/20 to-electric-blue/10 border-karting-gold/40'
                  : 'bg-racing-black/50 border-gray-700/30'
                }
                hover:border-purple-400/50 hover:scale-105
              `}
            >
              {/* Kart Number */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Kart</span>
                <span className={`text-2xl font-bold ${index === 0 ? 'text-karting-gold' : 'text-purple-400'}`}>
                  #{record.kartNumber}
                </span>
              </div>

              {/* Best Time */}
              <div className="text-center mb-2">
                <div className={`text-lg font-bold ${index === 0 ? 'text-karting-gold' : 'text-white'}`}>
                  {formatTime(record.bestTime)}
                </div>
                {index === 0 && (
                  <div className="text-xs text-karting-gold/70">🏆 Récord</div>
                )}
              </div>

              {/* Driver */}
              <div className="text-xs text-sky-blue/70 text-center truncate">
                {record.driverName}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <p className="text-xs text-gray-500 text-center">
          Mejores tiempos registrados por kart
        </p>
      </div>
    </div>
  );
}
