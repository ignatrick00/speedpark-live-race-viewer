'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import PersonalStatsCard from '@/components/PersonalStatsCard';
import RaceHistoryTable from '@/components/RaceHistoryTable';
import ProgressChart from '@/components/ProgressChart';
import AchievementsBadge from '@/components/AchievementsBadge';
import LapProgressionChart from '@/components/LapProgressionChart';

export interface PersonalStats {
  totalRaces: number;
  totalSpent: number;
  bestTime: number;
  averageTime: number;
  bestPosition: number;
  podiumFinishes: number;
  favoriteKart: number;
  totalLaps: number;
  firstRace: Date;
  lastRace: Date;
  monthlyProgression: Array<{
    month: string;
    races: number;
    bestTime: number;
    position: number;
  }>;
  recentRaces: Array<{
    date: Date;
    sessionName: string;
    position: number;
    kartNumber: number;
    bestTime: number;
    totalLaps: number;
  }>;
}

export default function DashboardPage() {
  const { user, stats: authStats, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  // Load stats (real or demo)
  useEffect(() => {
    if (user && isAuthenticated) {
      // Check if user has real stats linked
      if (user.kartingLink.status === 'linked' && authStats) {
        // Convert real stats to dashboard format
        const realStats = convertRealStatsToPersonal(authStats);
        setStats(realStats);
        setLoading(false);
      } else {
        // Generate demo stats
        const timer = setTimeout(() => {
          setStats(generateDemoStats(user.profile.firstName, user.profile.lastName));
          setLoading(false);
        }, 1500);

        return () => clearTimeout(timer);
      }
    }
  }, [user, isAuthenticated, authStats]);

  // Convert real stats to dashboard format
  function convertRealStatsToPersonal(realStats: any): PersonalStats {
    return {
      totalRaces: realStats.totalRaces,
      totalSpent: realStats.totalRevenue,
      bestTime: realStats.bestTime,
      averageTime: realStats.averageTime,
      bestPosition: realStats.bestPosition,
      podiumFinishes: realStats.podiumFinishes,
      favoriteKart: realStats.favoriteKart || 1,
      totalLaps: realStats.totalLaps,
      firstRace: new Date(realStats.firstRaceAt),
      lastRace: new Date(realStats.lastRaceAt),
      monthlyProgression: generateMonthlyFromReal(realStats.monthlyStats || []),
      recentRaces: realStats.recentSessions?.slice(0, 5).map((session: any) => ({
        date: new Date(session.timestamp),
        sessionName: session.sessionName,
        position: session.position,
        kartNumber: Math.floor(Math.random() * 23) + 1, // Random kart for now
        bestTime: session.bestTime,
        totalLaps: 8 + Math.floor(Math.random() * 5)
      })) || []
    };
  }

  function generateMonthlyFromReal(monthlyStats: any[]) {
    if (monthlyStats.length === 0) {
      // Generate last 6 months as fallback
      const months = ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'];
      return months.map(month => ({
        month,
        races: Math.floor(Math.random() * 3) + 1,
        bestTime: 42000 + Math.random() * 8000,
        position: Math.floor(Math.random() * 8) + 1
      }));
    }

    return monthlyStats.slice(-6).map((stat: any) => ({
      month: new Date(stat.year, stat.month).toLocaleDateString('es', { month: 'short' }),
      races: stat.races,
      bestTime: stat.bestTime,
      position: Math.round(stat.positions?.reduce((a: number, b: number) => a + b, 0) / stat.positions?.length || 5)
    }));
  }

  // Generate realistic demo statistics
  function generateDemoStats(firstName: string, lastName: string): PersonalStats {
    const fullName = `${firstName} ${lastName}`;
    
    // Based on real drivers, create realistic stats
    const baseStats = {
      totalRaces: Math.floor(Math.random() * 25) + 3, // 3-28 races
      bestPosition: Math.floor(Math.random() * 8) + 1, // 1-8 position
      podiumFinishes: Math.floor(Math.random() * 5), // 0-4 podiums
    };

    const totalRaces = baseStats.totalRaces;
    const bestTime = 42000 + Math.random() * 8000; // 42-50 seconds in ms
    const averageTime = bestTime + Math.random() * 3000; // slightly slower than best
    
    return {
      totalRaces,
      totalSpent: totalRaces * 17000, // $17,000 per race
      bestTime: Math.round(bestTime),
      averageTime: Math.round(averageTime),
      bestPosition: baseStats.bestPosition,
      podiumFinishes: baseStats.podiumFinishes,
      favoriteKart: Math.floor(Math.random() * 23) + 1, // Kart 1-23
      totalLaps: totalRaces * (8 + Math.floor(Math.random() * 5)), // 8-12 laps per race
      firstRace: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      lastRace: new Date(2025, 7, Math.floor(Math.random() * 8) + 1), // Recent in August
      
      // Monthly progression (last 6 months)
      monthlyProgression: generateMonthlyProgression(totalRaces),
      
      // Recent races (last 5)
      recentRaces: generateRecentRaces(Math.min(totalRaces, 5))
    };
  }

  function generateMonthlyProgression(totalRaces: number) {
    const months = ['Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'];
    const racesPerMonth = Math.floor(totalRaces / 6);
    
    return months.map((month, index) => ({
      month,
      races: Math.max(1, racesPerMonth + Math.floor(Math.random() * 3) - 1),
      bestTime: 42000 + Math.random() * 8000 - (index * 200), // Improvement over time
      position: Math.floor(Math.random() * 8) + 1
    }));
  }

  function generateRecentRaces(count: number) {
    const sessionNames = [
      '[HEAT] 45 - Clasificacion Premium',
      '[HEAT] 46 - Clasificacion',
      '[HEAT] 47 - Clasificacion Premium',
      '[HEAT] 48 - Clasificacion',
      '[HEAT] 49 - Clasificacion Premium',
    ];

    return Array.from({ length: count }, (_, i) => ({
      date: new Date(2025, 7, 8 - i), // Recent dates
      sessionName: sessionNames[i] || `[HEAT] ${50 - i} - Clasificacion`,
      position: Math.floor(Math.random() * 12) + 1,
      kartNumber: Math.floor(Math.random() * 23) + 1,
      bestTime: 42000 + Math.random() * 8000,
      totalLaps: 8 + Math.floor(Math.random() * 5)
    }));
  }

  function formatTime(milliseconds: number): string {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = ((milliseconds % 60000) / 1000).toFixed(3);
    return `${minutes}:${seconds.padStart(6, '0')}`;
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-electric-blue text-lg font-medium">CARGANDO DASHBOARD...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-midnight text-white overflow-x-hidden relative">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 opacity-10" 
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(0, 212, 255, 0.15) 2px, transparent 2px)',
            backgroundSize: '80px 80px'
          }}
        />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-electric-blue/5 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-rb-blue/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        {/* Header */}
        <header className="text-center mb-12 relative">
          {/* Live Race Button - Top Right */}
          <div className="absolute top-0 right-0 hidden md:block">
            <a 
              href="/live" 
              className="group relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-electric-blue/20 to-rb-blue/20 border-2 border-electric-blue/30 rounded-lg hover:from-electric-blue/30 hover:to-rb-blue/30 hover:border-electric-blue/50 transition-all duration-300 backdrop-blur-sm"
            >
              {/* Live indicator */}
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-ping absolute"></div>
                <div className="w-3 h-3 rounded-full bg-green-500 relative"></div>
              </div>
              
              <span className="font-bold text-electric-blue group-hover:text-white transition-colors">
                🏁 LIVE RACE
              </span>
              
              {/* Hover effect glow */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-electric-blue/10 to-rb-blue/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl"></div>
            </a>
          </div>

          {/* Mobile Live Button */}
          <div className="md:hidden mb-4">
            <a 
              href="/live" 
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-electric-blue/20 to-rb-blue/20 border border-electric-blue/30 rounded-lg hover:from-electric-blue/30 hover:to-rb-blue/30 transition-all duration-300"
            >
              <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
              <span className="font-bold text-electric-blue text-sm">🏁 LIVE RACE</span>
            </a>
          </div>

          <h1 className="font-bold text-5xl md:text-7xl mb-4 tracking-wider bg-gradient-to-r from-electric-blue via-sky-blue to-karting-gold bg-clip-text text-transparent">
            MI DASHBOARD
          </h1>
          <div className="flex items-center justify-center gap-3 text-electric-blue font-bold text-lg">
            <div className="w-2 h-2 rounded-full bg-electric-blue animate-pulse"></div>
            PERFIL DE PILOTO
            <div className="w-2 h-2 rounded-full bg-electric-blue animate-pulse"></div>
          </div>
          <p className="text-sky-blue/80 mt-4">
            {user.profile.alias || `${user.profile.firstName} ${user.profile.lastName}`}
          </p>
        </header>

        {user.kartingLink.status === 'pending_first_race' ? (
          // Not linked yet - Show welcome message
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-gradient-to-br from-electric-blue/10 to-rb-blue/10 border border-electric-blue/30 rounded-lg p-8 mb-8">
              <div className="text-6xl mb-4">🏁</div>
              <h2 className="font-bold text-3xl text-electric-blue mb-4">¡BIENVENIDO AL CIRCUITO!</h2>
              <p className="text-sky-blue/80 mb-6">
                Tu cuenta está lista. Ve a correr a <strong>Speed Park</strong> y tus estadísticas aparecerán automáticamente aquí.
              </p>
              <div className="bg-rb-blue/20 border border-rb-blue/40 rounded-md p-4 mb-6">
                <p className="text-sky-blue text-sm">
                  📋 <strong>Instrucciones:</strong><br/>
                  1. Ve a Speed Park<br/>
                  2. Inscríbete con tu nombre: <strong>{user.profile.firstName} {user.profile.lastName}</strong><br/>
                  3. ¡Corre y disfruta!<br/>
                  4. Tus estadísticas aparecerán aquí automáticamente
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Show full dashboard with demo stats
          stats && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Stats */}
              <div className="lg:col-span-2 space-y-6">
                {/* Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <PersonalStatsCard
                    title="CARRERAS TOTALES"
                    value={stats.totalRaces}
                    subtitle="Sesiones completadas"
                    icon="🏁"
                    color="blue"
                  />
                  <PersonalStatsCard
                    title="MEJOR TIEMPO"
                    value={formatTime(stats.bestTime)}
                    subtitle="Vuelta más rápida"
                    icon="⚡"
                    color="gold"
                  />
                  <PersonalStatsCard
                    title="MEJOR POSICIÓN"
                    value={`#${stats.bestPosition}`}
                    subtitle="Posición más alta"
                    icon="🏆"
                    color="purple"
                  />
                  <PersonalStatsCard
                    title="PODIOS"
                    value={stats.podiumFinishes}
                    subtitle="Top 3 finishes"
                    icon="🥇"
                    color="cyan"
                  />
                </div>

                {/* Progress Chart */}
                <ProgressChart monthlyData={stats.monthlyProgression} />

                {/* Recent Races */}
                <RaceHistoryTable races={stats.recentRaces} />
                
                {/* Lap-by-Lap Progression - REAL DATA */}
                {user?.kartingLink?.status === 'linked' && user?._id && (
                  <LapProgressionChart webUserId={user._id} />
                )}
              </div>

              {/* Right Column - Additional Stats */}
              <div className="space-y-6">
                {/* Performance Summary */}
                <div className="bg-midnight/60 border border-electric-blue/20 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">📊</span>
                    <h3 className="font-bold text-xl text-electric-blue">RESUMEN</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sky-blue/70 text-sm">Total Gastado:</span>
                      <span className="text-karting-gold text-sm font-medium">${stats.totalSpent.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sky-blue/70 text-sm">Promedio Tiempo:</span>
                      <span className="text-electric-blue text-sm font-medium">{formatTime(stats.averageTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sky-blue/70 text-sm">Total Vueltas:</span>
                      <span className="text-electric-blue text-sm font-medium">{stats.totalLaps}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sky-blue/70 text-sm">Kart Favorito:</span>
                      <span className="text-electric-blue text-sm font-medium">#{stats.favoriteKart}</span>
                    </div>
                  </div>
                </div>

                {/* Achievements */}
                <AchievementsBadge
                  totalRaces={stats.totalRaces}
                  bestTime={stats.bestTime}
                  bestPosition={stats.bestPosition}
                  podiumFinishes={stats.podiumFinishes}
                  totalSpent={stats.totalSpent}
                />

                {/* Milestone Card */}
                <div className="bg-gradient-to-br from-karting-gold/20 to-electric-blue/10 border border-karting-gold/40 rounded-lg p-6 text-center">
                  <div className="text-4xl mb-2">🏆</div>
                  <h3 className="font-bold text-xl text-karting-gold mb-2">PILOTO ACTIVO</h3>
                  <p className="text-sky-blue/80 text-sm">
                    Miembro desde {stats.firstRace.toLocaleDateString()}
                  </p>
                  <p className="text-electric-blue text-xs mt-2">
                    Última carrera: {stats.lastRace.toLocaleDateString()}
                  </p>
                  <div className="mt-3 pt-3 border-t border-karting-gold/30">
                    <p className="text-sky-blue text-sm font-medium">
                      {stats.totalRaces >= 20 ? '🏆 PILOTO VETERANO' : 
                       stats.totalRaces >= 10 ? '🎯 PILOTO EXPERIMENTADO' : 
                       '🚀 PILOTO NOVATO'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}