'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Squadron {
  _id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
  };
  totalPoints: number;
  currentRank?: number;
  division: string;
  members: any[];
  captainId: {
    profile: {
      alias?: string;
      firstName: string;
    };
  };
}

interface SquadronRankingCardProps {
  userSquadronId?: string;
}

export default function SquadronRankingCard({ userSquadronId }: SquadronRankingCardProps) {
  const [squadrons, setSquadrons] = useState<Squadron[]>([]);
  const [loading, setLoading] = useState(true);
  const [division, setDivision] = useState<string>('all');

  useEffect(() => {
    loadRankings();
  }, [division]);

  const loadRankings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        division,
        limit: '10'
      });

      const response = await fetch(`/api/squadrons/rankings?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setSquadrons(data.rankings);
      }
    } catch (error) {
      console.error('Error loading squadron rankings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getDivisionColor = (div: string) => {
    switch (div) {
      case 'Elite': return 'text-purple-400';
      case 'Masters': return 'text-blue-400';
      case 'Pro': return 'text-cyan-400';
      case 'Open': return 'text-green-400';
      default: return 'text-sky-blue';
    }
  };

  return (
    <div className="bg-midnight/60 border border-electric-blue/20 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-electric-blue/20 to-rb-blue/20 border-b border-electric-blue/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <h3 className="font-bold text-xl text-electric-blue">RANKING ESCUDERÍAS</h3>
          </div>
          <Link
            href="/squadrons"
            className="text-xs text-sky-blue hover:text-electric-blue transition-colors"
          >
            Ver todas →
          </Link>
        </div>

        {/* Division Filter */}
        <div className="mt-3 flex gap-2 flex-wrap">
          {['all', 'Elite', 'Masters', 'Pro', 'Open'].map((div) => (
            <button
              key={div}
              onClick={() => setDivision(div)}
              className={`
                px-3 py-1 rounded-full text-xs font-medium transition-all
                ${division === div
                  ? 'bg-electric-blue text-dark-bg'
                  : 'bg-midnight/40 text-sky-blue hover:bg-electric-blue/20'
                }
              `}
            >
              {div === 'all' ? 'Todas' : div}
            </button>
          ))}
        </div>
      </div>

      {/* Rankings List */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sky-blue/60 text-sm">Cargando rankings...</p>
          </div>
        ) : squadrons.length === 0 ? (
          <div className="text-center py-8 text-sky-blue/60">
            <div className="text-4xl mb-2">🏁</div>
            <p className="text-sm">No hay escuderías en esta división</p>
          </div>
        ) : (
          <div className="space-y-2">
            {squadrons.map((squadron) => {
              const isUserSquadron = squadron._id === userSquadronId;

              return (
                <Link
                  key={squadron._id}
                  href={`/squadrons/${squadron._id}`}
                  className={`
                    block p-3 rounded-lg transition-all hover:scale-[1.02]
                    ${isUserSquadron
                      ? 'bg-gradient-to-r from-karting-gold/20 to-yellow-500/20 border-2 border-karting-gold/40'
                      : 'bg-midnight/40 border border-electric-blue/10 hover:border-electric-blue/30'
                    }
                  `}
                  style={!isUserSquadron ? {
                    borderLeftColor: squadron.colors.primary + '60',
                    borderLeftWidth: '3px'
                  } : undefined}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div className="w-10 text-center">
                      {squadron.currentRank && squadron.currentRank <= 3 ? (
                        <span className="text-2xl">{getMedalEmoji(squadron.currentRank)}</span>
                      ) : (
                        <span className="text-electric-blue font-bold">#{squadron.currentRank}</span>
                      )}
                    </div>

                    {/* Squadron Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white truncate">
                          {squadron.name}
                        </h4>
                        {isUserSquadron && (
                          <span className="text-xs bg-karting-gold/30 text-karting-gold px-2 py-0.5 rounded-full font-medium">
                            TU EQUIPO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-sky-blue/70 mt-1">
                        <span className={getDivisionColor(squadron.division)}>
                          {squadron.division}
                        </span>
                        <span>•</span>
                        <span>{squadron.members.length} miembros</span>
                        <span>•</span>
                        <span className="truncate">
                          Cap: {squadron.captainId.profile.alias || squadron.captainId.profile.firstName}
                        </span>
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">
                        {squadron.totalPoints}
                      </div>
                      <div className="text-xs text-sky-blue/60">pts</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Footer CTA */}
        {!userSquadronId && (
          <div className="mt-4 pt-4 border-t border-electric-blue/10">
            <Link
              href="/squadrons"
              className="block text-center px-4 py-3 bg-gradient-to-r from-karting-gold/20 to-yellow-500/20 hover:from-karting-gold/30 hover:to-yellow-500/30 border border-karting-gold/40 text-karting-gold font-bold rounded-lg transition-all"
            >
              ➕ Únete a una Escudería
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
