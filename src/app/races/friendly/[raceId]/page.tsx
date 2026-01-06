'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import LoginModal from '@/components/auth/LoginModal';
import RegisterModal from '@/components/auth/RegisterModal';

interface Race {
  _id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  maxParticipants: number;
  participants: number;
  status: string;
  raceStatus: string;
  organizerName: string;
  organizerId: string;
  participantsList: Array<{
    userId: string;
    kartNumber: number;
    name: string;
  }>;
}

export default function FriendlyRacePage() {
  const params = useParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const [race, setRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  useEffect(() => {
    fetchRace();
  }, [params.raceId]);

  const fetchRace = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/races/friendly/${params.raceId}`);
      const data = await response.json();

      if (data.success) {
        setRace(data.race);
      } else {
        setError(data.error || 'Carrera no encontrada');
      }
    } catch (err) {
      console.error('Error fetching race:', err);
      setError('Error al cargar la carrera');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!token) {
      setShowLoginModal(true);
      return;
    }

    setJoining(true);
    try {
      const response = await fetch(`/api/races/friendly/${params.raceId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        // Refresh race data to show updated state
        await fetchRace();
      } else {
        alert(data.error || 'Error al unirse a la carrera');
      }
    } catch (error) {
      console.error('Error joining race:', error);
      alert('Error al unirse a la carrera');
    } finally {
      setJoining(false);
    }
  };

  const handleLoginSuccess = async () => {
    // After successful login, automatically join the race
    await handleJoin();
  };

  const switchToRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const switchToLogin = () => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="container mx-auto px-4 py-20">
          <div className="text-center">
            <div className="animate-spin text-6xl mb-4">🏁</div>
            <p className="text-sky-blue/70">Cargando carrera...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !race) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-2xl mx-auto bg-gradient-to-br from-midnight via-red-500/10 to-midnight border-2 border-red-400/50 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-2xl font-racing text-red-300 mb-2">
              CARRERA NO ENCONTRADA
            </h3>
            <p className="text-sky-blue/70 mb-6">
              {error || 'La carrera que buscas no existe'}
            </p>
            <button
              onClick={() => router.push('/races')}
              className="inline-block bg-electric-blue hover:bg-electric-blue/80 text-white font-racing px-8 py-3 rounded-lg transition-colors"
            >
              VER TODAS LAS CARRERAS
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isFull = race.participants >= race.maxParticipants;
  const isParticipant = race.participantsList.some(p => p.userId === user?.id);
  const isPast = new Date(race.date) < new Date();
  const canJoin = !isFull && !isParticipant && !isPast;

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <Navbar />

      {/* Background Effects */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(168, 85, 247, 0.1) 2px, transparent 2px)',
            backgroundSize: '100px 100px'
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-electric-blue/15 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-racing text-gold mb-4">
              🏁 {race.name}
            </h1>
            <p className="text-sky-blue/70 text-lg">
              Organizado por <span className="text-electric-blue font-bold">{race.organizerName}</span>
            </p>
          </div>

          {/* Race Details Card */}
          <div className="bg-gradient-to-br from-midnight via-electric-blue/20 to-midnight border-2 border-electric-blue/50 rounded-xl p-8 mb-6">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sky-blue/50 text-sm mb-1">📅 Fecha</p>
                <p className="text-white text-xl font-digital">
                  {new Date(race.date).toLocaleDateString('es-CL', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sky-blue/50 text-sm mb-1">🕐 Hora</p>
                <p className="text-white text-xl font-digital">{race.time}</p>
              </div>
              <div>
                <p className="text-sky-blue/50 text-sm mb-1">📍 Ubicación</p>
                <p className="text-white text-xl font-digital">{race.location || 'SpeedPark'}</p>
              </div>
              <div>
                <p className="text-sky-blue/50 text-sm mb-1">👥 Participantes</p>
                <p className="text-white text-xl font-digital">
                  {race.participants}/{race.maxParticipants}
                </p>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex gap-2 flex-wrap mb-6">
              {race.status === 'confirmed' && (
                <div className="px-3 py-1 rounded-lg text-xs font-racing bg-green-500/20 text-green-400 border border-green-400/30">
                  ✅ CONFIRMADO
                </div>
              )}
              {race.status !== 'confirmed' && (
                <div className="px-3 py-1 rounded-lg text-xs font-racing bg-orange-500/20 text-orange-400 border border-orange-400/30">
                  ⏳ PENDIENTE
                </div>
              )}
              {isFull && (
                <div className="px-3 py-1 rounded-lg text-xs font-racing bg-red-500/20 text-red-400 border border-red-400/30">
                  🔒 LLENA
                </div>
              )}
              {isPast && (
                <div className="px-3 py-1 rounded-lg text-xs font-racing bg-gray-500/20 text-gray-400 border border-gray-400/30">
                  📚 FINALIZADA
                </div>
              )}
            </div>

            {/* Participants List */}
            {race.participantsList.length > 0 && (
              <div className="bg-midnight/50 border border-electric-blue/30 rounded-lg p-4">
                <p className="text-electric-blue font-racing text-sm mb-3">👥 Pilotos Inscritos:</p>
                <div className="grid md:grid-cols-2 gap-2">
                  {race.participantsList.map((participant, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-sky-blue">
                      <span className="text-gold">#{participant.kartNumber}</span>
                      <span>{participant.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            {isParticipant ? (
              <div className="bg-gradient-to-br from-midnight via-green-500/20 to-midnight border-2 border-green-500/50 rounded-xl p-6 text-center">
                <div className="text-5xl mb-3">✅</div>
                <p className="text-green-400 font-racing text-xl mb-2">YA ESTÁS INSCRITO</p>
                <p className="text-sky-blue/70 text-sm">
                  ¡Nos vemos en la pista!
                </p>
              </div>
            ) : isFull ? (
              <div className="bg-gradient-to-br from-midnight via-red-500/20 to-midnight border-2 border-red-500/50 rounded-xl p-6 text-center">
                <div className="text-5xl mb-3">🔒</div>
                <p className="text-red-400 font-racing text-xl mb-2">CARRERA LLENA</p>
                <p className="text-sky-blue/70 text-sm">
                  No quedan cupos disponibles
                </p>
              </div>
            ) : isPast ? (
              <div className="bg-gradient-to-br from-midnight via-gray-500/20 to-midnight border-2 border-gray-500/50 rounded-xl p-6 text-center">
                <div className="text-5xl mb-3">📚</div>
                <p className="text-gray-400 font-racing text-xl mb-2">CARRERA FINALIZADA</p>
                <p className="text-sky-blue/70 text-sm">
                  Esta carrera ya pasó
                </p>
              </div>
            ) : token ? (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full py-4 bg-gradient-to-r from-electric-blue to-cyan-500 text-white font-racing text-xl rounded-lg hover:shadow-2xl hover:shadow-electric-blue/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joining ? '⏳ UNIÉNDOTE...' : '🏁 UNIRSE A LA CARRERA'}
              </button>
            ) : (
              <div className="bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-cyan-500/10 border-2 border-cyan-400/50 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-cyan-300 font-racing text-sm sm:text-base flex items-center gap-2">
                    📝 Para inscribirte en esta carrera debes hacer login
                  </p>
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-racing text-lg rounded-lg hover:shadow-2xl hover:shadow-cyan-400/50 transition-all whitespace-nowrap"
                  >
                    🔐 LOGIN
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => router.push('/races')}
              className="w-full py-3 bg-slate-600/20 border border-slate-500/50 text-slate-300 font-racing rounded-lg hover:bg-slate-600/30 transition-all"
            >
              ← VOLVER A CARRERAS
            </button>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToRegister={switchToRegister}
        redirectAfterLogin={false}
        onSuccess={handleLoginSuccess}
      />

      {/* Register Modal */}
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={switchToLogin}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
