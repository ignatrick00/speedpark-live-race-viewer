'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import PersonalStatsCard from '@/components/PersonalStatsCard';
import RaceHistoryTable from '@/components/RaceHistoryTable';
import ProgressChart from '@/components/ProgressChart';
import Navbar from '@/components/Navbar';

interface UserProfile {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  alias?: string;
}

interface UserStats {
  totalRaces: number;
  totalRevenue: number;
  bestTime: number | null;
  averageTime: number | null;
  totalLaps: number;
  firstPlaces: number;
  secondPlaces: number;
  thirdPlaces: number;
  podiumFinishes: number;
  firstRaceAt: Date | null;
  lastRaceAt: Date | null;
  racesThisMonth: number;
  recentSessions: Array<{
    sessionId: string;
    sessionName: string;
    position: number;
    bestTime: number;
    timestamp: Date;
    revenue: number;
  }>;
  monthlyStats: Array<{
    year: number;
    month: number;
    races: number;
    revenue: number;
    bestTime: number;
    podiums: number;
  }>;
}

export default function UserProfilePage() {
  const params = useParams();
  const userId = params?.userId as string;
  const { token, user: currentUser } = useAuth();
  const router = useRouter();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.push('/');
      return;
    }

    if (userId) {
      loadUserStats();
    }
  }, [userId, token, router]);

  const loadUserStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // First check if users are friends
      const friendshipResponse = await fetch(`/api/users/${userId}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const friendshipData = await friendshipResponse.json();

      if (!friendshipResponse.ok) {
        setError(friendshipData.error || 'Error al cargar estadísticas');
        return;
      }

      setUserProfile(friendshipData.user);

      // Now fetch real stats using the same endpoint as dashboard
      const statsResponse = await fetch(`/api/user-stats?webUserId=${userId}`);
      const statsData = await statsResponse.json();

      if (statsData.success && statsData.stats) {
        console.log('📊 [FRIEND-PROFILE] Stats data:', statsData.stats);

        // Convert from race_sessions_v0 format to our format
        setStats({
          totalRaces: statsData.stats.totalRaces || 0,
          totalRevenue: statsData.stats.totalSpent || 0,
          bestTime: statsData.stats.bestTime || null,
          averageTime: statsData.stats.avgTime || null,
          totalLaps: statsData.stats.totalLaps || 0,
          firstPlaces: 0, // Not in V0 stats
          secondPlaces: 0,
          thirdPlaces: 0,
          podiumFinishes: statsData.stats.podiumFinishes || 0,
          firstRaceAt: statsData.stats.firstRace ? new Date(statsData.stats.firstRace) : null,
          lastRaceAt: statsData.stats.lastRace ? new Date(statsData.stats.lastRace) : null,
          racesThisMonth: 0,
          recentSessions: statsData.stats.recentRaces || [],
          monthlyStats: statsData.stats.monthlyProgression || []
        });
      } else {
        setStats(null);
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
      setError('Error al cargar estadísticas del usuario');
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = () => {
    if (!userProfile) return '';
    return userProfile.alias || `${userProfile.firstName} ${userProfile.lastName}`;
  };

  const formatPersonalStats = () => {
    if (!stats) return null;

    return {
      totalRaces: stats.totalRaces,
      totalSpent: stats.totalRevenue,
      bestTime: stats.bestTime || 0,
      averageTime: stats.averageTime || 0,
      bestPosition: stats.podiumFinishes > 0 ? 1 : 0,
      podiumFinishes: stats.podiumFinishes,
      favoriteKart: 0,
      totalLaps: stats.totalLaps,
      firstRace: stats.firstRaceAt ? new Date(stats.firstRaceAt) : new Date(),
      lastRace: stats.lastRaceAt ? new Date(stats.lastRaceAt) : new Date(),
      monthlyProgression: stats.monthlyStats || [],
      recentRaces: (stats.recentSessions || []).map((s: any) => {
        console.log('🏁 [RACE-MAP] Raw race data:', s);
        console.log('🏁 [RACE-MAP] Position field:', s.position, 'Type:', typeof s.position);
        return {
          date: new Date(s.date),
          sessionName: s.sessionName,
          position: s.position,
          kartNumber: s.kartNumber,
          bestTime: s.bestTime,
          totalLaps: s.totalLaps
        };
      })
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-cyan-400 text-xl">Cargando perfil...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-racing text-red-400 mb-4">Error</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => router.push('/amigos')}
              className="px-6 py-3 bg-cyan-400 text-black rounded-lg hover:bg-cyan-300 transition-all font-medium"
            >
              Volver a Amigos
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-racing text-electric-blue mb-2">
                {getDisplayName()}
              </h1>
              <p className="text-gray-400">{userProfile?.email}</p>
            </div>
            <button
              onClick={() => router.push('/amigos')}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all"
            >
              ← Volver
            </button>
          </div>

          {/* No Stats Message */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">🏁</div>
            <h3 className="text-2xl font-racing text-white mb-2">Sin estadísticas disponibles</h3>
            <p className="text-gray-400">Este usuario aún no ha corrido en Speed Park</p>
          </div>
        </div>
      </div>
    );
  }

  const personalStats = formatPersonalStats();

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-racing text-electric-blue mb-2">
              {getDisplayName()}
            </h1>
            <p className="text-gray-400">{userProfile?.email}</p>
          </div>
          <button
            onClick={() => router.push('/amigos')}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all"
          >
            ← Volver
          </button>
        </div>

        {/* Stats Summary Cards */}
        {personalStats && personalStats.recentRaces && personalStats.recentRaces.length > 0 && (
          <>
            {/* Quick Stats Grid */}
            {(() => {
              const totalRaces = stats?.totalRaces || 0;
              const avgLaps = stats?.totalLaps && totalRaces > 0
                ? Math.round(stats.totalLaps / totalRaces)
                : 0;

              // Find favorite kart (most used)
              const kartUsage: { [key: number]: number } = {};
              personalStats.recentRaces.forEach((race: any) => {
                kartUsage[race.kartNumber] = (kartUsage[race.kartNumber] || 0) + 1;
              });
              const favoriteKart = Object.entries(kartUsage).reduce((max, [kart, count]) =>
                count > (max.count || 0) ? { kart: Number(kart), count } : max
              , { kart: 0, count: 0 }).kart;

              // Last race date
              const lastRaceDate = stats?.lastRaceAt ? new Date(stats.lastRaceAt) : null;
              const daysAgo = lastRaceDate
                ? Math.floor((Date.now() - lastRaceDate.getTime()) / (1000 * 60 * 60 * 24))
                : 0;
              const lastRaceText = daysAgo === 0 ? 'Hoy' : daysAgo === 1 ? 'Ayer' : `Hace ${daysAgo} días`;

              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {/* Total Races */}
                  <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-electric-blue">{totalRaces}</div>
                    <div className="text-sm text-sky-blue/60 mt-1">Carreras</div>
                  </div>

                  {/* Favorite Kart */}
                  <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-electric-blue">#{favoriteKart}</div>
                    <div className="text-sm text-sky-blue/60 mt-1">Kart Favorito</div>
                  </div>

                  {/* Avg Laps */}
                  <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-electric-blue">{avgLaps}</div>
                    <div className="text-sm text-sky-blue/60 mt-1">Vueltas Promedio</div>
                  </div>

                  {/* Last Race */}
                  <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-4 text-center">
                    <div className="text-xl font-bold text-electric-blue">{lastRaceText}</div>
                    <div className="text-sm text-sky-blue/60 mt-1">Última Carrera</div>
                  </div>
                </div>
              );
            })()}

            {/* Best Lap Card */}
            <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
              {/* Header */}
              <h3 className="text-xl font-bold text-electric-blue flex items-center gap-2 mb-6">
                🏁 Mejor Vuelta
              </h3>

              {/* Best Lap Display */}
              {(() => {
                // Find the best lap across all races
                const bestRace = personalStats.recentRaces.reduce((best, race) => {
                  return !best || race.bestTime < best.bestTime ? race : best;
                }, personalStats.recentRaces[0]);

                const formatTime = (timeMs: number) => {
                  if (!timeMs || timeMs === 0) return '--:--';
                  const minutes = Math.floor(timeMs / 60000);
                  const seconds = ((timeMs % 60000) / 1000).toFixed(3);
                  return `${minutes}:${parseFloat(seconds).toFixed(3).padStart(6, '0')}`;
                };

                const formatDate = (date: Date) => {
                  return new Date(date).toLocaleDateString('es-CL', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });
                };

                return (
                  <div className="bg-racing-black/40 border border-electric-blue/30 rounded-lg p-6 text-center">
                    {/* Time - Large Display */}
                    <div className="font-mono text-6xl font-bold text-karting-gold mb-4">
                      {formatTime(bestRace.bestTime)}
                    </div>

                    {/* Race Details */}
                    <div className="space-y-2 text-sky-blue/80">
                      <div className="text-lg">
                        <span className="text-white font-bold">Kart #{bestRace.kartNumber}</span>
                      </div>
                      <div className="text-sm">
                        {formatDate(bestRace.date)}
                      </div>
                      <div className="text-sm text-sky-blue/60">
                        {bestRace.sessionName}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
