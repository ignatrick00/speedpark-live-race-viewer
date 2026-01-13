'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
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
  const [showAll, setShowAll] = useState(false);
  const [selectedKart, setSelectedKart] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

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

  const getStarRating = (position: number) => {
    if (position <= 3) return 5;
    if (position <= 10) return 4;
    if (position <= 20) return 3;
    return 2;
  };

  const renderStars = (rating: number) => {
    const filled = '⭐';
    const empty = '☆';
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < rating ? 'text-yellow-400 text-lg' : 'text-gray-600 text-lg'}>
            {i < rating ? filled : empty}
          </span>
        ))}
      </div>
    );
  };

  const calculateDelta = (currentTime: number, bestTime: number) => {
    const delta = currentTime - bestTime;
    return delta > 0 ? `+${(delta / 1000).toFixed(3)}s` : null;
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
        <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-racing text-gold mb-2 flex items-center gap-3">
            🔧 HERRAMIENTAS
          </h1>
          <p className="text-sky-blue/80 text-lg">Análisis avanzado de rendimiento de karts</p>
        </div>

        {/* Kart Analyzer Card */}
        <div className="bg-gradient-to-br from-racing-black/80 to-racing-black/60 border border-gold/30 rounded-xl p-6 shadow-lg">
          <div className="mb-6">
            <h2 className="text-2xl font-racing text-gold flex items-center gap-2">
              🏎️ ANALIZADOR DE KART
            </h2>
          </div>

          {/* Kart Selector - Custom Dropdown */}
          {rankingData && rankingData.rankings && rankingData.rankings.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm text-sky-blue/80 mb-3">🔍 Buscar mi kart:</label>
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-racing-black border-2 border-electric-blue/30 text-white px-4 py-3 rounded-lg font-bold hover:border-electric-blue hover:shadow-lg hover:shadow-electric-blue/20 transition-all focus:outline-none focus:ring-2 focus:ring-electric-blue flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-electric-blue text-xl">🏎️</span>
                    <span className="font-racing text-lg tracking-wide">
                      {selectedKart
                        ? `Kart #${selectedKart.toString().padStart(2, '0')}`
                        : 'Seleccionar kart...'
                      }
                    </span>
                  </div>
                  <span className={`text-sky-blue transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute top-full mt-2 left-0 right-0 bg-midnight border-2 border-electric-blue/40 rounded-xl shadow-2xl shadow-electric-blue/10 p-2 z-50 animate-in fade-in duration-200 max-h-[300px] overflow-y-auto">
                    {/* Reset Option */}
                    <button
                      onClick={() => {
                        setSelectedKart(null);
                        setIsDropdownOpen(false);
                      }}
                      className={`
                        w-full px-4 py-2.5 rounded-lg font-bold text-left transition-all mb-1 flex items-center gap-3
                        ${!selectedKart
                          ? 'bg-karting-gold text-midnight shadow-lg shadow-karting-gold/30'
                          : 'text-white hover:bg-sky-blue/20 hover:text-sky-blue'
                        }
                      `}
                    >
                      <span className="text-lg">✖️</span>
                      <span className="font-racing">Limpiar selección</span>
                    </button>

                    {[...rankingData.rankings]
                      .sort((a, b) => a.kartNumber - b.kartNumber)
                      .map((kart) => (
                        <button
                          key={kart.kartNumber}
                          onClick={() => {
                            setSelectedKart(kart.kartNumber);
                            setIsDropdownOpen(false);
                          }}
                          className={`
                            w-full px-4 py-2.5 rounded-lg font-bold text-left transition-all mb-1 flex items-center justify-between
                            ${selectedKart === kart.kartNumber
                              ? 'bg-karting-gold text-midnight shadow-lg shadow-karting-gold/30'
                              : 'text-white hover:bg-sky-blue/20 hover:text-sky-blue'
                            }
                          `}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">🏎️</span>
                            <span className="font-racing text-base">
                              Kart #{kart.kartNumber.toString().padStart(2, '0')}
                            </span>
                          </div>
                          <span className="text-xs opacity-70">
                            Pos. #{kart.position}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Info Banner */}
          <div className="bg-electric-blue/10 border border-electric-blue/30 rounded-lg p-3 mb-4">
            <p className="text-electric-blue text-xs">
              📊 Ranking basado en promedio de top 10 tiempos
            </p>
          </div>

          {/* Selected Kart Info - Moved Above Ranking */}
          {!loading && rankingData && selectedKart && (
            <div className="mb-4 p-4 bg-electric-blue/10 border border-electric-blue/30 rounded-lg">
              {(() => {
                const kart = rankingData.rankings.find(k => k.kartNumber === selectedKart);
                if (!kart) return null;
                const bestKartTime = rankingData.rankings[0].avgTop10Time;
                const delta = calculateDelta(kart.avgTop10Time, bestKartTime);
                const stars = getStarRating(kart.position);

                return (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-electric-blue font-bold text-base">Kart #{selectedKart}</span>
                      <span className="text-yellow-400 font-bold">Posición #{kart.position}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sky-blue/70 text-sm">Clasificación:</span>
                      <div className="flex gap-0.5">
                        {renderStars(stars)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sky-blue/70 text-sm">Promedio:</span>
                      <span className="text-white font-digital text-lg">{(kart.avgTop10Time / 1000).toFixed(3)}s</span>
                    </div>
                    {delta && (
                      <div className="flex items-center justify-between">
                        <span className="text-sky-blue/70 text-sm">Diferencia con #1:</span>
                        <span className="text-red-400/80 font-mono text-sm">{delta}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Ranking Table */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gold/10 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-400">❌ {error}</p>
            </div>
          ) : rankingData && rankingData.rankings && rankingData.rankings.length > 0 ? (
            <>
              <div className="space-y-2">
                {rankingData.rankings
                  .slice(0, showAll ? rankingData.rankings.length : 5)
                  .map((kart) => {
                    const bestKartTime = rankingData.rankings[0].avgTop10Time;
                    const delta = calculateDelta(kart.avgTop10Time, bestKartTime);
                    const stars = getStarRating(kart.position);
                    const isSelected = selectedKart === kart.kartNumber;

                    return (
                      <div
                        key={kart.kartNumber}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:scale-[1.01] ${
                          isSelected
                            ? 'bg-electric-blue/20 border-electric-blue/60 ring-2 ring-electric-blue/40'
                            : getMedalColor(kart.position)
                        }`}
                      >
                        {/* Position + Medal */}
                        <div className="flex items-center gap-1.5 min-w-[60px]">
                          <span className="text-2xl font-bold">#{kart.position}</span>
                          {getMedalEmoji(kart.position) && (
                            <span className="text-xl">{getMedalEmoji(kart.position)}</span>
                          )}
                        </div>

                        {/* Kart Number */}
                        <div className="flex items-center gap-2 min-w-[90px]">
                          <span className="text-xs font-racing text-sky-blue/70">KART</span>
                          <span className="text-3xl font-bold text-white">{kart.kartNumber}</span>
                        </div>

                        {/* Star Rating */}
                        <div className="hidden sm:flex items-center gap-1">
                          {renderStars(stars)}
                        </div>

                        {/* Average Time */}
                        <div className="flex-1 flex flex-col items-end gap-0.5">
                          <div className="text-xl font-digital text-white">
                            {(kart.avgTop10Time / 1000).toFixed(3)}s
                          </div>
                          {delta && (
                            <div className="text-xs text-red-400/80 font-mono">
                              {delta}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Show All / Show Less Button */}
              {rankingData.rankings.length > 5 && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="px-4 py-2 bg-gold/10 hover:bg-gold/20 border border-gold/30 hover:border-gold/50 rounded-lg text-gold text-sm font-racing uppercase tracking-wider transition-all hover:scale-105"
                  >
                    {showAll ? (
                      <>▲ Mostrar Top 5</>
                    ) : (
                      <>▼ Ver todos ({rankingData.rankings.length})</>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-sky-blue/60">No hay datos disponibles</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
