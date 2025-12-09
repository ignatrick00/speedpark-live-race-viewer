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
          recentSessions: statsData.stats.recentRaces?.map((race: any) => ({
            sessionId: '',
            sessionName: race.sessionName,
            position: race.position,
            bestTime: race.bestTime,
            timestamp: new Date(race.date),
            revenue: 0
          })) || [],
          monthlyStats: statsData.stats.monthlyProgression?.map((m: any) => ({
            year: parseInt(m.month.split('-')[0]),
            month: parseInt(m.month.split('-')[1]),
            races: m.races,
            revenue: 0,
            bestTime: m.bestTime,
            podiums: 0
          })) || []
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
      bestPosition: stats.firstPlaces > 0 ? 1 : stats.secondPlaces > 0 ? 2 : stats.thirdPlaces > 0 ? 3 : 0,
      podiumFinishes: stats.podiumFinishes,
      favoriteKart: 0,
      totalLaps: stats.totalLaps,
      firstRace: stats.firstRaceAt ? new Date(stats.firstRaceAt) : new Date(),
      lastRace: stats.lastRaceAt ? new Date(stats.lastRaceAt) : new Date(),
      monthlyProgression: stats.monthlyStats.map(m => ({
        month: `${m.year}-${String(m.month).padStart(2, '0')}`,
        races: m.races,
        bestTime: m.bestTime,
        position: 0
      })),
      recentRaces: stats.recentSessions.map(s => ({
        date: new Date(s.timestamp),
        sessionName: s.sessionName,
        position: s.position,
        kartNumber: 0,
        bestTime: s.bestTime,
        totalLaps: 0
      }))
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

        {/* Stats Cards */}
        {personalStats && (
          <div className="space-y-8">
            {/* Personal Stats */}
            <PersonalStatsCard stats={personalStats} />

            {/* Progress Chart */}
            {personalStats.monthlyProgression && personalStats.monthlyProgression.length > 0 && (
              <ProgressChart data={personalStats.monthlyProgression} />
            )}

            {/* Race History */}
            {personalStats.recentRaces && personalStats.recentRaces.length > 0 && (
              <RaceHistoryTable races={personalStats.recentRaces} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
