'use client';

import React, { useState, useEffect } from 'react';

interface LeaderboardEntry {
  position: number;
  driverName: string;
  bestLapTime: number;
  totalRaces: number;
  podiums: number;
  bestPosition: number;
  webUserId: string | null;
}

interface LeaderboardCardProps {
  currentUserId?: string;
  friendUserId?: string; // ID del amigo cuyo dashboard estás viendo
}

export default function LeaderboardCard({ currentUserId, friendUserId }: LeaderboardCardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [currentUserId, friendUserId]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);

      // 🆕 Incluir ambos userIds si existen
      let url = '/api/leaderboard-v0?limit=10';
      if (currentUserId) {
        url += `&userId=${currentUserId}`;
      }
      if (friendUserId && friendUserId !== currentUserId) {
        url += `&friendUserId=${friendUserId}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        let finalLeaderboard = [...data.leaderboard];
        const extraEntries = [];

        // Agregar currentUser si está fuera del top 10
        if (data.userEntry && data.userPosition && data.userPosition > 10) {
          extraEntries.push(data.userEntry);
        }

        // Agregar friendUser si está fuera del top 10
        if (data.friendEntry && data.friendPosition && data.friendPosition > 10) {
          // Evitar duplicados
          if (!extraEntries.some(e => e.webUserId === data.friendEntry.webUserId)) {
            extraEntries.push(data.friendEntry);
          }
        }

        // Ordenar los extras por position (posición real en ranking, más bajo = mejor)
        if (extraEntries.length > 0) {
          extraEntries.sort((a, b) => a.position - b.position);
          finalLeaderboard = [...finalLeaderboard, ...extraEntries];
        }

        setLeaderboard(finalLeaderboard);
        setError(null);
      } else {
        setError('Error cargando clasificación');
      }
    } catch (err) {
      setError('Error obteniendo datos');
      console.error('Error fetching leaderboard:', err);
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

  const getMedalColor = (position: number) => {
    if (position === 1) return 'text-karting-gold';
    if (position === 2) return 'text-gray-300';
    if (position === 3) return 'text-orange-400';
    return 'text-sky-blue/70';
  };

  const getMedalEmoji = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `#${position}`;
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
        <h3 className="text-xl font-bold text-electric-blue mb-4">🏆 Clasificación General</h3>
        <div className="text-center text-gray-400 py-8">Cargando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
        <h3 className="text-xl font-bold text-electric-blue mb-4">🏆 Clasificación General</h3>
        <div className="text-center text-red-400 py-8">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
      <h3 className="text-xl font-bold text-electric-blue mb-4 flex items-center gap-2">
        <span>🏆</span>
        <span>Clasificación General</span>
        <span className="text-sm text-sky-blue/70 font-normal ml-auto">Top {leaderboard.length} Pilotos</span>
      </h3>

      {leaderboard.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          No hay datos de clasificación disponibles
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry, index) => {
            const isCurrentUser = currentUserId && entry.webUserId === currentUserId;
            const isFriendUser = friendUserId && entry.webUserId === friendUserId;
            const showDivider = index === 10 && (isCurrentUser || isFriendUser);

            return (
              <React.Fragment key={entry.position}>
                {showDivider && (
                  <div className="border-t border-dashed border-electric-blue/40 my-4 pt-2">
                    <div className="text-xs text-sky-blue/60 text-center mb-2">
                      {isCurrentUser && isFriendUser ? 'Ambos fuera del Top 10' : isCurrentUser ? 'Tu posición' : 'Posición del piloto'}
                    </div>
                  </div>
                )}
                <div
                  className={`
                    flex items-center gap-3 p-3 rounded-lg
                    ${isCurrentUser
                      ? 'bg-gradient-to-r from-karting-gold/20 to-electric-blue/20 border-2 border-karting-gold/60 shadow-lg shadow-karting-gold/20'
                      : isFriendUser
                      ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-2 border-purple-400/60 shadow-lg shadow-purple-400/20'
                      : entry.position <= 3
                      ? 'bg-gradient-to-r from-electric-blue/10 to-transparent border border-electric-blue/20'
                      : 'bg-racing-black/50 border border-gray-700/30'
                    }
                    hover:border-sky-blue/50 transition-all duration-200
                    ${(isCurrentUser || isFriendUser) ? 'scale-105' : ''}
                  `}
                >
                  {/* Position */}
                  <div className={`text-2xl font-bold ${getMedalColor(entry.position)} min-w-[3rem] text-center`}>
                    {getMedalEmoji(entry.position)}
                  </div>

                  {/* Driver Info */}
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold truncate ${isCurrentUser ? 'text-karting-gold' : isFriendUser ? 'text-purple-300' : 'text-white'} flex items-center gap-2`}>
                      {entry.driverName}
                      {isCurrentUser && <span className="text-xs">👈 TÚ</span>}
                      {isFriendUser && <span className="text-xs">👁️ VIENDO</span>}
                    </div>
                    <div className="text-xs text-sky-blue/70 flex gap-3">
                      <span>{entry.totalRaces} carreras</span>
                      <span>•</span>
                      <span>{entry.podiums} podios</span>
                    </div>
                  </div>

                  {/* Best Time */}
                  <div className="text-right">
                    <div className={`text-lg font-bold ${isCurrentUser || isFriendUser ? 'text-karting-gold animate-pulse' : 'text-karting-gold'}`}>
                      {formatTime(entry.bestLapTime)}
                    </div>
                    <div className="text-xs text-gray-400">Mejor tiempo</div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <p className="text-xs text-gray-500 text-center">
          Clasificación basada en mejor tiempo de vuelta histórico
        </p>
      </div>
    </div>
  );
}
