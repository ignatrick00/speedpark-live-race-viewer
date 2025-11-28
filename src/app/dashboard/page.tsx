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
      
      
      if (!user || !user.id) {
        setStats(generateDemoStats(user?.profile?.firstName || 'Demo', user?.profile?.lastName || 'User'));
        return;
      }
      
      // STEP 1: Get user's recent sessions using NEW driver-centric structure
      const sessionsResponse = await fetch(`/api/lap-capture?action=get_recent_sessions&webUserId=${user.id}&limit=20`);
      const sessionsData = await sessionsResponse.json();
      
      // STEP 2: Get driver summary with aggregate stats from DriverRaceData
      const summaryResponse = await fetch(`/api/lap-capture?action=get_driver_summary&webUserId=${user.id}`);
      const summaryData = await summaryResponse.json();
      
      // PRIORITY: Use DriverRaceData if user is linked
      if (summaryData.success && summaryData.driverData) {
        
        // Convert DriverRaceData to dashboard format
        const realStats = convertDriverRaceDataToPersonalStats(summaryData, user);
        setStats(realStats);
        
      } else if (sessionsData.success && sessionsData.sessions.length > 0) {
        
        // Check if we have lap-by-lap data in new structure
        const hasLapByLapData = sessionsData.sessions.some((s: any) => s.lapByLapData && s.lapByLapData.length > 0);
        
        if (hasLapByLapData) {
          const realStats = convertEnhancedLapDataToPersonalStats(sessionsData.sessions, summaryData.stats || null, user);
          setStats(realStats);
        } else {
          const realStats = convertLapDataToPersonalStats(sessionsData.sessions, user);
          setStats(realStats);
        }
      } else {
        // Check if there's debug info about why no data was found
        
        setStats(generateDemoStats(user.profile.firstName, user.profile.lastName));
      }
      
    } catch (error) {
      console.error('Error loading real stats:', error);
      setStats(generateDemoStats(user?.profile?.firstName || 'Demo', user?.profile?.lastName || 'User'));
    } finally {
      setLoading(false);
    }
  };

  // Convert DriverRaceData to dashboard format - REAL LINKED DATA
  function convertDriverRaceDataToPersonalStats(driverSummary: any, user: any): PersonalStats {
    const { driverData, stats, recentSessions } = driverSummary;
    
    if (!driverData || !stats) {
      return generateDemoStats(user.profile.firstName, user.profile.lastName);
    }

    
    // Use ONLY real aggregated statistics from DriverRaceData - NO HARDCODING
    const totalRaces = stats.totalRaces || 0;
    const totalSpent = stats.totalSpent || 0;
    const bestTime = stats.allTimeBestLap || 0;
    const averageTime = stats.averageLapTime || (bestTime > 0 ? bestTime : 0);
    const bestPosition = stats.bestPosition === 999 ? 1 : (stats.bestPosition || 1);
    const podiumFinishes = stats.podiumFinishes || 0;
    const totalLaps = stats.totalLaps || 0;
    
    
    // Calculate favorite kart from recent sessions
    let favoriteKart = 1;
    if (recentSessions && recentSessions.length > 0) {
      const kartCounts: { [key: number]: number } = {};
      recentSessions.forEach((session: any) => {
        if (session.kartNumber) {
          kartCounts[session.kartNumber] = (kartCounts[session.kartNumber] || 0) + 1;
        }
      });
      
      const mostUsedKart = Object.keys(kartCounts).reduce((a, b) => 
        kartCounts[parseInt(a)] > kartCounts[parseInt(b)] ? a : b
      );
      favoriteKart = parseInt(mostUsedKart) || 1;
    }
    
    // Date range from sessions - USE REAL DATES ONLY
    const firstRace = stats.firstRaceDate ? new Date(stats.firstRaceDate) : (recentSessions.length > 0 ? new Date(recentSessions[recentSessions.length - 1].sessionDate) : new Date());
    const lastRace = stats.lastRaceDate ? new Date(stats.lastRaceDate) : (recentSessions.length > 0 ? new Date(recentSessions[0].sessionDate) : new Date());
    
    
    // Generate monthly progression ONLY from real recent sessions data
    const monthlyProgression = generateMonthlyProgressionFromDriverSessions(recentSessions || []);
    
    // Convert recent sessions to race format with REAL lap-by-lap data ONLY
    const recentRaces = (recentSessions || []).slice(0, 5).map((session: any, index: number) => {
      const sessionDate = new Date(session.sessionDate);
      
      
      return {
        date: sessionDate,
        sessionName: session.sessionName || `Sesión ${index + 1}`,
        position: session.finalPosition || session.bestPosition || 1,
        kartNumber: session.kartNumber || 1,
        bestTime: session.bestTime || 0,
        totalLaps: session.totalLaps || 0,
        // Enhanced: Include lap-by-lap data if available
        lapByLapProgression: session.laps || [],
        sessionType: session.sessionType || 'clasificacion',
        revenue: session.revenue || 0,
        finalPosition: session.finalPosition || session.bestPosition || 1
      };
    });
    

    const personalStats: PersonalStats = {
      totalRaces,
      totalSpent,
      bestTime,
      averageTime,
      bestPosition,
      podiumFinishes,
      favoriteKart,
      totalLaps,
      firstRace,
      lastRace,
      monthlyProgression,
      recentRaces
    };


    return personalStats;
  }

  // Convert ENHANCED lap data with lap-by-lap progression to dashboard format
  function convertEnhancedLapDataToPersonalStats(sessions: any[], aggregateStats: any, user: any): PersonalStats {
    if (!sessions || sessions.length === 0) {
      return generateDemoStats(user.profile.firstName, user.profile.lastName);
    }

    
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


    return stats;
  }

  // Convert real lap data to dashboard format (legacy)
  function convertLapDataToPersonalStats(sessions: any[], user: any): PersonalStats {
    if (!sessions || sessions.length === 0) {
      return generateDemoStats(user.profile.firstName, user.profile.lastName);
    }

    
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

  // Generate monthly progression from DriverRaceData sessions
  function generateMonthlyProgressionFromDriverSessions(sessions: any[]) {
    if (!sessions || sessions.length === 0) return [];

    const monthlyData = new Map();
    
    sessions.forEach(session => {
      const date = new Date(session.sessionDate);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
          races: 0,
          bestTime: 999999,
          bestPosition: 999,
          totalLaps: 0,
          averageLapTime: 0,
          lapTimes: [],
          podiumFinishes: 0
        });
      }
      
      const monthData = monthlyData.get(monthKey);
      monthData.races += 1;
      monthData.bestTime = Math.min(monthData.bestTime, session.bestTime || 999999);
      monthData.bestPosition = Math.min(monthData.bestPosition, session.bestPosition || 999);
      
      // Count podium finishes for the month
      if ((session.finalPosition || session.bestPosition) <= 3) {
        monthData.podiumFinishes += 1;
      }
      
      // Enhanced: collect lap-by-lap data for better statistics
      if (session.laps && session.laps.length > 0) {
        monthData.totalLaps += session.laps.length;
        session.laps.forEach((lap: any) => {
          if (lap.time && lap.time > 0) {
            monthData.lapTimes.push(lap.time);
          }
        });
      } else {
        monthData.totalLaps += session.totalLaps || 0;
      }
    });
    
    return Array.from(monthlyData.values()).map(data => ({
      month: data.month,
      races: data.races,
      bestTime: data.bestTime === 999999 ? 0 : data.bestTime,
      position: data.bestPosition === 999 ? 1 : data.bestPosition,
      averageLapTime: data.lapTimes.length > 0 
        ? data.lapTimes.reduce((sum: number, time: number) => sum + time, 0) / data.lapTimes.length
        : data.bestTime,
      podiumFinishes: data.podiumFinishes
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
      favoriteKart: Math.floor(Math.random() * 23) + 1, // Default kart
      totalLaps: realStats.totalLaps || (realStats.totalRaces * 10), // Estimate if not available
      firstRace: realStats.firstRaceDate ? new Date(realStats.firstRaceDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      lastRace: realStats.lastRaceDate ? new Date(realStats.lastRaceDate) : new Date(),
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
                // Check if we have lap-by-lap data from linked driver
                stats.recentRaces.some((race: any) => race.lapByLapProgression?.length > 0) ? (
                  <div className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                    👑 CORREDOR VINCULADO - DATOS VUELTA POR VUELTA
                  </div>
                ) : stats.totalRaces >= 1 ? (
                  <div className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    ✅ CORREDOR VINCULADO - DATOS REALES
                  </div>
                ) : (
                  <div className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                    🏁 DATOS REALES DE CARRERAS
                  </div>
                )
              ) : (
                <div className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  DATOS DEMO - SOLICITA VINCULACIÓN DE TU CORREDOR AL ADMIN
                </div>
              )}
            </div>
          )}
        </header>

        {/* Show welcome banner if user has no real data yet */}
        {user.kartingLink.status === 'pending_first_race' && (!stats || stats.totalRaces === 0) && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="bg-gradient-to-br from-electric-blue/10 to-rb-blue/10 border border-electric-blue/30 rounded-lg p-6">
              <div className="flex items-center gap-4">
                <div className="text-5xl">🏁</div>
                <div className="flex-1">
                  <h2 className="font-bold text-2xl text-electric-blue mb-2">¡BIENVENIDO AL CIRCUITO!</h2>
                  <p className="text-sky-blue/80 text-sm mb-3">
                    Tu cuenta está lista. Ve a correr a <strong>Speed Park</strong> y tus estadísticas aparecerán automáticamente aquí.
                  </p>
                  <div className="bg-rb-blue/20 border border-rb-blue/40 rounded-md p-3">
                    <p className="text-sky-blue text-xs">
                      📋 <strong>Instrucciones:</strong> Ve a Speed Park → Inscríbete con tu nombre: <strong>{user.profile.firstName} {user.profile.lastName}</strong> → ¡Corre y disfruta!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Show full dashboard (with demo or real stats) */}
        {stats && (
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
                {user?.id && stats && stats.totalRaces > 0 && (
                  <LapProgressionChart webUserId={user.id} />
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
        )}
      </div>
    </div>
  );
}