'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import LoginModal from '@/components/auth/LoginModal';
import RegisterModal from '@/components/auth/RegisterModal';

interface NextRace {
  _id: string;
  name: string;
  date: string;
  time: string;
  participantCount: number;
  maxParticipants: number;
  isFull: boolean;
  isUserRegistered: boolean;
  status: string;
}

export default function NextExpressRaceV0() {
  const { user, token } = useAuth();
  const [race, setRace] = useState<NextRace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [pendingJoin, setPendingJoin] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchNextRace();

    // Refresh every 30 seconds
    const interval = setInterval(fetchNextRace, 30000);
    return () => clearInterval(interval);
  }, [token]); // Re-fetch when token changes (login/logout)

  // Auto-join after login when token becomes available
  useEffect(() => {
    if (token && pendingJoin && race) {
      setPendingJoin(false);
      handleJoinRace();
    }
  }, [token, pendingJoin, race]);

  const fetchNextRace = async () => {
    try {
      const headers: HeadersInit = token
        ? { Authorization: `Bearer ${token}` }
        : {};

      const response = await fetch('/api/races/next-express', { headers });
      const data = await response.json();

      if (data.success) {
        setRace(data.race);
      } else {
        setError(data.error || 'Error al cargar carrera');
      }
    } catch (err) {
      console.error('Error fetching next race:', err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRace = async () => {
    if (!user || !token) {
      setPendingJoin(true);
      setShowLoginModal(true);
      return;
    }

    if (!race) return;

    setIsJoining(true);
    try {
      const response = await fetch(`/api/races/friendly/${race._id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}), // Kart auto-assigned
      });

      const data = await response.json();

      if (data.success) {
        setToast({ message: '¡Inscrito!', type: 'success' });
        // Refresh race data
        await fetchNextRace();
      } else {
        setToast({ message: data.error || 'Error al inscribirse', type: 'error' });
      }
    } catch (err) {
      console.error('Error joining race:', err);
      setToast({ message: 'Error de conexión', type: 'error' });
    } finally {
      setIsJoining(false);
    }
  };

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleLoginSuccess = () => {
    // Don't call handleJoin here - let useEffect handle it when token updates
    // Just close the modal - useEffect will auto-join
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'America/Santiago',
    };
    const formatted = date.toLocaleDateString('es-CL', options);
    // Capitalize first letter
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-racing-black/80 to-racing-black/60 border border-gold/30 rounded-xl p-6 shadow-lg animate-pulse">
        <div className="h-6 bg-gold/20 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-sky-blue/20 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-sky-blue/20 rounded w-2/3"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-racing-black/80 to-racing-black/60 border border-red-500/30 rounded-xl p-6">
        <p className="text-red-400 text-sm">❌ {error}</p>
      </div>
    );
  }

  if (!race) {
    return (
      <div className="bg-gradient-to-br from-racing-black/80 to-racing-black/60 border border-sky-blue/20 rounded-xl p-6">
        <h3 className="text-xl font-racing text-sky-blue mb-2">🏁 Próxima Carrera Express</h3>
        <p className="text-sky-blue/60 text-sm">No hay carreras próximas programadas</p>
      </div>
    );
  }

  const progressPercentage = (race.participantCount / race.maxParticipants) * 100;

  // Button logic
  let buttonText = 'INSCRIBIRSE';
  let buttonClass = 'bg-gold hover:bg-gold/80 text-racing-black';
  let buttonDisabled = false;

  if (!user) {
    buttonText = 'Inicia Sesión para Inscribirte';
    buttonClass = 'bg-electric-blue/20 hover:bg-electric-blue/30 text-electric-blue border border-electric-blue/40';
  } else if (race.isUserRegistered) {
    buttonText = 'YA INSCRITO ✓';
    buttonClass = 'bg-green-500/20 text-green-400 border border-green-400/40';
    buttonDisabled = true;
  } else if (race.isFull) {
    buttonText = 'CARRERA LLENA';
    buttonClass = 'bg-gray-500/20 text-gray-400 border border-gray-400/40';
    buttonDisabled = true;
  }

  return (
    <>
      <div className="bg-gradient-to-br from-racing-black/80 to-racing-black/60 border border-gold/30 rounded-xl p-6 shadow-lg hover:shadow-gold/20 transition-all">
        <h3 className="text-xl font-racing text-gold mb-4 flex items-center gap-2">
          🏁 Próxima Carrera Express
        </h3>

        {/* Race Name */}
        <div className="mb-3">
          <p className="text-2xl font-bold text-white mb-1">{race.name}</p>
        </div>

        {/* Date and Time */}
        <div className="mb-4 space-y-1">
          <div className="flex items-center gap-2 text-sky-blue">
            <span className="text-lg">📅</span>
            <span className="font-semibold">{formatDate(race.date)}</span>
          </div>
          <div className="flex items-center gap-2 text-electric-blue">
            <span className="text-lg">⏰</span>
            <span className="font-semibold text-xl">{race.time}</span>
          </div>
        </div>

        {/* Participants Count */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-sky-blue/80">Pilotos Inscritos</span>
            <span className="text-lg font-bold text-white">
              {race.participantCount}/{race.maxParticipants}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-700/30 rounded-full h-3 overflow-hidden border border-sky-blue/20">
            <div
              className="h-full bg-gradient-to-r from-electric-blue to-sky-blue transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Join Button */}
        <button
          onClick={handleJoinRace}
          disabled={buttonDisabled || isJoining}
          className={`w-full py-3 px-4 rounded-lg font-racing text-lg transition-all ${buttonClass} ${
            buttonDisabled ? 'cursor-not-allowed opacity-60' : 'hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {isJoining ? 'INSCRIBIENDO...' : buttonText}
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div
            className={`px-6 py-3 rounded-lg shadow-lg border ${
              toast.type === 'success'
                ? 'bg-green-500/90 border-green-400 text-white'
                : 'bg-red-500/90 border-red-400 text-white'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToRegister={() => {
          setShowLoginModal(false);
          setShowRegisterModal(true);
        }}
        redirectAfterLogin={false}
        onSuccess={handleLoginSuccess}
      />

      {/* Register Modal */}
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={() => {
          setShowRegisterModal(false);
          setShowLoginModal(true);
        }}
        redirectAfterRegister={false}
        onSuccess={handleLoginSuccess}
      />
    </>
  );
}
