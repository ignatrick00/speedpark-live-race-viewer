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

  // Load real stats using exact matching system
  useEffect(() => {
    if (user && isAuthenticated) {
      loadRealUserStats();
    }
  }, [user, isAuthenticated]);

  const loadRealUserStats = async () => {
    try {
      setLoading(true);
      
      console.log(`🔍 Loading real user stats for: ${user._id}`);
      
      // STEP 1: Get user's recent sessions using NEW driver-centric structure
      const sessionsResponse = await fetch(`/api/lap-capture?action=get_recent_sessions&webUserId=${user._id}&limit=20`);
      const sessionsData = await sessionsResponse.json();
      
      // STEP 2: Also get driver summary with aggregate stats
      const summaryResponse = await fetch(`/api/lap-capture?action=get_driver_summary&webUserId=${user._id}`);
      const summaryData = await summaryResponse.json();
      
      if (sessionsData.success && sessionsData.sessions.length > 0) {
        console.log(`✅ Found ${sessionsData.sessions.length} real sessions (${sessionsData.dataStructure})`);
        
        // Check if we have lap-by-lap data in new structure
        const hasLapByLapData = sessionsData.sessions.some(s => s.lapByLapData && s.lapByLapData.length > 0);
        
        if (hasLapByLapData) {
          console.log(`🎯 Using ENHANCED data with lap-by-lap progression`);
          const realStats = convertEnhancedLapDataToPersonalStats(sessionsData.sessions, summaryData.stats || null, user);
          setStats(realStats);
        } else {
          console.log(`📊 Using STANDARD session data`);
          const realStats = convertLapDataToPersonalStats(sessionsData.sessions, user);
          setStats(realStats);
        }
      } else {
        console.log(`ℹ️ No real race data found, using demo stats`);
        setStats(generateDemoStats(user.profile.firstName, user.profile.lastName));
      }
      
    } catch (error) {
      console.error('❌ Error loading real stats:', error);
      setStats(generateDemoStats(user.profile.firstName, user.profile.lastName));
    } finally {
      setLoading(false);
    }
  };

  // Convert ENHANCED lap data with lap-by-lap progression to dashboard format
  function convertEnhancedLapDataToPersonalStats(sessions: any[], aggregateStats: any, user: any): PersonalStats {
    if (!sessions || sessions.length === 0) {
      return generateDemoStats(user.profile.firstName, user.profile.lastName);
    }

    console.log(`📊 Processing ${sessions.length} enhanced sessions with lap-by-lap data`);
    
    // Use aggregate stats if available, otherwise calculate from sessions
    let totalRaces = aggregateStats?.totalRaces || sessions.length;
    let totalSpent = aggregateStats?.totalSpent || (sessions.filter(s => s.sessionType === 'clasificacion').length * 17000);
    let bestTime = aggregateStats?.allTimeBestLap || Math.min(...sessions.map(s => s.bestLapTime || 999999));
    let bestPosition = aggregateStats?.bestPosition || Math.min(...sessions.map(s => s.bestPosition || 999));
    let podiumFinishes = aggregateStats?.podiumFinishes || sessions.filter(s => (s.finalPosition || s.bestPosition) <= 3).length;
    
    // Calculate total laps from lap-by-lap data
    let totalLaps = 0;
    let allLapTimes: number[] = [];
    
    sessions.forEach(session => {
      if (session.lapByLapData && session.lapByLapData.length > 0) {
        totalLaps += session.lapByLapData.length;
        
        // Collect all individual lap times for better average calculation
        session.lapByLapData.forEach((lap: any) => {
          if (lap.time && lap.time > 0) {
            allLapTimes.push(lap.time);
          }
        });
      } else {
        totalLaps += session.totalLaps || 0;
      }
    });
    
    // Calculate more accurate average from individual lap times
    const averageTime = allLapTimes.length > 0 
      ? allLapTimes.reduce((sum, time) => sum + time, 0) / allLapTimes.length
      : bestTime;

    // Ensure valid values
    bestTime = bestTime === 999999 ? 0 : bestTime;
    bestPosition = bestPosition === 999 ? 1 : bestPosition;
    
    // Date range
    const dates = sessions.map(s => new Date(s.lastLap || s.sessionDate)).sort((a, b) => a.getTime() - b.getTime());
    const firstRace = dates[0] || new Date();
    const lastRace = dates[dates.length - 1] || new Date();
    
    // Generate enhanced monthly progression
    const monthlyProgression = generateEnhancedMonthlyProgression(sessions);
    
    // Convert sessions to recent races with enhanced data
    const recentRaces = sessions.slice(0, 5).map((session, index) => {
      // Get lap-by-lap data if available
      const lapByLap = session.lapByLapData || [];
      const lastLap = lapByLap.length > 0 ? lapByLap[lapByLap.length - 1] : null;
      
      return {
        date: new Date(session.lastLap || session.sessionDate),
        sessionName: session.sessionName || `Clasificación ${index + 1}`,
        position: session.bestPosition || 1,
        kartNumber: lastLap?.kartNumber || Math.floor(Math.random() * 20) + 1,
        bestTime: session.bestLapTime || bestTime,
        totalLaps: session.totalLaps || lapByLap.length || 10,
        // Enhanced data from lap-by-lap
        lapByLapProgression: lapByLap,
        sessionType: session.sessionType || 'clasificacion',
        revenue: session.revenue || (session.sessionType === 'clasificacion' ? 17000 : 0)
      };
    });

    const stats: PersonalStats = {
      totalRaces,
      totalSpent,
      bestTime,
      averageTime,
      bestPosition,
      podiumFinishes,
      favoriteKart: Math.floor(Math.random() * 20) + 1, // TODO: Calculate from lap data
      totalLaps,
      firstRace,
      lastRace,
      monthlyProgression,
      recentRaces
    };

    console.log(`✅ Enhanced stats processed:`, {
      totalRaces,
      bestTime,
      totalLaps,
      lapByLapSessions: sessions.filter(s => s.lapByLapData?.length > 0).length
    });

    return stats;
  }

  // Convert real lap data to dashboard format (legacy)
  function convertLapDataToPersonalStats(sessions: any[], user: any): PersonalStats {
    if (!sessions || sessions.length === 0) {
      return generateDemoStats(user.profile.firstName, user.profile.lastName);
    }

    console.log(`📊 Processing ${sessions.length} real sessions for stats`);
    
    const totalRaces = sessions.length;
    const totalSpent = totalRaces * 17000; // $17,000 per classification session
    
    // Calculate best time from all sessions
    const bestTime = Math.min(...sessions.map(s => s.bestLapTime || 999999));
    const validBestTime = bestTime === 999999 ? 0 : bestTime;
    
    // Calculate best position
    const bestPosition = Math.min(...sessions.map(s => s.bestPosition || 999));
    const validBestPosition = bestPosition === 999 ? 1 : bestPosition;
    
    // Count podium finishes (positions 1, 2, 3)
    const podiumFinishes = sessions.filter(s => (s.bestPosition || 999) <= 3).length;
    
    // Calculate average time from sessions with valid times
    const sessionsWithTimes = sessions.filter(s => s.bestLapTime && s.bestLapTime > 0);
    const averageTime = sessionsWithTimes.length > 0 
      ? sessionsWithTimes.reduce((sum, s) => sum + s.bestLapTime, 0) / sessionsWithTimes.length
      : validBestTime;
    
    // Calculate total laps (estimate based on sessions)
    const totalLaps = sessions.reduce((sum, s) => sum + (s.totalLaps || 10), 0);
    
    // Get date range
    const dates = sessions.map(s => new Date(s.lastLap)).sort((a, b) => a.getTime() - b.getTime());
    const firstRace = dates[0] || new Date();
    const lastRace = dates[dates.length - 1] || new Date();
    
    // Generate monthly progression from real data
    const monthlyProgression = generateMonthlyProgressionFromSessions(sessions);
    
    // Convert sessions to recent races format
    const recentRaces = sessions.slice(0, 5).map((session, index) => ({
      date: new Date(session.lastLap),
      sessionName: session.sessionName || `Clasificación ${index + 1}`,
      position: session.bestPosition || 1,
      kartNumber: Math.floor(Math.random() * 20) + 1, // We don't have kart number in session summary
      bestTime: session.bestLapTime || validBestTime,
      totalLaps: session.totalLaps || 10
    }));

    const stats: PersonalStats = {
      totalRaces,
      totalSpent,
      bestTime: validBestTime,
      averageTime,
      bestPosition: validBestPosition,
      podiumFinishes,
      favoriteKart: Math.floor(Math.random() * 20) + 1, // Random kart for now
      totalLaps,
      firstRace,
      lastRace,
      monthlyProgression,
      recentRaces
    };

    console.log(`✅ Real stats processed:`, {
      totalRaces,
      bestTime: validBestTime,
      bestPosition: validBestPosition,
      podiumFinishes
    });

    return stats;
  }

  // Generate ENHANCED monthly progression with lap-by-lap data
  function generateEnhancedMonthlyProgression(sessions: any[]) {
    const monthlyData = new Map();
    
    sessions.forEach(session => {
      const date = new Date(session.lastLap || session.sessionDate);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
          races: 0,
          bestTime: 999999,
          bestPosition: 999,
          totalLaps: 0,
          averageLapTime: 0,
          lapTimes: []
        });
      }
      
      const monthData = monthlyData.get(monthKey);
      monthData.races += 1;
      monthData.bestTime = Math.min(monthData.bestTime, session.bestLapTime || 999999);
      monthData.bestPosition = Math.min(monthData.bestPosition, session.bestPosition || 999);
      
      // Enhanced: collect lap-by-lap data for better statistics
      if (session.lapByLapData && session.lapByLapData.length > 0) {
        monthData.totalLaps += session.lapByLapData.length;
        session.lapByLapData.forEach((lap: any) => {
          if (lap.time && lap.time > 0) {
            monthData.lapTimes.push(lap.time);
          }
        });
      } else {
        monthData.totalLaps += session.totalLaps || 0;
      }
    });
    
    return Array.from(monthlyData.values()).map(data => ({
      ...data,
      bestTime: data.bestTime === 999999 ? 0 : data.bestTime,
      position: data.bestPosition === 999 ? 1 : data.bestPosition,
      averageLapTime: data.lapTimes.length > 0 
        ? data.lapTimes.reduce((sum: number, time: number) => sum + time, 0) / data.lapTimes.length
        : data.bestTime
    }));
  }

  // Generate monthly progression from real sessions (legacy)
  function generateMonthlyProgressionFromSessions(sessions: any[]) {
    const monthlyData = new Map();
    
    sessions.forEach(session => {
      const date = new Date(session.lastLap);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
          races: 0,
          bestTime: 999999,
          bestPosition: 999
        });
      }
      
      const monthData = monthlyData.get(monthKey);
      monthData.races += 1;
      monthData.bestTime = Math.min(monthData.bestTime, session.bestLapTime || 999999);
      monthData.bestPosition = Math.min(monthData.bestPosition, session.bestPosition || 999);
    });
    
    return Array.from(monthlyData.values()).map(data => ({
      ...data,
      bestTime: data.bestTime === 999999 ? 0 : data.bestTime,
      position: data.bestPosition === 999 ? 1 : data.bestPosition
    }));
  }

  // Convert real stats to dashboard format (legacy, keeping for compatibility)
  function convertRealStatsToPersonal(realStats: any): PersonalStats {
    return {
      totalRaces: realStats.totalRaces,
      totalSpent: realStats.totalRevenue,
      bestTime: realStats.bestTime,
      averageTime: realStats.averageTime,
      bestPosition: realStats.bestPosition,
      podiumFinishes: realStats.podiumFinishes,
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
              href="/" 
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
              href="/" 
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
          
          {/* Enhanced Data Source Indicator */}
          {stats && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium">
              {stats.totalRaces > 0 && stats.recentRaces.length > 0 ? (
                // Check if we have lap-by-lap data
                stats.recentRaces.some((race: any) => race.lapByLapProgression?.length > 0) ? (
                  <div className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                    🏁 DATOS VUELTA POR VUELTA - NUEVA ESTRUCTURA
                  </div>
                ) : (
                  <div className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    DATOS REALES DE CARRERAS
                  </div>
                )
              ) : (
                <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  DATOS DEMO - CORRE PARA VER TUS ESTADÍSTICAS REALES
                </div>
              )}
            </div>
          )}
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
                {user?._id && stats && stats.totalRaces > 0 && (
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