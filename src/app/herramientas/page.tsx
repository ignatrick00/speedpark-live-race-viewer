'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';

interface KartRanking {
  position: number;
  kartNumber: number;
  avgTop10Time: number;
  bestTime: number;
  totalLaps: number;
}

interface RankingData {
  rankings: KartRanking[];
  totalKartsAnalyzed: number;
  generatedAt: string;
  period: string;
  dateRange: {
    from: string;
    to: string;
  };
}

export default function HerramientasPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [rankingData, setRankingData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user && isAuthenticated) {
      fetchRanking();
    }
  }, [user, isAuthenticated]);

  const fetchRanking = async () => {
    try {
      const response = await fetch('/api/karts-ranking');
      const data = await response.json();

      if (data.success && data.ranking && data.metadata) {
        setRankingData({
          rankings: data.ranking,
          totalKartsAnalyzed: data.metadata.totalKartsAnalyzed,
          generatedAt: data.metadata.generatedAt,
          period: data.metadata.period,
          dateRange: data.metadata.dateRange
        });
      } else {
        setError(data.error || 'No hay datos disponibles');
      }
    } catch (err) {
      console.error('Error fetching ranking:', err);
      setError('Error al cargar el ranking');
    } finally {
      setLoading(false);
    }
  };

  const getMedalColor = (position: number) => {
    if (position === 1) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/40';
    if (position === 2) return 'text-gray-300 bg-gray-300/10 border-gray-300/40';
    if (position === 3) return 'text-orange-500 bg-orange-500/10 border-orange-500/40';
    return 'text-gold bg-gold/5 border-gold/20';
  };

  const getMedalEmoji = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return '';
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-racing-black via-midnight to-racing-black flex items-center justify-center">
        <div className="text-electric-blue text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-racing-black via-midnight to-racing-black px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-racing text-gold mb-2 flex items-center gap-3">
            🔧 HERRAMIENTAS
          </h1>
          <p className="text-sky-blue/80 text-lg">Análisis avanzado de rendimiento de karts</p>
        </div>

        {/* Kart Analyzer Card */}
        <div className="bg-gradient-to-br from-racing-black/80 to-racing-black/60 border border-gold/30 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-racing text-gold flex items-center gap-2">
              🏎️ ANALIZADOR DE KART
            </h2>
            {rankingData && (
              <div className="text-sm text-sky-blue/60">
                {rankingData.totalKartsAnalyzed} karts analizados
              </div>
            )}
          </div>

          {/* Info Banner */}
          <div className="bg-electric-blue/10 border border-electric-blue/30 rounded-lg p-4 mb-6">
            <p className="text-electric-blue text-sm">
              📊 Ranking basado en el promedio de los 10 mejores tiempos de cada kart en los últimos 14 días
            </p>
            <p className="text-sky-blue/60 text-xs mt-1">
              Solo incluye sesiones HEAT (Clasificación y Carrera)
            </p>
          </div>

          {/* Ranking Table */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-16 bg-gold/10 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">❌ {error}</p>
            </div>
          ) : rankingData && rankingData.rankings && rankingData.rankings.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="space-y-2">
                {rankingData.rankings.map((kart) => (
                  <div
                    key={kart.kartNumber}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-all hover:scale-[1.02] ${getMedalColor(
                      kart.position
                    )}`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Position */}
                      <div className="flex items-center gap-2 w-16">
                        <span className="text-2xl font-bold">#{kart.position}</span>
                        {getMedalEmoji(kart.position) && (
                          <span className="text-2xl">{getMedalEmoji(kart.position)}</span>
                        )}
                      </div>

                      {/* Kart Number */}
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-racing">KART</span>
                        <span className="text-3xl font-bold text-white">{kart.kartNumber}</span>
                      </div>

                      {/* Average Time */}
                      <div className="flex-1 min-w-[200px]">
                        <div className="text-xs opacity-60 mb-1">Promedio Top 10</div>
                        <div className="text-2xl font-digital text-white">
                          {(kart.avgTop10Time / 1000).toFixed(3)}s
                        </div>
                      </div>

                      {/* Best Time */}
                      <div className="min-w-[180px]">
                        <div className="text-xs opacity-60 mb-1">Mejor Tiempo</div>
                        <div className="text-xl font-digital text-electric-blue">
                          {(kart.bestTime / 1000).toFixed(3)}s
                        </div>
                      </div>

                      {/* Total Laps */}
                      <div className="min-w-[120px] text-right">
                        <div className="text-xs opacity-60 mb-1">Vueltas</div>
                        <div className="text-xl font-bold">{kart.totalLaps.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sky-blue/60">No hay datos disponibles</p>
            </div>
          )}

          {/* Footer Info */}
          {rankingData && (
            <div className="mt-6 pt-4 border-t border-gold/20">
              <div className="flex flex-wrap gap-4 text-sm text-sky-blue/60">
                <div>
                  📅 Período: {new Date(rankingData.dateRange.from).toLocaleDateString('es-CL')} - {new Date(rankingData.dateRange.to).toLocaleDateString('es-CL')}
                </div>
                <div>
                  🕐 Actualizado: {new Date(rankingData.generatedAt).toLocaleString('es-CL')}
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  );
}
