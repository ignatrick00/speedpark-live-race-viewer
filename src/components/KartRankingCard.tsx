'use client';

import { useState, useEffect } from 'react';

interface KartRank {
  position: number;
  kartNumber: number;
  avgTop10Time: number;
  bestTime: number;
  totalLaps: number;
}

interface KartRankingCardProps {
  userFavoriteKart?: number;
}

export default function KartRankingCard({ userFavoriteKart }: KartRankingCardProps) {
  const [ranking, setRanking] = useState<KartRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    try {
      const response = await fetch('/api/karts-ranking');
      const data = await response.json();

      if (data.success) {
        setRanking(data.ranking.slice(0, 15)); // Top 15
        setMetadata(data.metadata);
      } else {
        console.error('Error fetching kart ranking:', data.error);
      }
    } catch (error) {
      console.error('Error fetching kart ranking:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(3);
    return `${minutes}:${seconds.padStart(6, '0')}`;
  };

  const getMedalColor = (position: number) => {
    if (position === 1) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/40';
    if (position === 2) return 'text-gray-300 bg-gray-300/10 border-gray-300/40';
    if (position === 3) return 'text-orange-500 bg-orange-500/10 border-orange-500/40';
    return 'text-gold bg-gold/5 border-gold/20';
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-racing-black/80 to-racing-black/60 border border-gold/30 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-gold/20 rounded w-2/3 mb-4"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-black/30 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (ranking.length === 0) {
    return (
      <div className="bg-gradient-to-br from-racing-black/80 to-racing-black/60 border border-gold/30 rounded-xl p-6">
        <h3 className="text-xl font-racing text-gold mb-2">🏎️ RANKING DE KARTS</h3>
        <p className="text-sky-blue/60 text-sm">No hay datos suficientes para generar el ranking</p>
        <p className="text-sky-blue/40 text-xs mt-2">
          Ejecuta: <code className="bg-black/30 px-2 py-1 rounded">node scripts/calculate-kart-ranking.js</code>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-racing-black/80 to-racing-black/60 border border-gold/30 rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-racing text-gold">
          🏎️ RANKING DE KARTS
        </h3>
        <div className="text-right">
          <span className="text-xs text-sky-blue/60 block">Últimos 14 días</span>
          {metadata && (
            <span className="text-xs text-sky-blue/40">
              {metadata.totalKartsAnalyzed} karts
            </span>
          )}
        </div>
      </div>

      {/* Ranking List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {ranking.map((kart) => {
          const isUserFavorite = kart.kartNumber === userFavoriteKart;

          return (
            <div
              key={kart.kartNumber}
              className={`bg-black/30 rounded-lg p-3 flex items-center gap-3 transition-all hover:bg-black/40 ${
                isUserFavorite ? 'ring-2 ring-electric-blue/50' : ''
              }`}
            >
              {/* Posición */}
              <div className={`text-lg font-bold w-10 h-10 rounded-full flex items-center justify-center border-2 ${getMedalColor(kart.position)}`}>
                {kart.position}
              </div>

              {/* Kart Number */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-racing text-lg">
                    KART #{kart.kartNumber}
                  </span>
                  {isUserFavorite && (
                    <span className="text-xs bg-electric-blue/20 text-electric-blue px-2 py-0.5 rounded border border-electric-blue/40">
                      ⭐ FAVORITO
                    </span>
                  )}
                </div>
                <div className="text-xs text-sky-blue/50">
                  {kart.totalLaps} vueltas registradas
                </div>
              </div>

              {/* Tiempos */}
              <div className="text-right">
                <div className="text-electric-blue font-digital text-base font-bold">
                  {formatTime(kart.avgTop10Time)}
                </div>
                <div className="text-xs text-sky-blue/60">
                  ø Top 10
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      {metadata && (
        <div className="mt-4 pt-4 border-t border-gold/20 text-xs text-sky-blue/60 text-center">
          Actualizado hace {metadata.ageMinutes} minutos
        </div>
      )}
    </div>
  );
}
