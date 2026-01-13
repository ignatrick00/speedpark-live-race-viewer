'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import PersonalStatsCard from '@/components/PersonalStatsCard';
import RaceHistoryTable from '@/components/RaceHistoryTable';
import ProgressChart from '@/components/ProgressChart';
import AchievementsBadge from '@/components/AchievementsBadge';
import LoginModal from '@/components/auth/LoginModal';
import RegisterModal from '@/components/auth/RegisterModal';
import ChallengeModal from '@/components/ChallengeModal';

export default function PublicDriverPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const driverName = decodeURIComponent(params.driverName as string);

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [pendingChallenge, setPendingChallenge] = useState(false);

  useEffect(() => {
    loadPublicProfile();
  }, [driverName]);

  // Auto-open challenge modal after successful login
  useEffect(() => {
    if (user && pendingChallenge) {
      setPendingChallenge(false);
      setShowChallengeModal(true);
    }
  }, [user, pendingChallenge]);

  const loadPublicProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, find userId by driver name
      const userResponse = await fetch(`/api/public/driver-by-name?name=${encodeURIComponent(driverName)}`);
      const userData = await userResponse.json();

      if (!userData.success) {
        setError('Piloto no encontrado o sin perfil vinculado');
        setLoading(false);
        return;
      }

      // Then, fetch stats using the same API as private dashboard
      const statsResponse = await fetch(`/api/user-stats?webUserId=${userData.userId}`);
      const statsData = await statsResponse.json();

      if (!statsData.success) {
        setError('No se pudieron cargar las estadísticas del piloto');
        setLoading(false);
        return;
      }

      // Set profile info
      setProfile({
        userId: userData.userId,
        driverName: userData.driverName,
        firstName: userData.profile.firstName,
        lastName: userData.profile.lastName,
        photoUrl: userData.profile.photoUrl || null
      });

      // Transform to dashboard format (same as private dashboard)
      const transformedStats = statsData.stats ? {
        totalRaces: statsData.stats.totalRaces || 0,
        totalSpent: statsData.stats.totalSpent || 0,
        bestTime: statsData.stats.bestTime || 0,
        averageTime: statsData.stats.avgTime || 0,
        bestPosition: statsData.stats.bestPosition || 1,
        podiumFinishes: statsData.stats.podiumFinishes || 0,
        favoriteKart: statsData.stats.favoriteKart || 1,
        totalLaps: statsData.stats.totalLaps || 0,
        firstRace: statsData.stats.firstRace ? new Date(statsData.stats.firstRace) : new Date(),
        lastRace: statsData.stats.lastRace ? new Date(statsData.stats.lastRace) : new Date(),
        monthlyProgression: statsData.stats.monthlyProgression || [],
        recentRaces: (statsData.stats.recentRaces || []).map((race: any) => ({
          date: new Date(race.date),
          sessionName: race.sessionName,
          sessionId: race.sessionName,
          position: race.position || 0,
          kartNumber: race.kartNumber || 0,
          bestTime: race.bestTime || 0,
          totalLaps: race.totalLaps || 0
        }))
      } : null;

      setStats(transformedStats);

    } catch (error) {
      console.error('Error loading public profile:', error);
      setError('Error al cargar el perfil del piloto');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeMs: number | null | undefined) => {
    if (!timeMs || timeMs === 0) return '--:--';
    const minutes = Math.floor(timeMs / 60000);
    const seconds = ((timeMs % 60000) / 1000).toFixed(3);
    return `${minutes}:${parseFloat(seconds).toFixed(3).padStart(6, '0')}`;
  };

  const handleChallengeClick = () => {
    if (!user) {
      // User not logged in - open login modal
      setPendingChallenge(true);
      setShowLoginModal(true);
    } else {
      // User is logged in - open challenge modal
      setShowChallengeModal(true);
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    // Challenge modal will open automatically via useEffect
  };

  const handleSwitchToRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const handleSwitchToLogin = () => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-midnight via-racing-black to-midnight flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-electric-blue text-xl font-racing">Cargando perfil...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !profile) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-midnight via-racing-black to-midnight flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">🏎️</div>
            <h1 className="text-2xl font-racing text-gold mb-2">Piloto no encontrado</h1>
            <p className="text-sky-blue/70 mb-6">{error}</p>
            <button
              onClick={() => router.push('/ranking')}
              className="bg-electric-blue text-midnight px-6 py-3 rounded-lg font-racing hover:bg-gold transition-all"
            >
              Ver Rankings
            </button>
          </div>
        </div>
      </>
    );
  }

  // Handle case where profile exists but no stats
  if (!stats) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-midnight via-racing-black to-midnight p-6">
          <div className="max-w-7xl mx-auto mb-4">
            <button
              onClick={() => router.push('/ranking')}
              className="text-sky-blue hover:text-electric-blue transition-colors flex items-center gap-2"
            >
              ← Volver a Rankings
            </button>
          </div>

          <header className="text-center mb-8">
            <h1 className="font-bold text-4xl md:text-6xl mb-3 tracking-wider bg-gradient-to-r from-electric-blue via-sky-blue to-karting-gold bg-clip-text text-transparent">
              DASHBOARD DE {profile.driverName.toUpperCase()}
            </h1>
          </header>

          <div className="max-w-4xl mx-auto">
            <div className="bg-racing-black/50 border border-electric-blue/20 rounded-xl p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-2xl font-racing text-gold mb-2">Sin estadísticas disponibles</h2>
              <p className="text-sky-blue/70 mb-4">
                {profile.firstName} {profile.lastName} aún no tiene carreras registradas en el sistema.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase();

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-midnight via-racing-black to-midnight p-6">
        {/* Back Button */}
        <div className="max-w-7xl mx-auto mb-4">
          <button
            onClick={() => router.push('/ranking')}
            className="text-sky-blue hover:text-electric-blue transition-colors flex items-center gap-2"
          >
            ← Volver a Rankings
          </button>
        </div>

        {/* Page Title */}
        <header className="text-center mb-8 relative">
          <h1 className="font-bold text-4xl md:text-6xl mb-6 tracking-wider bg-gradient-to-r from-electric-blue via-sky-blue to-karting-gold bg-clip-text text-transparent">
            DASHBOARD DE {profile.driverName.toUpperCase()}
          </h1>

          {/* Challenge Button - Centered below title */}
          <div className="flex justify-center">
            <button
              onClick={handleChallengeClick}
              className="px-8 py-4 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white font-racing text-xl rounded-xl hover:scale-105 hover:shadow-2xl hover:shadow-red-500/50 transition-all flex items-center gap-3 animate-bounce border-2 border-red-400/50"
            >
              ⚔️ RETAR A CARRERA
            </button>
          </div>
        </header>

        {/* Perfil de Piloto y Resumen - Two Columns */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Perfil de Piloto */}
            <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
              <h3 className="text-2xl font-bold text-electric-blue mb-6 text-center">
                🏁 PERFIL DE PILOTO
              </h3>

              {/* Profile Photo */}
              <div className="flex justify-center mb-6">
                {profile.photoUrl ? (
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-electric-blue/50 shadow-lg shadow-electric-blue/30">
                    <img
                      src={profile.photoUrl}
                      alt={`${profile.firstName} ${profile.lastName}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400/30 to-blue-500/30 border-4 border-electric-blue/50 flex items-center justify-center shadow-lg shadow-electric-blue/30">
                    <span className="text-cyan-400 font-bold text-4xl">
                      {initials}
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-black/30 backdrop-blur-sm border border-cyan-400/30 rounded-xl overflow-hidden">
                <table className="w-full">
                  <tbody>
                    <tr className="border-b border-blue-800/30">
                      <td className="py-4 px-6 text-blue-300 text-sm uppercase tracking-wider font-medium">
                        Nombre de Piloto:
                      </td>
                      <td className="py-4 px-6 text-white font-bold text-lg">
                        {profile.firstName} {profile.lastName}
                      </td>
                    </tr>
                    <tr className="border-b border-blue-800/30">
                      <td className="py-4 px-6 text-blue-300 text-sm uppercase tracking-wider font-medium">
                        Alias:
                      </td>
                      <td className="py-4 px-6 text-electric-blue font-bold text-lg">
                        {profile.driverName}
                      </td>
                    </tr>
                    <tr className="border-b border-blue-800/30">
                      <td className="py-4 px-6 text-blue-300 text-sm uppercase tracking-wider font-medium">
                        Primera Carrera:
                      </td>
                      <td className="py-4 px-6 text-white font-medium">
                        {stats.firstRace.toLocaleDateString('es-CL')}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 px-6 text-blue-300 text-sm uppercase tracking-wider font-medium">
                        Última Carrera:
                      </td>
                      <td className="py-4 px-6 text-white font-medium">
                        {stats.lastRace.toLocaleDateString('es-CL')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column - Resumen */}
            <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
              <h3 className="text-2xl font-bold text-electric-blue mb-6 text-center">
                📊 RESUMEN
              </h3>
              <div className="space-y-4">
                <div className="bg-black/30 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-300 text-sm uppercase tracking-wider">Total Carreras</span>
                    <span className="text-white font-bold text-2xl">{stats.totalRaces}</span>
                  </div>
                </div>
                <div className="bg-black/30 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-300 text-sm uppercase tracking-wider">Total Vueltas</span>
                    <span className="text-electric-blue font-bold text-2xl">{stats.totalLaps}</span>
                  </div>
                </div>
                <div className="bg-black/30 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-300 text-sm uppercase tracking-wider">Mejor Tiempo</span>
                    <span className="text-karting-gold font-bold text-2xl font-mono">{formatTime(stats.bestTime)}</span>
                  </div>
                </div>
                <div className="bg-black/30 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-300 text-sm uppercase tracking-wider">Tiempo Promedio</span>
                    <span className="text-white font-bold text-2xl font-mono">{formatTime(stats.averageTime)}</span>
                  </div>
                </div>
                <div className="bg-black/30 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-300 text-sm uppercase tracking-wider">Podios</span>
                    <span className="text-cyan-400 font-bold text-2xl">{stats.podiumFinishes}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Show full dashboard */}
        <div className="max-w-7xl mx-auto">
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
              <ProgressChart races={stats.recentRaces} />

              {/* Recent Races */}
              <RaceHistoryTable races={stats.recentRaces} />
            </div>

            {/* Right Column - Achievements */}
            <div className="space-y-6">
              <AchievementsBadge
                totalRaces={stats.totalRaces}
                bestTime={stats.bestTime}
                bestPosition={stats.bestPosition}
                podiumFinishes={stats.podiumFinishes}
                totalSpent={stats.totalSpent}
              />
            </div>
          </div>
        </div>

        {/* Modals */}
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => {
            setShowLoginModal(false);
            setPendingChallenge(false);
          }}
          onSuccess={handleLoginSuccess}
          onSwitchToRegister={handleSwitchToRegister}
        />

        <RegisterModal
          isOpen={showRegisterModal}
          onClose={() => {
            setShowRegisterModal(false);
            setPendingChallenge(false);
          }}
          onSuccess={handleLoginSuccess}
          onSwitchToLogin={handleSwitchToLogin}
        />

        <ChallengeModal
          isOpen={showChallengeModal}
          onClose={() => setShowChallengeModal(false)}
          challengedDriverName={profile.driverName}
          challengedUserId={profile.userId}
        />
      </div>
    </>
  );
}
