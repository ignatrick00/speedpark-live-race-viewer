'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { EventCategoryConfig } from '@/types/squadron-events';
import { useRouter, useSearchParams } from 'next/navigation';
import JoinEventModal from '@/components/JoinEventModal';
import Toast from '@/components/Toast';
import LoginModal from '@/components/auth/LoginModal';
import RegisterModal from '@/components/auth/RegisterModal';
import RaceResultsModal from '@/components/RaceResultsModal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type ViewMode = 'selection' | 'championships' | 'championships-upcoming' | 'championships-past' | 'friendly' | 'friendly-upcoming' | 'friendly-past' | 'friendly-create' | 'my-registered-events';

interface Participant {
  userId: string;
  kartNumber: number;
  name: string;
  joinedAt: Date;
  driverName?: string; // SMS-Timing driver name from kartingLink
}

interface Race {
  _id: string;
  name: string;
  date: Date;
  time: string;
  type: 'championship' | 'friendly';
  participants: number;
  maxParticipants?: number;
  organizerId?: string;
  organizerName?: string;
  participantsList?: Participant[];
  linkedRaceSessionId?: string;
  raceStatus?: 'pending' | 'linked' | 'finalized';
  results?: {
    sessionId: string;
    sessionName: string;
    sessionDate: Date;
    linkedAt: Date;
  };
}

function RacesPageContent() {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<ViewMode>('selection');
  const [championshipRaces, setChampionshipRaces] = useState<Race[]>([]);
  const [friendlyRaces, setFriendlyRaces] = useState<Race[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Calculate available friendly races (upcoming, not registered, not linked/finalized)
  const getAvailableFriendlyRacesCount = () => {
    return friendlyRaces.filter(race => {
      const raceDate = new Date(race.date);
      const now = new Date();
      const isFuture = raceDate >= now;
      const isNotLinked = !race.linkedRaceSessionId && race.raceStatus !== 'linked' && race.raceStatus !== 'finalized';

      // Exclude races where current user is already registered
      const isUserRegistered = user?.id && race.participantsList?.some(
        (participant) => participant.userId === user.id
      );

      return isFuture && isNotLinked && !isUserRegistered;
    }).length;
  };

  useEffect(() => {
    console.log('🔄 ViewMode changed to:', viewMode);
  }, [viewMode]);

  // Check URL params on mount to set initial view mode
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'friendly-create') {
      setViewMode('friendly-create');
    }
  }, [searchParams]);

  useEffect(() => {
    // Always fetch races (public or authenticated)
    fetchRaces();

    // Only fetch invitations if authenticated
    if (token) {
      fetchInvitations();
    }
  }, [token]);

  const fetchRaces = async () => {
    try {
      setIsLoading(true);

      // Fetch all friendly races (both upcoming and past)
      // Include auth header only if token exists (public access allowed)
      const headers: HeadersInit = token
        ? { 'Authorization': `Bearer ${token}` }
        : {};

      const friendlyResponse = await fetch('/api/races/friendly?filter=all', { headers });
      const friendlyData = await friendlyResponse.json();

      if (friendlyData.success) {
        const allRaces = friendlyData.races || [];
        setFriendlyRaces(allRaces);
        console.log(`📊 Loaded ${allRaces.length} friendly races`);
      }

      // TODO: Fetch championship races
      setChampionshipRaces([]);
    } catch (error) {
      console.error('Error fetching races:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      setInvitationsLoading(true);
      const response = await fetch('/api/invitations', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        // Filter only event invitations (not squadron invitations)
        const eventInvitations = (data.invitations || []).filter((inv: any) => inv.type === 'event');
        setInvitations(eventInvitations);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setInvitationsLoading(false);
    }
  };

  const handleInvitationResponse = async (eventId: string, accept: boolean) => {
    try {
      const response = await fetch(`/api/squadron-events/${eventId}/respond-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ accept }),
      });

      const data = await response.json();
      if (data.success) {
        alert(accept ? '¡Te has unido al evento!' : 'Invitación rechazada');
        fetchInvitations(); // Refresh invitations
        fetchRaces(); // Refresh races
      } else {
        alert(data.error || 'Error al procesar la invitación');
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
      alert('Error al procesar la invitación');
    }
  };

  const switchToRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const switchToLogin = () => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-midnight via-racing-black to-midnight p-4 md:p-8">
        {/* Header */}
        <div className="max-w-6xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-racing text-gold mb-2">
                🏁 CARRERAS
              </h1>
              <p className="text-sky-blue/70">
                Campeonatos y carreras amistosas
              </p>
            </div>
            <button
              onClick={() => setViewMode('selection')}
              className="px-4 py-2 border border-electric-blue/50 text-electric-blue rounded-lg hover:bg-electric-blue/10 transition-all"
            >
              ← VOLVER
            </button>
          </div>

          {/* Invitations Section */}
          {!invitationsLoading && invitations.length > 0 && (
            <div className="bg-gradient-to-br from-purple-900/40 via-purple-800/30 to-purple-900/40 border-2 border-purple-500/50 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-3xl">📨</span>
                <h2 className="text-2xl font-racing text-purple-400">
                  INVITACIONES PENDIENTES
                </h2>
                <span className="px-3 py-1 bg-purple-500/30 border border-purple-400/50 text-purple-300 rounded-full text-sm font-racing">
                  {invitations.length}
                </span>
              </div>

              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.invitationId}
                    className="bg-midnight/50 border border-purple-500/30 rounded-lg p-4 hover:border-purple-400/50 transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-racing text-white">
                            {invitation.eventName}
                          </h3>
                          <span className="px-2 py-0.5 bg-gold/20 border border-gold/50 text-gold rounded text-xs font-racing">
                            KART #{invitation.kartNumber}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-sky-blue/50">📍 Ubicación:</p>
                            <p className="text-sky-blue font-medium">
                              {invitation.location || 'SpeedPark'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sky-blue/50">🏁 Escudería:</p>
                            <p className="text-sky-blue font-medium">
                              {invitation.squadron?.name || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sky-blue/50">📅 Fecha:</p>
                            <p className="text-sky-blue font-digital">
                              {new Date(invitation.eventDate).toLocaleDateString('es-CL', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-sky-blue/50">🕐 Hora:</p>
                            <p className="text-sky-blue font-digital text-lg font-bold">
                              {invitation.eventTime || '19:00'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sky-blue/50">⏱️ Duración:</p>
                            <p className="text-sky-blue font-digital">
                              {invitation.duration ? `${Math.floor(invitation.duration / 60)}h ${invitation.duration % 60}min` : '90min'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sky-blue/50">👤 Invitado por:</p>
                            <p className="text-sky-blue">
                              {invitation.invitedBy?.profile?.alias ||
                               `${invitation.invitedBy?.profile?.firstName} ${invitation.invitedBy?.profile?.lastName}` ||
                               invitation.invitedBy?.email}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-sky-blue/50">⏰ Expira en:</p>
                            <p className="text-red-400 font-digital text-lg font-bold">
                              {Math.max(0, Math.floor((new Date(invitation.expiresAt).getTime() - Date.now()) / (1000 * 60)))} minutos
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleInvitationResponse(invitation.eventId, true)}
                          className="px-4 py-2 bg-green-600/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-600/30 transition-all font-racing"
                        >
                          ✓ ACEPTAR
                        </button>
                        <button
                          onClick={() => handleInvitationResponse(invitation.eventId, false)}
                          className="px-4 py-2 bg-red-600/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-600/30 transition-all font-racing"
                        >
                          ✕ RECHAZAR
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto">
        {viewMode === 'selection' && (
          <SelectionView
            onSelectChampionships={() => setViewMode('championships')}
            onSelectFriendly={() => setViewMode('friendly')}
            onSelectMyEvents={() => setViewMode('my-registered-events')}
            upcomingFriendlyCount={getAvailableFriendlyRacesCount()}
          />
        )}

        {viewMode === 'championships' && (
          <ChampionshipsSelectionView
            onSelectUpcoming={() => setViewMode('championships-upcoming')}
            onSelectPast={() => setViewMode('championships-past')}
            onBack={() => setViewMode('selection')}
          />
        )}

        {viewMode === 'championships-upcoming' && (
          <ChampionshipsUpcomingView
            races={championshipRaces}
            isLoading={isLoading}
            onRefresh={fetchRaces}
          />
        )}

        {viewMode === 'championships-past' && (
          <ChampionshipsPastView
            races={championshipRaces}
            isLoading={isLoading}
            onRefresh={fetchRaces}
          />
        )}

        {viewMode === 'friendly' && (
          <FriendlySelectionView
            onSelectUpcoming={() => setViewMode('friendly-upcoming')}
            onSelectPast={() => setViewMode('friendly-past')}
            onSelectCreate={() => setViewMode('friendly-create')}
            onBack={() => setViewMode('selection')}
            upcomingFriendlyCount={getAvailableFriendlyRacesCount()}
          />
        )}

        {viewMode === 'friendly-upcoming' && (
          <FriendlyUpcomingView
            races={friendlyRaces}
            isLoading={isLoading}
            onRefresh={fetchRaces}
            onLoginClick={() => setShowLoginModal(true)}
          />
        )}

        {viewMode === 'friendly-past' && (
          <FriendlyPastView
            races={friendlyRaces}
            isLoading={isLoading}
            onRefresh={fetchRaces}
            onLoginClick={() => setShowLoginModal(true)}
          />
        )}

        {viewMode === 'friendly-create' && (
          <FriendlyCreateView
            token={token}
            onBack={() => setViewMode('selection')}
            onSuccess={() => {
              fetchRaces();
              setViewMode('my-registered-events');
            }}
            onLoginClick={() => setShowLoginModal(true)}
            friendlyRaces={friendlyRaces}
          />
        )}

        {viewMode === 'my-registered-events' && (
          <MyRegisteredEventsView
            token={token}
            userId={user?.id}
            onRefresh={fetchRaces}
          />
        )}
      </div>
    </div>

    {/* Login and Register Modals */}
    <LoginModal
      isOpen={showLoginModal}
      onClose={() => setShowLoginModal(false)}
      onSwitchToRegister={switchToRegister}
      redirectAfterLogin={false}
    />
    <RegisterModal
      isOpen={showRegisterModal}
      onClose={() => setShowRegisterModal(false)}
      onSwitchToLogin={switchToLogin}
    />
    </>
  );
}

// Selection View - Three big cards
function SelectionView({
  onSelectChampionships,
  onSelectFriendly,
  onSelectMyEvents,
  upcomingFriendlyCount = 0,
}: {
  onSelectChampionships: () => void;
  onSelectFriendly: () => void;
  onSelectMyEvents: () => void;
  upcomingFriendlyCount?: number;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Championships Card */}
      <button
        onClick={onSelectChampionships}
        className="group relative bg-gradient-to-br from-midnight via-cyan-500/20 to-midnight border-2 border-cyan-400 rounded-2xl p-10 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-400/50"
      >
        <div className="text-center">
          <div className="text-7xl mb-4 group-hover:scale-110 transition-transform">
            🏆
          </div>
          <h2 className="text-3xl font-racing text-cyan-400 mb-3">
            CAMPEONATOS
          </h2>
          <p className="text-sky-blue/70 text-sm mb-4">
            Competencias oficiales organizadas
          </p>
          <div className="inline-block px-4 py-2 bg-cyan-400/20 border border-cyan-400/50 text-cyan-300 rounded-lg font-racing text-sm">
            VER CAMPEONATOS
          </div>
        </div>
      </button>

      {/* Friendly Races Card */}
      <button
        onClick={onSelectFriendly}
        className="group relative bg-gradient-to-br from-midnight via-electric-blue/20 to-midnight border-2 border-electric-blue rounded-2xl p-10 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-electric-blue/50"
      >
        {/* Badge de notificación */}
        {upcomingFriendlyCount > 0 && (
          <div className="absolute -top-3 -right-3 z-10">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500 rounded-full blur-md animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-red-500 to-red-600 text-white font-racing text-lg font-bold rounded-full w-14 h-14 flex items-center justify-center border-4 border-midnight shadow-lg">
                {upcomingFriendlyCount}
              </div>
            </div>
          </div>
        )}

        <div className="text-center">
          <div className="text-7xl mb-4 group-hover:scale-110 transition-transform">
            🤝
          </div>
          <h2 className="text-3xl font-racing text-electric-blue mb-3">
            CARRERAS AMISTOSAS
          </h2>
          <p className="text-sky-blue/70 text-sm mb-4">
            Crea o únete a carreras casuales
          </p>
          {upcomingFriendlyCount > 0 && (
            <p className="text-gold font-racing text-sm mb-2 animate-pulse">
              🔥 {upcomingFriendlyCount} {upcomingFriendlyCount === 1 ? 'carrera disponible' : 'carreras disponibles'}
            </p>
          )}
          <div className="inline-block px-4 py-2 bg-electric-blue/20 border border-electric-blue/50 text-electric-blue rounded-lg font-racing text-sm">
            VER AMISTOSAS
          </div>
        </div>
      </button>

      {/* My Registered Events Card */}
      <button
        onClick={onSelectMyEvents}
        className="group relative bg-gradient-to-br from-midnight via-purple-500/20 to-midnight border-2 border-purple-400 rounded-2xl p-10 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-400/50"
      >
        <div className="text-center">
          <div className="text-7xl mb-4 group-hover:scale-110 transition-transform">
            📋
          </div>
          <h2 className="text-3xl font-racing text-purple-400 mb-3">
            MIS CARRERAS
          </h2>
          <p className="text-sky-blue/70 text-sm mb-4">
            Eventos en los que estás inscrito
          </p>
          <div className="inline-block px-4 py-2 bg-purple-400/20 border border-purple-400/50 text-purple-300 rounded-lg font-racing text-sm">
            VER MIS CARRERAS
          </div>
        </div>
      </button>

      {/* Rules Card */}
      <a
        href="/reglas"
        className="group relative bg-gradient-to-br from-midnight via-yellow-500/20 to-midnight border-2 border-yellow-400 rounded-2xl p-10 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-400/50"
      >
        <div className="text-center">
          <div className="text-7xl mb-4 group-hover:scale-110 transition-transform">
            📖
          </div>
          <h2 className="text-3xl font-racing text-yellow-400 mb-3">
            REGLAS
          </h2>
          <p className="text-sky-blue/70 text-sm mb-4">
            Normativa y reglamentos
          </p>
          <div className="inline-block px-4 py-2 bg-yellow-400/20 border border-yellow-400/50 text-yellow-300 rounded-lg font-racing text-sm">
            VER REGLAS
          </div>
        </div>
      </a>
    </div>
  );
}

// Championships Selection View - Two Columns
function ChampionshipsSelectionView({
  onSelectUpcoming,
  onSelectPast,
  onBack,
}: {
  onSelectUpcoming: () => void;
  onSelectPast: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div className="grid md:grid-cols-2 gap-8 mb-6">
        {/* Próximas Carreras Card */}
        <button
          onClick={onSelectUpcoming}
          className="group relative bg-gradient-to-br from-midnight via-cyan-400/20 to-midnight border-2 border-cyan-400 rounded-2xl p-12 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-400/50"
        >
          <div className="text-center">
            <div className="text-8xl mb-6 group-hover:scale-110 transition-transform">
              🏁
            </div>
            <h2 className="text-4xl font-racing text-cyan-400 mb-4">
              PRÓXIMAS CARRERAS
            </h2>
            <p className="text-sky-blue/70 text-lg mb-6">
              Campeonatos futuros y disponibles
            </p>
            <div className="inline-block px-6 py-3 bg-cyan-400/20 border border-cyan-400/50 text-cyan-300 rounded-lg font-racing">
              VER PRÓXIMAS
            </div>
          </div>
        </button>

        {/* Carreras Pasadas Card */}
        <button
          onClick={onSelectPast}
          className="group relative bg-gradient-to-br from-midnight via-slate-500/20 to-midnight border-2 border-slate-400 rounded-2xl p-12 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-400/50"
        >
          <div className="text-center">
            <div className="text-8xl mb-6 group-hover:scale-110 transition-transform">
              📚
            </div>
            <h2 className="text-4xl font-racing text-slate-300 mb-4">
              CARRERAS PASADAS
            </h2>
            <p className="text-sky-blue/70 text-lg mb-6">
              Historial de campeonatos completados
            </p>
            <div className="inline-block px-6 py-3 bg-slate-400/20 border border-slate-400/50 text-slate-300 rounded-lg font-racing">
              VER HISTORIAL
            </div>
          </div>
        </button>
      </div>

      {/* Back Button */}
      <div className="text-center">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-sky-blue/30 text-sky-blue/70 rounded-lg hover:bg-sky-blue/10 transition-all"
        >
          ← VOLVER
        </button>
      </div>
    </div>
  );
}

// Championships Upcoming View
function ChampionshipsUpcomingView({
  races,
  isLoading,
  onRefresh,
}: {
  races: Race[];
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const [squadronEvents, setSquadronEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    fetchSquadronEvents();
  }, []);

  const fetchSquadronEvents = async () => {
    try {
      const response = await fetch('/api/squadron-events');
      if (response.ok) {
        const data = await response.json();
        // Filter only upcoming/active events (exclude finalized or in_review)
        const upcomingEvents = (data.events || []).filter((event: any) => {
          // Excluir eventos finalizados o en revisión
          if (event.raceStatus === 'finalized' || event.raceStatus === 'in_review') {
            return false;
          }
          const eventDate = new Date(event.eventDate);
          const now = new Date();
          return eventDate >= now || event.status === 'published' || event.status === 'registration_open';
        });
        setSquadronEvents(upcomingEvents);
      }
    } catch (error) {
      console.error('Error fetching squadron events:', error);
    } finally {
      setEventsLoading(false);
    }
  };

  if (eventsLoading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin text-6xl mb-4">🏁</div>
        <p className="text-sky-blue/70">Cargando próximas carreras...</p>
      </div>
    );
  }

  if (squadronEvents.length === 0) {
    return (
      <div className="bg-gradient-to-br from-midnight via-cyan-500/10 to-midnight border-2 border-cyan-400/50 rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h3 className="text-2xl font-racing text-cyan-400 mb-2">
          NO HAY PRÓXIMAS CARRERAS
        </h3>
        <p className="text-sky-blue/70 mb-6">
          No hay campeonatos programados próximamente
        </p>
        <p className="text-sm text-sky-blue/50">
          Mantente atento para futuras competencias
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-3xl">🏁</span>
        <h2 className="text-2xl font-racing text-cyan-400">
          PRÓXIMAS CARRERAS
        </h2>
      </div>
      {squadronEvents.map((event) => (
        <SquadronEventCard key={event._id} event={event} />
      ))}
    </div>
  );
}

// Championships Past View
function ChampionshipsPastView({
  races,
  isLoading,
  onRefresh,
}: {
  races: Race[];
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const [squadronEvents, setSquadronEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  useEffect(() => {
    fetchSquadronEvents();
  }, []);

  const fetchSquadronEvents = async () => {
    try {
      const response = await fetch('/api/squadron-events');
      if (response.ok) {
        const data = await response.json();
        // Filter only finalized events (completed with results)
        const finalizedEvents = (data.events || []).filter((event: any) => {
          return event.raceStatus === 'finalized';
        });
        // Sort by finalized date descending (most recent first)
        finalizedEvents.sort((a: any, b: any) => {
          const dateA = new Date(a.finalizedAt || a.eventDate);
          const dateB = new Date(b.finalizedAt || b.eventDate);
          return dateB.getTime() - dateA.getTime();
        });
        setSquadronEvents(finalizedEvents);
      }
    } catch (error) {
      console.error('Error fetching squadron events:', error);
    } finally {
      setEventsLoading(false);
    }
  };

  if (eventsLoading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin text-6xl mb-4">🏁</div>
        <p className="text-sky-blue/70">Cargando carreras pasadas...</p>
      </div>
    );
  }

  if (squadronEvents.length === 0) {
    return (
      <div className="bg-gradient-to-br from-midnight via-slate-500/10 to-midnight border-2 border-slate-400/50 rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-2xl font-racing text-slate-300 mb-2">
          NO HAY CARRERAS PASADAS
        </h3>
        <p className="text-sky-blue/70 mb-6">
          Aún no se han completado campeonatos
        </p>
        <p className="text-sm text-sky-blue/50">
          El historial aparecerá aquí una vez finalizados los eventos
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-3xl">📚</span>
          <h2 className="text-2xl font-racing text-slate-300">
            CAMPEONATOS FINALIZADOS
          </h2>
        </div>
        {squadronEvents.map((event) => (
          <FinalizedEventCard
            key={event._id}
            event={event}
            onViewResults={setSelectedEvent}
          />
        ))}
      </div>

      {/* Modal de resultados completos */}
      {selectedEvent && (
        <EventResultsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </>
  );
}

// Finalized Event Card - Shows results and classification
function FinalizedEventCard({ event, onViewResults }: { event: any; onViewResults: (event: any) => void }) {
  const router = useRouter();
  const categoryConfig = EventCategoryConfig[event.category as any];

  return (
    <div
      onClick={() => onViewResults(event)}
      className="bg-gradient-to-br from-midnight via-slate-800/50 to-midnight border-2 border-green-500/30 rounded-xl p-6 cursor-pointer hover:scale-[1.02] transition-all hover:shadow-xl hover:shadow-green-500/20"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{categoryConfig?.icon || '🏆'}</span>
            <h3 className="text-2xl font-racing text-white">{event.name}</h3>
          </div>
          <p className="text-sm text-gray-400">{event.description}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="px-3 py-1 bg-green-600/20 text-green-400 border border-green-500/50 rounded-full text-xs font-racing">
            ✅ FINALIZADO
          </span>
          <span className="text-xs text-gray-400">
            {new Date(event.finalizedAt || event.eventDate).toLocaleDateString('es-CL')}
          </span>
        </div>
      </div>

      {/* Event Info */}
      <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
        <div className="bg-black/30 p-2 rounded">
          <p className="text-gray-400 text-xs">Categoría</p>
          <p className="text-white font-bold">{categoryConfig?.name}</p>
        </div>
        <div className="bg-black/30 p-2 rounded">
          <p className="text-gray-400 text-xs">Ubicación</p>
          <p className="text-white font-bold">{event.location}</p>
        </div>
        <div className="bg-black/30 p-2 rounded">
          <p className="text-gray-400 text-xs">Escuderías</p>
          <p className="text-white font-bold">{event.results?.length || 0}</p>
        </div>
      </div>

      {/* Results - Top 3 */}
      {event.results && event.results.length > 0 && (
        <div className="border-t border-slate-700 pt-4">
          <p className="text-xs text-gray-400 mb-3 font-racing">🏆 CLASIFICACIÓN FINAL</p>
          <div className="space-y-2">
            {event.results.slice(0, 3).map((result: any, index: number) => (
              <div
                key={result.squadronId?._id || index}
                className="flex items-center justify-between bg-black/20 p-3 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </span>
                  <div>
                    <p className="text-white font-bold">
                      {result.squadronId?.name || 'Escudería'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {result.pilots?.length || 0} pilotos
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-electric-blue font-bold text-lg">
                    +{result.pointsEarned} pts
                  </p>
                </div>
              </div>
            ))}
            {event.results.length > 3 && (
              <p className="text-xs text-gray-400 text-center mt-2">
                +{event.results.length - 3} escuderías más
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Friendly Selection View - Three Options
function FriendlySelectionView({
  onSelectUpcoming,
  onSelectPast,
  onSelectCreate,
  onBack,
  upcomingFriendlyCount = 0,
}: {
  onSelectUpcoming: () => void;
  onSelectPast: () => void;
  onSelectCreate: () => void;
  onBack: () => void;
  upcomingFriendlyCount?: number;
}) {
  return (
    <div>
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {/* Próximas Carreras Card */}
        <button
          onClick={onSelectUpcoming}
          className="group relative bg-gradient-to-br from-midnight via-electric-blue/20 to-midnight border-2 border-electric-blue rounded-2xl p-10 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-electric-blue/50"
        >
          {/* Badge de notificación */}
          {upcomingFriendlyCount > 0 && (
            <div className="absolute -top-3 -right-3 z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500 rounded-full blur-md animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-red-500 to-red-600 text-white font-racing text-lg font-bold rounded-full w-14 h-14 flex items-center justify-center border-4 border-midnight shadow-lg">
                  {upcomingFriendlyCount}
                </div>
              </div>
            </div>
          )}

          <div className="text-center">
            <div className="text-7xl mb-4 group-hover:scale-110 transition-transform">
              🏁
            </div>
            <h2 className="text-3xl font-racing text-electric-blue mb-3">
              PRÓXIMAS CARRERAS
            </h2>
            <p className="text-sky-blue/70 text-sm mb-4">
              Carreras amistosas disponibles
            </p>
            {upcomingFriendlyCount > 0 && (
              <p className="text-gold font-racing text-sm mb-2 animate-pulse">
                🔥 {upcomingFriendlyCount} {upcomingFriendlyCount === 1 ? 'carrera disponible' : 'carreras disponibles'}
              </p>
            )}
            <div className="inline-block px-4 py-2 bg-electric-blue/20 border border-electric-blue/50 text-electric-blue rounded-lg font-racing text-sm">
              VER PRÓXIMAS
            </div>
          </div>
        </button>

        {/* Carreras Pasadas Card */}
        <button
          onClick={onSelectPast}
          className="group relative bg-gradient-to-br from-midnight via-slate-500/20 to-midnight border-2 border-slate-400 rounded-2xl p-10 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-400/50"
        >
          <div className="text-center">
            <div className="text-7xl mb-4 group-hover:scale-110 transition-transform">
              📚
            </div>
            <h2 className="text-3xl font-racing text-slate-300 mb-3">
              CARRERAS PASADAS
            </h2>
            <p className="text-sky-blue/70 text-sm mb-4">
              Historial de carreras completadas
            </p>
            <div className="inline-block px-4 py-2 bg-slate-400/20 border border-slate-400/50 text-slate-300 rounded-lg font-racing text-sm">
              VER HISTORIAL
            </div>
          </div>
        </button>

        {/* Crear Carrera Card */}
        <button
          onClick={onSelectCreate}
          className="group relative bg-gradient-to-br from-midnight via-gold/20 to-midnight border-2 border-gold rounded-2xl p-10 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-gold/50"
        >
          <div className="text-center">
            <div className="text-7xl mb-4 group-hover:scale-110 transition-transform">
              ➕
            </div>
            <h2 className="text-3xl font-racing text-gold mb-3">
              CREAR CARRERA
            </h2>
            <p className="text-sky-blue/70 text-sm mb-4">
              Organiza tu propia carrera
            </p>
            <div className="inline-block px-4 py-2 bg-gold/20 border border-gold/50 text-gold rounded-lg font-racing text-sm">
              CREAR NUEVA
            </div>
          </div>
        </button>
      </div>

      {/* Back Button */}
      <div className="text-center">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-sky-blue/30 text-sky-blue/70 rounded-lg hover:bg-sky-blue/10 transition-all"
        >
          ← VOLVER
        </button>
      </div>
    </div>
  );
}

// Friendly Upcoming View
function FriendlyUpcomingView({
  races,
  isLoading,
  onRefresh,
  onLoginClick,
}: {
  races: Race[];
  isLoading: boolean;
  onRefresh: () => void;
  onLoginClick: () => void;
}) {
  const { token, user } = useAuth();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [raceToLeave, setRaceToLeave] = useState<{ id: string; name: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [raceToDelete, setRaceToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showConfirmRaceModal, setShowConfirmRaceModal] = useState(false);
  const [raceToConfirm, setRaceToConfirm] = useState<{ id: string; name: string } | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [raceToInvite, setRaceToInvite] = useState<Race | null>(null);
  const [showSuccessConfirmModal, setShowSuccessConfirmModal] = useState(false);
  const [showErrorConfirmModal, setShowErrorConfirmModal] = useState(false);
  const [confirmErrorMessage, setConfirmErrorMessage] = useState('');

  const handleJoinClick = (race: Race) => {
    // Check if user is authenticated
    if (!token || !user) {
      onLoginClick();
      return;
    }

    setSelectedRace(race);
    setShowJoinModal(true);
  };

  const handleLeaveRace = (raceId: string, raceName: string) => {
    setRaceToLeave({ id: raceId, name: raceName });
    setShowLeaveConfirm(true);
  };

  const confirmLeaveRace = async () => {
    if (!raceToLeave) return;

    try {
      const response = await fetch(`/api/races/friendly/${raceToLeave.id}/leave`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setShowLeaveConfirm(false);
        setRaceToLeave(null);
        onRefresh();
      } else {
        alert(data.error || 'Error al desinscribirte de la carrera');
      }
    } catch (error) {
      console.error('Error leaving race:', error);
      alert('Error al desinscribirte de la carrera');
    }
  };

  const handleDeleteClick = (raceId: string, raceName: string) => {
    setRaceToDelete({ id: raceId, name: raceName });
    setShowDeleteConfirm(true);
  };

  const confirmDeleteRace = async () => {
    if (!raceToDelete) return;

    try {
      const response = await fetch(`/api/races/friendly/${raceToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setShowDeleteConfirm(false);
        setRaceToDelete(null);
        onRefresh();
      } else {
        alert(data.error || 'Error al eliminar la carrera');
      }
    } catch (error) {
      console.error('Error deleting race:', error);
      alert('Error al eliminar la carrera');
    }
  };

  const handleConfirmClick = (raceId: string, raceName: string) => {
    setRaceToConfirm({ id: raceId, name: raceName });
    setShowConfirmRaceModal(true);
  };

  const confirmRace = async () => {
    if (!raceToConfirm) return;

    try {
      const response = await fetch(`/api/races/friendly/${raceToConfirm.id}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setShowConfirmRaceModal(false);
        setRaceToConfirm(null);
        setShowSuccessConfirmModal(true);
        setTimeout(() => {
          setShowSuccessConfirmModal(false);
          onRefresh();
        }, 2500);
      } else {
        setShowConfirmRaceModal(false);
        setConfirmErrorMessage(data.error || 'Error al confirmar la carrera');
        setShowErrorConfirmModal(true);
      }
    } catch (error) {
      console.error('Error confirming race:', error);
      setShowConfirmRaceModal(false);
      setConfirmErrorMessage('Error al confirmar la carrera');
      setShowErrorConfirmModal(true);
    }
  };

  const handleInviteFriendsClick = (race: Race) => {
    setRaceToInvite(race);
    setShowInviteModal(true);
  };

  // Filter upcoming races: future dates only, and NOT linked/finalized
  // NOTE: We DO show races where user is registered (they appear in both "Próximas" and "Mis Carreras")
  const upcomingRaces = races.filter(race => {
    const raceDate = new Date(race.date);
    const raceDateOnly = new Date(raceDate.getFullYear(), raceDate.getMonth(), raceDate.getDate());
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isFuture = raceDateOnly >= today; // Compare only dates, not times
    const isNotLinked = !race.linkedRaceSessionId && race.raceStatus !== 'linked' && race.raceStatus !== 'finalized';
    return isFuture && isNotLinked;
  });

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin text-6xl mb-4">🏁</div>
        <p className="text-sky-blue/70">Cargando próximas carreras...</p>
      </div>
    );
  }

  if (upcomingRaces.length === 0) {
    return (
      <div className="bg-gradient-to-br from-midnight via-electric-blue/10 to-midnight border-2 border-electric-blue/50 rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">🏁</div>
        <h3 className="text-2xl font-racing text-electric-blue mb-2">
          NO HAY PRÓXIMAS CARRERAS
        </h3>
        <p className="text-sky-blue/70 mb-6">
          No hay carreras amistosas programadas próximamente
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-3xl">🏁</span>
          <h2 className="text-2xl font-racing text-electric-blue">
            PRÓXIMAS CARRERAS AMISTOSAS
          </h2>
        </div>
        {upcomingRaces.map((race) => (
          <RaceCard
            key={race._id}
            race={race}
            currentUserId={user?.id}
            isAuthenticated={!!token}
            onJoinClick={() => handleJoinClick(race)}
            onLeaveClick={() => handleLeaveRace(race._id, race.name)}
            onDeleteClick={() => handleDeleteClick(race._id, race.name)}
            onConfirmClick={() => handleConfirmClick(race._id, race.name)}
            onInviteFriendsClick={() => handleInviteFriendsClick(race)}
          />
        ))}
      </div>

      {/* Join Modal */}
      {showJoinModal && selectedRace && (
        <JoinRaceModal
          race={selectedRace}
          token={token}
          onClose={() => {
            setShowJoinModal(false);
            setSelectedRace(null);
          }}
          onSuccess={() => {
            setShowJoinModal(false);
            setSelectedRace(null);
            onRefresh();
          }}
        />
      )}

      {/* Leave Confirmation Modal */}
      {showLeaveConfirm && raceToLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-midnight via-red-500/10 to-midnight border-2 border-red-500/50 rounded-xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🚪</div>
              <h3 className="text-2xl font-racing text-red-400 mb-3">
                DESINSCRIBIRSE DE CARRERA
              </h3>
              <p className="text-sky-blue/80 text-lg mb-2">
                ¿Estás seguro de que quieres desinscribirte de:
              </p>
              <p className="text-electric-blue font-bold text-xl">
                "{raceToLeave.name}"?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLeaveConfirm(false);
                  setRaceToLeave(null);
                }}
                className="flex-1 px-6 py-3 bg-slate-600/20 border border-slate-500/50 text-slate-300 rounded-lg hover:bg-slate-600/30 transition-all font-racing"
              >
                CANCELAR
              </button>
              <button
                onClick={confirmLeaveRace}
                className="flex-1 px-6 py-3 bg-red-600/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-600/30 transition-all font-racing"
              >
                SÍ, DESINSCRIBIRME
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && raceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-midnight via-red-900/20 to-midnight border-2 border-red-500/50 rounded-xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-racing text-red-400 mb-3">
                ELIMINAR CARRERA
              </h3>
              <p className="text-sky-blue/80 text-lg mb-2">
                ¿Estás seguro de que quieres eliminar esta carrera?
              </p>
              <p className="text-electric-blue font-bold text-xl mb-2">
                "{raceToDelete.name}"
              </p>
              <p className="text-red-400/70 text-sm">
                Esta acción no se puede deshacer
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setRaceToDelete(null);
                }}
                className="flex-1 px-6 py-3 bg-slate-600/20 border border-slate-500/50 text-slate-300 rounded-lg hover:bg-slate-600/30 transition-all font-racing"
              >
                CANCELAR
              </button>
              <button
                onClick={confirmDeleteRace}
                className="flex-1 px-6 py-3 bg-red-600/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-600/30 transition-all font-racing"
              >
                SÍ, ELIMINAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Race Modal */}
      {showConfirmRaceModal && raceToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-midnight via-green-500/10 to-midnight border-2 border-green-500/50 rounded-xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-racing text-green-400 mb-3">
                CONFIRMAR EVENTO
              </h3>
              <p className="text-sky-blue/80 text-lg mb-2">
                ¿Ya confirmaste la reserva con Speedpark?
              </p>
              <p className="text-electric-blue font-bold text-xl mb-2">
                "{raceToConfirm.name}"
              </p>
              <p className="text-yellow-400/70 text-sm">
                Los participantes verán que el evento está confirmado, pero podrán seguir uniéndose si hay cupos disponibles
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmRaceModal(false);
                  setRaceToConfirm(null);
                }}
                className="flex-1 px-6 py-3 bg-slate-600/20 border border-slate-500/50 text-slate-300 rounded-lg hover:bg-slate-600/30 transition-all font-racing"
              >
                CANCELAR
              </button>
              <button
                onClick={confirmRace}
                className="flex-1 px-6 py-3 bg-green-600/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-600/30 transition-all font-racing"
              >
                SÍ, CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Confirm Modal */}
      {showSuccessConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-gradient-to-br from-midnight via-green-500/20 to-midnight border-2 border-green-500/50 rounded-xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-racing text-green-400 mb-3">
                ¡EVENTO CONFIRMADO!
              </h3>
              <p className="text-sky-blue/80 text-lg mb-2">
                La reserva está confirmada con Speedpark
              </p>
              <p className="text-electric-blue/70 text-sm">
                Los participantes pueden ver que el evento está listo
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Confirm Modal */}
      {showErrorConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-gradient-to-br from-midnight via-red-500/20 to-midnight border-2 border-red-500/50 rounded-xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-racing text-red-400 mb-3">
                ERROR
              </h3>
              <p className="text-sky-blue/80 text-lg">
                {confirmErrorMessage}
              </p>
            </div>
            <button
              onClick={() => setShowErrorConfirmModal(false)}
              className="w-full px-6 py-3 bg-red-600/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-600/30 transition-all font-racing"
            >
              CERRAR
            </button>
          </div>
        </div>
      )}

      {/* Invite Friends Modal */}
      {showInviteModal && raceToInvite && token && (
        <InviteFriendsModal
          race={raceToInvite}
          token={token}
          onClose={() => {
            setShowInviteModal(false);
            setRaceToInvite(null);
          }}
          onSuccess={() => {
            setShowInviteModal(false);
            setRaceToInvite(null);
          }}
        />
      )}
    </>
  );
}

// Friendly Past View
function FriendlyPastView({
  races,
  isLoading,
  onRefresh,
  onLoginClick,
}: {
  races: Race[];
  isLoading: boolean;
  onRefresh: () => void;
  onLoginClick: () => void;
}) {
  const { token } = useAuth();
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);

  // Check if user is not authenticated
  if (!token && !isLoading) {
    return (
      <div className="bg-gradient-to-br from-midnight via-red-500/10 to-midnight border-2 border-red-400/50 rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h3 className="text-2xl font-racing text-red-300 mb-2">
          AUTENTICACIÓN REQUERIDA
        </h3>
        <p className="text-sky-blue/70 mb-6">
          Debes iniciar sesión para ver las carreras pasadas
        </p>
        <button
          onClick={onLoginClick}
          className="inline-block bg-red-500 hover:bg-red-600 text-white font-racing px-8 py-3 rounded-lg transition-colors cursor-pointer"
        >
          INICIAR SESIÓN
        </button>
      </div>
    );
  }

  // Filter past races that are linked to sessions
  const pastRaces = races.filter(race => {
    const raceDate = new Date(race.date);
    const now = new Date();
    const isPast = raceDate < now;
    const isLinked = race.linkedRaceSessionId && race.raceStatus === 'linked';
    return isPast && isLinked;
  });

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin text-6xl mb-4">🏁</div>
        <p className="text-sky-blue/70">Cargando carreras pasadas...</p>
      </div>
    );
  }

  if (pastRaces.length === 0) {
    return (
      <div className="bg-gradient-to-br from-midnight via-slate-500/10 to-midnight border-2 border-slate-400/50 rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-2xl font-racing text-slate-300 mb-2">
          NO HAY CARRERAS VINCULADAS
        </h3>
        <p className="text-sky-blue/70 mb-6">
          Las carreras amistosas pasadas aparecerán aquí una vez que el organizador las vincule con los resultados
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-3xl">📚</span>
          <h2 className="text-2xl font-racing text-slate-300">
            CARRERAS AMISTOSAS PASADAS
          </h2>
        </div>
        {pastRaces.map((race) => (
          <RaceCard
            key={race._id}
            race={race}
            currentUserId={undefined}
            onViewResults={() => setSelectedRace(race)}
          />
        ))}
      </div>

      {/* Race Results Modal */}
      {selectedRace && selectedRace.linkedRaceSessionId && (
        <RaceResultsModal
          sessionId={selectedRace.linkedRaceSessionId}
          friendlyRaceParticipants={selectedRace.participantsList || []}
          onClose={() => setSelectedRace(null)}
        />
      )}
    </>
  );
}

// Friendly Join View (DEPRECATED - keeping for backwards compatibility)
function FriendlyJoinView({
  races,
  isLoading,
  onRefresh,
}: {
  races: Race[];
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const { token, user } = useAuth();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [raceToDelete, setRaceToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showConfirmRaceModal, setShowConfirmRaceModal] = useState(false);
  const [raceToConfirm, setRaceToConfirm] = useState<{ id: string; name: string } | null>(null);
  const [showSuccessConfirmModal, setShowSuccessConfirmModal] = useState(false);
  const [showErrorConfirmModal, setShowErrorConfirmModal] = useState(false);
  const [confirmErrorMessage, setConfirmErrorMessage] = useState('');

  const handleJoinClick = (race: Race) => {
    // Check if user is authenticated
    if (!token || !user) {
      alert('Debes iniciar sesión para unirte a una carrera');
      return;
    }

    setSelectedRace(race);
    setShowJoinModal(true);
  };

  const handleDeleteClick = (raceId: string, raceName: string) => {
    setRaceToDelete({ id: raceId, name: raceName });
    setShowDeleteConfirm(true);
  };

  const confirmDeleteRace = async () => {
    if (!raceToDelete) return;

    try {
      const response = await fetch(`/api/races/friendly/${raceToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setShowDeleteConfirm(false);
        setRaceToDelete(null);
        onRefresh();
      } else {
        alert(data.error || 'Error al eliminar la carrera');
      }
    } catch (error) {
      console.error('Error deleting race:', error);
      alert('Error al eliminar la carrera');
    }
  };

  const handleConfirmClick = (raceId: string, raceName: string) => {
    setRaceToConfirm({ id: raceId, name: raceName });
    setShowConfirmRaceModal(true);
  };

  const confirmRace = async () => {
    if (!raceToConfirm) return;

    try {
      const response = await fetch(`/api/races/friendly/${raceToConfirm.id}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setShowConfirmRaceModal(false);
        setRaceToConfirm(null);
        setShowSuccessConfirmModal(true);
        setTimeout(() => {
          setShowSuccessConfirmModal(false);
          onRefresh();
        }, 2500);
      } else {
        setShowConfirmRaceModal(false);
        setConfirmErrorMessage(data.error || 'Error al confirmar la carrera');
        setShowErrorConfirmModal(true);
      }
    } catch (error) {
      console.error('Error confirming race:', error);
      setShowConfirmRaceModal(false);
      setConfirmErrorMessage('Error al confirmar la carrera');
      setShowErrorConfirmModal(true);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin text-6xl mb-4">🏁</div>
        <p className="text-sky-blue/70">Cargando carreras amistosas...</p>
      </div>
    );
  }

  if (races.length === 0) {
    return (
      <div className="bg-gradient-to-br from-midnight via-electric-blue/10 to-midnight border-2 border-electric-blue/50 rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">🤝</div>
        <h3 className="text-2xl font-racing text-electric-blue mb-2">
          NO HAY CARRERAS AMISTOSAS DISPONIBLES
        </h3>
        <p className="text-sky-blue/70 mb-6">
          Sé el primero en crear una carrera amistosa
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {races.map((race) => (
          <RaceCard
            key={race._id}
            race={race}
            currentUserId={user?.id}
            onJoinClick={() => handleJoinClick(race)}
            onDeleteClick={() => handleDeleteClick(race._id, race.name)}
            onConfirmClick={() => handleConfirmClick(race._id, race.name)}
          />
        ))}
      </div>

      {/* Join Modal */}
      {showJoinModal && selectedRace && (
        <JoinRaceModal
          race={selectedRace}
          token={token}
          onClose={() => {
            setShowJoinModal(false);
            setSelectedRace(null);
          }}
          onSuccess={() => {
            setShowJoinModal(false);
            setSelectedRace(null);
            onRefresh();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && raceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-midnight via-red-900/20 to-midnight border-2 border-red-500/50 rounded-xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-racing text-red-400 mb-3">
                ELIMINAR CARRERA
              </h3>
              <p className="text-sky-blue/80 text-lg mb-2">
                ¿Estás seguro de que quieres eliminar esta carrera?
              </p>
              <p className="text-electric-blue font-bold text-xl mb-2">
                "{raceToDelete.name}"
              </p>
              <p className="text-red-400/70 text-sm">
                Esta acción no se puede deshacer
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setRaceToDelete(null);
                }}
                className="flex-1 px-6 py-3 bg-slate-600/20 border border-slate-500/50 text-slate-300 rounded-lg hover:bg-slate-600/30 transition-all font-racing"
              >
                CANCELAR
              </button>
              <button
                onClick={confirmDeleteRace}
                className="flex-1 px-6 py-3 bg-red-600/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-600/30 transition-all font-racing"
              >
                SÍ, ELIMINAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Race Modal */}
      {showConfirmRaceModal && raceToConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-midnight via-green-500/10 to-midnight border-2 border-green-500/50 rounded-xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-racing text-green-400 mb-3">
                CONFIRMAR EVENTO
              </h3>
              <p className="text-sky-blue/80 text-lg mb-2">
                ¿Ya confirmaste la reserva con Speedpark?
              </p>
              <p className="text-electric-blue font-bold text-xl mb-2">
                "{raceToConfirm.name}"
              </p>
              <p className="text-yellow-400/70 text-sm">
                Los participantes verán que el evento está confirmado, pero podrán seguir uniéndose si hay cupos disponibles
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmRaceModal(false);
                  setRaceToConfirm(null);
                }}
                className="flex-1 px-6 py-3 bg-slate-600/20 border border-slate-500/50 text-slate-300 rounded-lg hover:bg-slate-600/30 transition-all font-racing"
              >
                CANCELAR
              </button>
              <button
                onClick={confirmRace}
                className="flex-1 px-6 py-3 bg-green-600/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-600/30 transition-all font-racing"
              >
                SÍ, CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Confirm Modal */}
      {showSuccessConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-gradient-to-br from-midnight via-green-500/20 to-midnight border-2 border-green-500/50 rounded-xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-racing text-green-400 mb-3">
                ¡EVENTO CONFIRMADO!
              </h3>
              <p className="text-sky-blue/80 text-lg mb-2">
                La reserva está confirmada con Speedpark
              </p>
              <p className="text-electric-blue/70 text-sm">
                Los participantes pueden ver que el evento está listo
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Confirm Modal */}
      {showErrorConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-gradient-to-br from-midnight via-red-500/20 to-midnight border-2 border-red-500/50 rounded-xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-racing text-red-400 mb-3">
                ERROR
              </h3>
              <p className="text-sky-blue/80 text-lg">
                {confirmErrorMessage}
              </p>
            </div>
            <button
              onClick={() => setShowErrorConfirmModal(false)}
              className="w-full px-6 py-3 bg-red-600/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-600/30 transition-all font-racing"
            >
              CERRAR
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Friendly Create View
function FriendlyCreateView({
  token,
  onBack,
  onSuccess,
  onLoginClick,
  friendlyRaces,
}: {
  token: string | null;
  onBack: () => void;
  onSuccess: () => void;
  onLoginClick: () => void;
  friendlyRaces: Race[];
}) {
  // Check if user is not authenticated
  if (!token) {
    return (
      <div className="bg-gradient-to-br from-midnight via-red-500/10 to-midnight border-2 border-red-400/50 rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h3 className="text-2xl font-racing text-red-300 mb-2">
          AUTENTICACIÓN REQUERIDA
        </h3>
        <p className="text-sky-blue/70 mb-6">
          Debes iniciar sesión para crear una carrera amistosa
        </p>
        <button
          onClick={onLoginClick}
          className="inline-block bg-red-500 hover:bg-red-600 text-white font-racing px-8 py-3 rounded-lg transition-colors cursor-pointer"
        >
          INICIAR SESIÓN
        </button>
      </div>
    );
  }

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [raceName, setRaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [customDateStr, setCustomDateStr] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdRaceName, setCreatedRaceName] = useState('');

  // Generar próximos 14 días
  const getNext14Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // Generar últimos 30 días (para carreras pasadas)
  const getLast30Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      days.push(date);
    }
    return days;
  };

  // Generar bloques horarios de 12:00 a 22:00 (10 PM)
  const allTimeSlots = [
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00'
  ];

  // Filtrar horarios ocupados para la fecha seleccionada
  const getAvailableTimeSlots = () => {
    if (!selectedDate) return allTimeSlots;

    // Buscar carreras que coincidan con la fecha seleccionada
    const occupiedTimes = friendlyRaces
      .filter(race => {
        const raceDate = new Date(race.date);
        return raceDate.toDateString() === selectedDate.toDateString();
      })
      .map(race => race.time);

    // Retornar solo horarios disponibles
    return allTimeSlots.filter(time => !occupiedTimes.includes(time));
  };

  const timeSlots = getAvailableTimeSlots();

  const handleCreateRace = async () => {
    if (!raceName.trim() || !selectedDate || !selectedTime) {
      alert('Por favor completa todos los campos');
      return;
    }

    if (!token) {
      alert('No estás autenticado. Por favor inicia sesión.');
      return;
    }

    console.log('Creating race with token:', token ? 'Token exists' : 'No token');

    setIsCreating(true);
    try {
      const response = await fetch('/api/races/create-friendly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: raceName,
          date: selectedDate,
          time: selectedTime,
          // kartNumber will be assigned automatically by backend
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCreatedRaceName(raceName);
        setShowSuccessModal(true);
        // Auto-close and redirect after 2.5 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
          onSuccess();
        }, 2500);
      } else {
        alert(data.error || 'Error al crear la carrera');
      }
    } catch (error) {
      console.error('Error creating race:', error);
      alert('Error al crear la carrera');
    } finally {
      setIsCreating(false);
    }
  };

  const days14 = getNext14Days();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-midnight via-gold/20 to-midnight border-2 border-gold/50 rounded-xl p-8">
        <h3 className="text-3xl font-racing text-gold mb-6 text-center">
          ✨ CREAR CARRERA AMISTOSA
        </h3>

        {/* Formulario */}
        <>
        {/* Race Name */}
        <div className="mb-8">
          <label className="block text-electric-blue font-racing text-lg mb-2">
            NOMBRE DE LA CARRERA
          </label>
          <input
            type="text"
            value={raceName}
            onChange={(e) => setRaceName(e.target.value)}
            placeholder="Ej: Carrera del Viernes"
            maxLength={50}
            className="w-full px-4 py-3 bg-midnight/50 border-2 border-electric-blue/50 rounded-lg text-sky-blue focus:border-electric-blue focus:outline-none font-digital"
          />
        </div>

        {/* Date Selection Mode Toggle */}
        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => {
                setUseCustomDate(false);
                setSelectedDate(null);
                setCustomDateStr('');
              }}
              className={`flex-1 px-4 py-2 rounded-lg border-2 font-racing transition-all ${
                !useCustomDate
                  ? 'bg-electric-blue/30 border-electric-blue text-electric-blue'
                  : 'bg-midnight/50 border-electric-blue/30 text-sky-blue/70 hover:border-electric-blue/60'
              }`}
            >
              📅 PRÓXIMAS FECHAS
            </button>
            <button
              onClick={() => {
                setUseCustomDate(true);
                setSelectedDate(null);
              }}
              className={`flex-1 px-4 py-2 rounded-lg border-2 font-racing transition-all ${
                useCustomDate
                  ? 'bg-yellow-500/30 border-yellow-400 text-yellow-400'
                  : 'bg-midnight/50 border-yellow-400/30 text-sky-blue/70 hover:border-yellow-400/60'
              }`}
            >
              ⏮️ FECHA PASADA
            </button>
          </div>
        </div>

        {/* Date Selection */}
        <div className="mb-8">
          <label className="block text-electric-blue font-racing text-lg mb-3">
            📅 SELECCIONA LA FECHA
          </label>

          {!useCustomDate ? (
            <div className="grid grid-cols-7 gap-2">
              {days14.map((date, index) => {
                const isSelected = selectedDate?.toDateString() === date.toDateString();
                const dayName = date.toLocaleDateString('es-CL', { weekday: 'short' }).toUpperCase();
                const dayNumber = date.getDate();
                const monthName = date.toLocaleDateString('es-CL', { month: 'short' }).toUpperCase();

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                      isSelected
                        ? 'bg-electric-blue/30 border-electric-blue shadow-lg shadow-electric-blue/50'
                        : 'bg-midnight/50 border-electric-blue/30 hover:border-electric-blue/60'
                    }`}
                  >
                    <div className="text-center">
                      <p className={`text-xs font-racing ${isSelected ? 'text-electric-blue' : 'text-sky-blue/50'}`}>
                        {dayName}
                      </p>
                      <p className={`text-2xl font-bold font-digital ${isSelected ? 'text-electric-blue' : 'text-sky-blue'}`}>
                        {dayNumber}
                      </p>
                      <p className={`text-xs ${isSelected ? 'text-electric-blue/70' : 'text-sky-blue/50'}`}>
                        {monthName}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <p className="text-yellow-400/70 text-sm mb-4">
                💡 Selecciona la fecha en la que corriste para poder vincularla después
              </p>

              {/* Buscador de Calendario */}
              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
                <label className="block text-yellow-400 font-racing text-sm mb-2">
                  🗓️ BUSCAR FECHA ESPECÍFICA
                </label>
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={customDateStr}
                  onChange={(e) => {
                    setCustomDateStr(e.target.value);
                    if (e.target.value) {
                      const [year, month, day] = e.target.value.split('-').map(Number);
                      const newDate = new Date(year, month - 1, day);
                      setSelectedDate(newDate);
                    }
                  }}
                  className="w-full px-4 py-3 bg-midnight/80 border-2 border-yellow-400/50 rounded-lg text-yellow-400 focus:border-yellow-400 focus:outline-none font-digital text-lg"
                />
                {selectedDate && customDateStr && (
                  <p className="mt-2 text-yellow-400/70 text-sm">
                    ✅ Fecha seleccionada: {selectedDate.toLocaleDateString('es-CL', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
              </div>

              {/* Últimos 30 días (alternativa rápida) */}
              <div>
                <p className="text-sky-blue/50 text-xs mb-2 font-racing">
                  O ELIGE DE LOS ÚLTIMOS 30 DÍAS:
                </p>
                <div className="grid grid-cols-7 gap-2">
                  {getLast30Days().map((date, index) => {
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    const dayName = date.toLocaleDateString('es-CL', { weekday: 'short' }).toUpperCase();
                    const dayNumber = date.getDate();
                    const monthName = date.toLocaleDateString('es-CL', { month: 'short' }).toUpperCase();

                    return (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedDate(date);
                          setCustomDateStr(date.toISOString().split('T')[0]);
                        }}
                        className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                          isSelected
                            ? 'bg-yellow-500/30 border-yellow-400 shadow-lg shadow-yellow-400/50'
                            : 'bg-midnight/50 border-yellow-400/30 hover:border-yellow-400/60'
                        }`}
                      >
                        <div className="text-center">
                          <p className={`text-xs font-racing ${isSelected ? 'text-yellow-400' : 'text-sky-blue/50'}`}>
                            {dayName}
                          </p>
                          <p className={`text-2xl font-bold font-digital ${isSelected ? 'text-yellow-400' : 'text-sky-blue'}`}>
                            {dayNumber}
                          </p>
                          <p className={`text-xs ${isSelected ? 'text-yellow-400/70' : 'text-sky-blue/50'}`}>
                            {monthName}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Time Selection */}
        {selectedDate && (
          <div className="mb-8">
            <label className="block text-electric-blue font-racing text-lg mb-3">
              🕐 SELECCIONA LA HORA
            </label>
            {timeSlots.length === 0 ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
                <p className="text-red-400 font-racing mb-2">
                  ⚠️ No hay horarios disponibles
                </p>
                <p className="text-red-300/70 text-sm">
                  Todos los bloques horarios están ocupados para esta fecha. Por favor selecciona otra fecha.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                {timeSlots.map((time) => {
                  const isSelected = selectedTime === time;
                  return (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                        isSelected
                          ? 'bg-gold/30 border-gold shadow-lg shadow-gold/50'
                          : 'bg-midnight/50 border-gold/30 hover:border-gold/60'
                      }`}
                    >
                      <p className={`text-xl font-digital ${isSelected ? 'text-gold' : 'text-sky-blue'}`}>
                        {time}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Summary - Solo en paso 1 */}
        {selectedDate && selectedTime && raceName && (
          <div className="mb-8 p-4 bg-electric-blue/10 border border-electric-blue/30 rounded-lg">
            <h4 className="text-electric-blue font-racing mb-2">RESUMEN</h4>
            <div className="text-sky-blue/90 space-y-1">
              <p><span className="text-sky-blue/50">Nombre:</span> {raceName}</p>
              <p>
                <span className="text-sky-blue/50">Fecha:</span>{' '}
                {selectedDate.toLocaleDateString('es-CL', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
              <p><span className="text-sky-blue/50">Hora:</span> {selectedTime}</p>
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="flex-1 px-6 py-3 border-2 border-sky-blue/50 text-sky-blue rounded-lg hover:bg-sky-blue/10 transition-all"
          >
            CANCELAR
          </button>
          <button
            onClick={handleCreateRace}
            disabled={!raceName || !selectedDate || !selectedTime || isCreating}
            style={{
              backgroundColor: raceName && selectedDate && selectedTime && !isCreating ? '#FFD700' : '#333',
              color: raceName && selectedDate && selectedTime && !isCreating ? '#0a0a15' : '#666',
              cursor: !raceName || !selectedDate || !selectedTime || isCreating ? 'not-allowed' : 'pointer',
            }}
            className="flex-1 px-6 py-3 font-racing rounded-lg transition-all shadow-lg"
          >
            {isCreating ? '⏳ CREANDO...' : '🏁 CREAR CARRERA'}
          </button>
        </div>
          </>

        <p className="text-sky-blue/60 text-sm text-center mt-4">
          Se te asignará un kart automáticamente al crear la carrera
        </p>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-gradient-to-br from-midnight via-green-500/20 to-midnight border-2 border-green-500/50 rounded-xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">🏁</div>
              <h3 className="text-2xl font-racing text-green-400 mb-3">
                ¡CARRERA CREADA EXITOSAMENTE!
              </h3>
              <p className="text-electric-blue font-bold text-xl mb-2">
                {createdRaceName}
              </p>
              <p className="text-sky-blue/70 text-lg">
                Te has unido automáticamente
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Join Race Modal Component
function JoinRaceModal({
  race,
  token,
  onClose,
  onSuccess,
}: {
  race: Race;
  token: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [isJoining, setIsJoining] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const hasAttemptedJoin = useRef(false);

  // Auto-join on mount with random kart assignment (backend handles it)
  useEffect(() => {
    if (!hasAttemptedJoin.current) {
      hasAttemptedJoin.current = true;
      handleJoin();
    }
  }, []);

  const handleJoin = async () => {
    if (!token) {
      alert('No estás autenticado');
      onClose();
      return;
    }

    if (isJoining) {
      console.log('⚠️ Join already in progress, skipping');
      return;
    }

    setIsJoining(true);
    try {
      console.log('🏁 Intentando unirse a carrera:', race._id, '(kart asignado automáticamente)');
      const response = await fetch(`/api/races/friendly/${race._id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({}), // No kartNumber - backend assigns automatically
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error('❌ Join response error (raw):', text);
        alert(`Error al unirse: ${response.status} - ${text.substring(0, 100)}`);
        setIsJoining(false);
        onClose();
        return;
      }

      const data = await response.json();
      console.log('📦 Response data:', data);

      if (data.success) {
        setShowSuccessModal(true);
        // Auto-close success modal and refresh after 2 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
          onSuccess();
        }, 2000);
      } else {
        alert(data.error || 'Error al unirse a la carrera');
        onClose();
      }
    } catch (error) {
      console.error('❌ Error joining race:', error);
      alert('Error al unirse a la carrera: ' + (error instanceof Error ? error.message : String(error)));
      onClose();
    } finally {
      setIsJoining(false);
    }
  };

  // Success Modal
  if (showSuccessModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-md bg-gradient-to-br from-midnight via-green-500/20 to-midnight border-2 border-green-500/50 rounded-xl p-8 shadow-2xl">
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-racing text-green-400 mb-3">
              ¡TE HAS UNIDO A LA CARRERA EXITOSAMENTE!
            </h3>
            <p className="text-sky-blue/70 text-lg">
              {race.name}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading Modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-gradient-to-br from-midnight via-electric-blue/20 to-midnight border-2 border-electric-blue/50 rounded-xl p-8">
        <h3 className="text-3xl font-racing text-electric-blue mb-2 text-center">
          🏎️ UNIÉNDOSE A LA CARRERA
        </h3>
        <p className="text-sky-blue/70 text-center mb-6">
          {race.name}
        </p>

        <div className="text-center py-12">
          <div className="animate-spin text-6xl mb-4">🏁</div>
          <p className="text-sky-blue text-lg font-racing">Asignando kart automáticamente...</p>
        </div>
      </div>
    </div>
  );
}

// Invite Friends Modal Component
function InviteFriendsModal({
  race,
  token,
  onClose,
  onSuccess,
}: {
  race: Race;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch friends list
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const response = await fetch('/api/friends', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Error al cargar amigos');
        }

        const data = await response.json();
        setFriends(data.friends || []);
      } catch (error) {
        console.error('Error fetching friends:', error);
        alert('Error al cargar la lista de amigos');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFriends();
  }, [token]);

  // Toggle friend selection
  const toggleFriend = (friendId: string) => {
    const newSelected = new Set(selectedFriendIds);
    if (newSelected.has(friendId)) {
      newSelected.delete(friendId);
    } else {
      newSelected.add(friendId);
    }
    setSelectedFriendIds(newSelected);
  };

  // Send invitations
  const handleSendInvitations = async () => {
    if (selectedFriendIds.size === 0) {
      setErrorMessage('Selecciona al menos un amigo');
      setShowErrorModal(true);
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`/api/races/friendly/${race._id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          friendIds: Array.from(selectedFriendIds),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar invitaciones');
      }

      if (data.success) {
        setSentCount(data.sentCount || 0);
        setShowSuccessModal(true);
        // Auto-close after 2.5 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
          onSuccess();
        }, 2500);
      }
    } catch (error) {
      console.error('Error sending invitations:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error al enviar invitaciones');
      setShowErrorModal(true);
    } finally {
      setIsSending(false);
    }
  };

  // Check if friend is already in race
  const isFriendInRace = (friendId: string) => {
    const participants = race.participantsList || race.participants || [];
    return participants.some((p: any) => (p.userId?.toString() || p.userId) === friendId);
  };

  // Available spots
  const participants = race.participantsList || race.participants || [];
  const availableSpots = race.maxParticipants - participants.length;

  // Success Modal
  if (showSuccessModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-md bg-gradient-to-br from-midnight via-green-500/20 to-midnight border-2 border-green-500/50 rounded-xl p-8 shadow-2xl">
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-racing text-green-400 mb-3">
              ¡INVITACIONES ENVIADAS!
            </h3>
            <p className="text-electric-blue font-bold text-xl mb-2">
              {sentCount} invitación{sentCount !== 1 ? 'es' : ''} enviada{sentCount !== 1 ? 's' : ''}
            </p>
            <p className="text-sky-blue/70 text-lg">
              Tus amigos recibirán la notificación
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error Modal
  if (showErrorModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-md bg-gradient-to-br from-midnight via-red-500/20 to-midnight border-2 border-red-500/50 rounded-xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-2xl font-racing text-red-400 mb-3">
              ERROR
            </h3>
            <p className="text-sky-blue/70 text-lg">
              {errorMessage}
            </p>
          </div>
          <button
            onClick={() => setShowErrorModal(false)}
            className="w-full px-6 py-3 bg-red-600/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-600/30 transition-all font-racing"
          >
            CERRAR
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-midnight via-cyan-500/10 to-midnight border-2 border-cyan-500/50 rounded-xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-2xl font-racing text-cyan-400 mb-3">
            INVITAR AMIGOS
          </h3>
          <p className="text-electric-blue font-bold text-xl mb-2">
            {race.name}
          </p>
          <p className="text-sky-blue/70 text-sm">
            📅 {new Date(race.date).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • 🕐 {race.time}
          </p>
          <div className="mt-3 inline-block px-4 py-2 bg-cyan-600/20 border border-cyan-500/50 rounded-lg">
            <p className="text-cyan-400 font-racing text-sm">
              🎯 Cupos disponibles: {availableSpots}/{race.maxParticipants}
            </p>
          </div>
        </div>

        {/* WhatsApp Share Button */}
        <div className="mb-6 p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 border-2 border-green-500/50 rounded-xl">
          <p className="text-green-400 font-racing text-sm mb-3 text-center">
            📱 O COMPARTE ESTA CARRERA POR WHATSAPP
          </p>
          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
              `¡Únete a mi carrera en Karteando! 🏁\n\n${race.name}\n📅 ${new Date(race.date).toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n🕐 ${race.time}\n\n🎯 Cupos limitados: ${availableSpots}/${race.maxParticipants}\n\n👉 ${window.location.origin}/races/friendly/${race._id}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600/20 border-2 border-green-500/50 text-green-400 rounded-lg hover:bg-green-600/30 transition-all font-racing text-sm"
          >
            <span className="text-2xl">💬</span>
            COMPARTIR POR WHATSAPP
          </a>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-6xl mb-4">🏁</div>
            <p className="text-sky-blue/70">Cargando amigos...</p>
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">😔</div>
            <p className="text-sky-blue/70 text-lg">
              No tienes amigos agregados aún
            </p>
          </div>
        ) : (
          <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
            {friends.map((friend) => {
              const isInRace = isFriendInRace(friend.userId);
              const isSelected = selectedFriendIds.has(friend.userId);

              return (
                <div
                  key={friend.userId}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isInRace
                      ? 'bg-slate-600/10 border-slate-500/30 opacity-50 cursor-not-allowed'
                      : isSelected
                      ? 'bg-cyan-600/20 border-cyan-500/50'
                      : 'bg-midnight/50 border-electric-blue/30 hover:border-electric-blue/50 cursor-pointer'
                  }`}
                  onClick={() => !isInRace && toggleFriend(friend.userId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-electric-blue font-bold">
                        {friend.alias || `${friend.firstName} ${friend.lastName}`}
                      </p>
                      <p className="text-sky-blue/50 text-sm">{friend.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isInRace ? (
                        <span className="px-3 py-1 bg-green-600/20 border border-green-500/50 rounded text-green-400 text-xs font-racing">
                          ✅ YA INSCRITO
                        </span>
                      ) : (
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-cyan-500 border-cyan-400'
                            : 'border-electric-blue/50'
                        }`}>
                          {isSelected && <span className="text-white text-sm">✓</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSending}
            className="flex-1 px-6 py-3 bg-slate-600/20 border border-slate-500/50 text-slate-300 rounded-lg hover:bg-slate-600/30 transition-all font-racing disabled:opacity-50"
          >
            CANCELAR
          </button>
          <button
            onClick={handleSendInvitations}
            disabled={isSending || selectedFriendIds.size === 0 || friends.length === 0}
            className="flex-1 px-6 py-3 bg-cyan-600/20 border border-cyan-500/50 text-cyan-400 rounded-lg hover:bg-cyan-600/30 transition-all font-racing disabled:opacity-50"
          >
            {isSending ? '⏳ ENVIANDO...' : `📨 INVITAR (${selectedFriendIds.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// Race Card Component
function RaceCard({
  race,
  currentUserId,
  onJoinClick,
  onLeaveClick,
  onDeleteClick,
  onConfirmClick,
  onViewResults,
  onInviteFriendsClick,
  showOnlyLeaveButton,
  isAuthenticated = true,
}: {
  race: Race;
  currentUserId?: string;
  onJoinClick?: () => void;
  onLeaveClick?: () => void;
  onDeleteClick?: () => void;
  onConfirmClick?: () => void;
  onViewResults?: () => void;
  onInviteFriendsClick?: () => void;
  showOnlyLeaveButton?: boolean;
  isAuthenticated?: boolean;
}) {
  const isChampionship = race.type === 'championship';
  const isCreator = currentUserId && race.organizerId === currentUserId;
  const isParticipant = currentUserId && race.participantsList?.some(
    (participant) => participant.userId === currentUserId
  );
  const isFull = race.maxParticipants && race.participants >= race.maxParticipants;

  console.log('🔍 RaceCard Debug:', {
    raceName: race.name,
    organizerId: race.organizerId,
    currentUserId,
    isCreator,
    isParticipant,
    status: race.status,
    isFull,
    isChampionship,
  });

  return (
    <div
      className={`bg-gradient-to-br from-midnight to-midnight border-2 rounded-xl p-6 hover:scale-[1.02] transition-all ${
        isChampionship
          ? 'via-cyan-400/10 border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-400/30'
          : 'via-electric-blue/10 border-electric-blue/50 hover:shadow-lg hover:shadow-electric-blue/30'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3
            className={`text-xl font-racing mb-1 ${
              isChampionship ? 'text-cyan-400' : 'text-electric-blue'
            }`}
          >
            {race.name}
          </h3>
          {race.organizerName && (
            <p className="text-sm text-sky-blue/50">
              Organizador: {race.organizerName}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <div
            className={`px-3 py-1 rounded-lg text-xs font-racing ${
              isChampionship
                ? 'bg-cyan-400/20 text-cyan-400'
                : 'bg-electric-blue/20 text-electric-blue'
            }`}
          >
            {isChampionship ? '🏆 CAMPEONATO' : '🤝 AMISTOSA'}
          </div>
          {race.linkedRaceSessionId && (
            <div className="px-3 py-1 rounded-lg text-xs font-racing bg-green-500/20 text-green-400 border border-green-400/30">
              ✓ VINCULADA
            </div>
          )}
          {/* Badge de estado de confirmación */}
          {!isChampionship && race.status !== 'confirmed' && (
            <div className="px-3 py-1 rounded-lg text-xs font-racing bg-orange-500/20 text-orange-400 border border-orange-400/30">
              ⏳ PENDIENTE
            </div>
          )}
          {!isChampionship && race.status === 'confirmed' && (
            <div className="px-3 py-1 rounded-lg text-xs font-racing bg-green-500/20 text-green-400 border border-green-400/30">
              ✅ CONFIRMADO
            </div>
          )}
          {!isChampionship && isFull && (
            <div className="px-3 py-1 rounded-lg text-xs font-racing bg-red-500/20 text-red-400 border border-red-400/30">
              🔒 LLENA
            </div>
          )}
        </div>
      </div>

      {/* Mostrar info de sesión vinculada */}
      {race.linkedRaceSessionId && race.results && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-400/20">
          <p className="text-xs text-green-400/70 mb-1 font-racing">📊 RESULTADOS DISPONIBLES</p>
          <p className="text-sm text-green-300 font-medium">{race.results.sessionName}</p>
          <p className="text-xs text-green-400/60">
            {new Date(race.results.sessionDate).toLocaleDateString('es-CL')} • {' '}
            {new Date(race.results.sessionDate).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-sky-blue/50 mb-1">📅 Fecha</p>
          <p className="text-sky-blue font-digital">
            {new Date(race.date).toLocaleDateString('es-CL', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </p>
        </div>
        <div>
          <p className="text-xs text-sky-blue/50 mb-1">🕐 Hora</p>
          <p className="text-sky-blue font-digital">{race.time}</p>
        </div>
      </div>

      {/* Lista de participantes */}
      {race.participantsList && race.participantsList.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-midnight/50 border border-electric-blue/20">
          <p className="text-xs text-sky-blue/50 mb-2 font-racing">🏁 PILOTOS INSCRITOS</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {race.participantsList.map((participant, idx) => (
              <div
                key={participant.userId || idx}
                className="flex items-center gap-2 text-sm"
              >
                <span className="text-sky-blue/70 font-digital">{idx + 1})</span>
                <span className="text-sky-blue">
                  {participant.driverName || participant.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-sky-blue/70">
          👥 {race.participants}
          {race.maxParticipants && `/${race.maxParticipants}`} participantes
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Botones del creador */}
          {isCreator && (
            <>
              {race.status !== 'confirmed' && (
                <button
                  onClick={onConfirmClick}
                  className="px-3 py-2 rounded-lg font-racing transition-all bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-600/30 text-sm"
                >
                  ✓ CONFIRMAR EVENTO
                </button>
              )}
              <button
                onClick={onDeleteClick}
                className="px-3 py-2 rounded-lg font-racing transition-all bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30 text-sm"
              >
                🗑️ ELIMINAR
              </button>
              <a
                href={`https://api.whatsapp.com/send?phone=56940052596&text=${encodeURIComponent(
                  `Hola! Quiero hacer una reserva para la carrera "${race.name}" el día ${new Date(race.date).toLocaleDateString('es-CL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })} a las ${race.time}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg font-racing transition-all bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:bg-blue-600/30 text-sm whitespace-nowrap"
              >
                📱 AVISAR A SPEEDPARK
              </a>
            </>
          )}

          {/* Botón Invitar Amigos (solo si es participante, hay cupos y no es championship) */}
          {!isChampionship && isParticipant && !isFull && onInviteFriendsClick && (
            <button
              onClick={onInviteFriendsClick}
              className="px-4 py-2 rounded-lg font-racing transition-all bg-cyan-600/20 border border-cyan-500/50 text-cyan-400 hover:bg-cyan-600/30 text-sm"
            >
              👥 INVITAR AMIGOS
            </button>
          )}

          {/* Botón de unirse/desinscribirse (solo si NO es el creador) */}
          {!isCreator && (
            <>
              {isParticipant && onLeaveClick ? (
                // Usuario YA está inscrito - mostrar botón de desinscripción
                <button
                  onClick={onLeaveClick}
                  className="px-4 py-2 rounded-lg font-racing transition-all bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30"
                >
                  🚪 DESINSCRIBIRME
                </button>
              ) : !isParticipant && isFull ? (
                // Carrera llena - mostrar badge sin botón
                <div className="px-4 py-2 rounded-lg font-racing bg-red-500/20 border border-red-500/50 text-red-400">
                  🚫 CARRERA LLENA
                </div>
              ) : !isParticipant && !isAuthenticated ? (
                // Usuario NO autenticado - mostrar botón para iniciar sesión
                <button
                  onClick={onJoinClick}
                  className="px-4 py-2 rounded-lg font-racing transition-all bg-gold/20 border border-gold/50 text-gold hover:bg-gold/30"
                >
                  🔑 INICIAR SESIÓN PARA UNIRME
                </button>
              ) : !isParticipant && onJoinClick ? (
                // Usuario autenticado NO inscrito y hay cupos - mostrar botón de unirse
                <button
                  onClick={onJoinClick}
                  className="px-4 py-2 rounded-lg font-racing transition-all bg-electric-blue/20 border border-electric-blue/50 text-electric-blue hover:bg-electric-blue/30"
                >
                  UNIRME
                </button>
              ) : null}
            </>
          )}

          {/* Botón Ver Resultados (solo si está vinculada) */}
          {race.linkedRaceSessionId && onViewResults && (
            <button
              onClick={onViewResults}
              className="px-4 py-2 rounded-lg font-racing transition-all bg-green-500/20 border border-green-400/50 text-green-400 hover:bg-green-500/30"
            >
              📊 VER RESULTADOS
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// My Registered Events View
function MyRegisteredEventsView({ token, userId, onRefresh }: { token: string; userId?: string; onRefresh?: () => void }) {
  const [events, setEvents] = useState<any[]>([]);
  const [friendlyRaces, setFriendlyRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [unregisteringEventId, setUnregisteringEventId] = useState<string | null>(null);
  const [showUnregisterConfirm, setShowUnregisterConfirm] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [raceToLeave, setRaceToLeave] = useState<{ id: string; name: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [raceToDelete, setRaceToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showConfirmRaceModal, setShowConfirmRaceModal] = useState(false);
  const [raceToConfirm, setRaceToConfirm] = useState<{ id: string; name: string } | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [raceToInvite, setRaceToInvite] = useState<Race | null>(null);
  const [showSuccessConfirmModal, setShowSuccessConfirmModal] = useState(false);
  const [showErrorConfirmModal, setShowErrorConfirmModal] = useState(false);
  const [confirmErrorMessage, setConfirmErrorMessage] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (token && userId) {
      fetchMyEvents();
      fetchMyFriendlyRaces();
    }
  }, [token, userId]);

  const fetchMyEvents = async () => {
    try {
      const response = await fetch('/api/squadron-events/my-events', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching my events:', error);
    }
  };

  const fetchMyFriendlyRaces = async () => {
    try {
      const response = await fetch('/api/races/my-races', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFriendlyRaces(data.races || []);
      }
    } catch (error) {
      console.error('Error fetching my friendly races:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnregisterClick = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowUnregisterConfirm(eventId);
  };

  const handleConfirmUnregister = async (eventId: string) => {
    setShowUnregisterConfirm(null);
    setUnregisteringEventId(eventId);

    try {
      const response = await fetch(`/api/squadron-events/${eventId}/unregister`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setToast({
          message: 'Te has retirado exitosamente del evento',
          type: 'success'
        });
        // Refresh events list
        fetchMyEvents();
      } else {
        setToast({
          message: data.error || 'Error al retirarse',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error unregistering:', error);
      setToast({
        message: 'Error al retirarse del evento',
        type: 'error'
      });
    } finally {
      setUnregisteringEventId(null);
    }
  };

  const handleLeaveRace = (raceId: string, raceName: string) => {
    setRaceToLeave({ id: raceId, name: raceName });
    setShowLeaveConfirm(true);
  };

  const confirmLeaveRace = async () => {
    if (!raceToLeave) return;

    try {
      const response = await fetch(`/api/races/friendly/${raceToLeave.id}/leave`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setShowLeaveConfirm(false);
        setRaceToLeave(null);
        setToast({
          message: 'Te has desinscrito de la carrera exitosamente',
          type: 'success'
        });
        // Refresh local list
        fetchMyFriendlyRaces();
        // Also refresh main races list
        if (onRefresh) {
          onRefresh();
        }
      } else {
        setToast({
          message: data.error || 'Error al desinscribirte de la carrera',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error leaving race:', error);
      setToast({
        message: 'Error al desinscribirte de la carrera',
        type: 'error'
      });
    }
  };

  const handleDeleteClick = (raceId: string, raceName: string) => {
    setRaceToDelete({ id: raceId, name: raceName });
    setShowDeleteConfirm(true);
  };

  const confirmDeleteRace = async () => {
    if (!raceToDelete) return;

    try {
      const response = await fetch(`/api/races/friendly/${raceToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setShowDeleteConfirm(false);
        setRaceToDelete(null);
        setToast({
          message: 'Carrera eliminada exitosamente',
          type: 'success'
        });
        fetchMyFriendlyRaces();
        if (onRefresh) {
          onRefresh();
        }
      } else {
        setToast({
          message: data.error || 'Error al eliminar la carrera',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error deleting race:', error);
      setToast({
        message: 'Error al eliminar la carrera',
        type: 'error'
      });
    }
  };

  const handleConfirmClick = (raceId: string, raceName: string) => {
    setRaceToConfirm({ id: raceId, name: raceName });
    setShowConfirmRaceModal(true);
  };

  const confirmRace = async () => {
    if (!raceToConfirm) return;

    try {
      const response = await fetch(`/api/races/friendly/${raceToConfirm.id}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setShowConfirmRaceModal(false);
        setRaceToConfirm(null);
        setToast({
          message: 'Carrera confirmada exitosamente',
          type: 'success'
        });
        fetchMyFriendlyRaces();
        if (onRefresh) {
          onRefresh();
        }
      } else {
        setToast({
          message: data.error || 'Error al confirmar la carrera',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error confirming race:', error);
      setToast({
        message: 'Error al confirmar la carrera',
        type: 'error'
      });
    }
  };

  const handleInviteFriendsClick = (race: Race) => {
    setRaceToInvite(race);
    setShowInviteModal(true);
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin text-6xl mb-4">🏁</div>
        <p className="text-sky-blue/70">Cargando tus carreras...</p>
      </div>
    );
  }

  if (events.length === 0 && friendlyRaces.length === 0) {
    return (
      <div className="bg-gradient-to-br from-midnight via-purple-500/10 to-midnight border-2 border-purple-400/50 rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-2xl font-racing text-purple-400 mb-2">
          NO ESTÁS INSCRITO EN NINGUNA CARRERA
        </h3>
        <p className="text-sky-blue/70 mb-6">
          Explora los campeonatos y carreras amistosas para unirte
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-3xl">📋</span>
        <h2 className="text-2xl font-racing text-purple-400">
          MIS CARRERAS INSCRITAS
        </h2>
      </div>

      {/* Campeonatos de Escuadrón */}
      {events.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-racing text-cyan-400 flex items-center gap-2">
            <span>🏆</span> CAMPEONATOS DE ESCUADRÓN
          </h3>
          {events.map((event) => (
            <SquadronEventCard
              key={event._id}
              event={event}
              showUnregisterButton={true}
              onUnregister={(e) => handleUnregisterClick(event._id, e)}
              isUnregistering={unregisteringEventId === event._id}
            />
          ))}
        </div>
      )}

      {/* Carreras Amistosas */}
      {friendlyRaces.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-racing text-electric-blue flex items-center gap-2">
            <span>🏁</span> CARRERAS AMISTOSAS
          </h3>
          {friendlyRaces.map((race) => (
            <RaceCard
              key={race._id}
              race={race}
              currentUserId={userId}
              onLeaveClick={() => handleLeaveRace(race._id, race.name)}
              onDeleteClick={() => handleDeleteClick(race._id, race.name)}
              onConfirmClick={() => handleConfirmClick(race._id, race.name)}
              onInviteFriendsClick={() => handleInviteFriendsClick(race)}
            />
          ))}
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Unregister Confirmation Modal (Squadron Events) */}
      {showUnregisterConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-midnight via-red-900/20 to-midnight border-2 border-red-500/50 rounded-xl p-8 max-w-md mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-racing text-red-400 mb-2">
                ¿RETIRARSE DEL EVENTO?
              </h3>
              <p className="text-sky-blue/80 font-digital">
                Solo tú serás retirado, tus compañeros de escudería seguirán participando.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUnregisterConfirm(null)}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-racing transition-all"
              >
                CANCELAR
              </button>
              <button
                onClick={() => handleConfirmUnregister(showUnregisterConfirm)}
                className="flex-1 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded-lg font-racing transition-all"
              >
                RETIRARME
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Confirmation Modal (Friendly Races) */}
      {showLeaveConfirm && raceToLeave && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-midnight via-red-500/10 to-midnight border-2 border-red-500/50 rounded-xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🚪</div>
              <h3 className="text-2xl font-racing text-red-400 mb-3">
                DESINSCRIBIRSE DE CARRERA
              </h3>
              <p className="text-sky-blue/80 text-lg mb-2">
                ¿Estás seguro de que quieres desinscribirte de:
              </p>
              <p className="text-electric-blue font-bold text-xl">
                "{raceToLeave.name}"?
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLeaveConfirm(false);
                  setRaceToLeave(null);
                }}
                className="flex-1 px-6 py-3 bg-slate-600/20 border border-slate-500/50 text-slate-300 rounded-lg hover:bg-slate-600/30 transition-all font-racing"
              >
                CANCELAR
              </button>
              <button
                onClick={confirmLeaveRace}
                className="flex-1 px-6 py-3 bg-red-600/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-600/30 transition-all font-racing"
              >
                SÍ, DESINSCRIBIRME
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && raceToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-midnight via-red-900/20 to-midnight border-2 border-red-500/50 rounded-xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-racing text-red-400 mb-3">
                ELIMINAR CARRERA
              </h3>
              <p className="text-sky-blue/80 text-lg mb-2">
                ¿Estás seguro de que quieres eliminar esta carrera?
              </p>
              <p className="text-electric-blue font-bold text-xl mb-2">
                "{raceToDelete.name}"
              </p>
              <p className="text-red-400/70 text-sm">
                Esta acción no se puede deshacer
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setRaceToDelete(null);
                }}
                className="flex-1 px-6 py-3 bg-slate-600/20 border border-slate-500/50 text-slate-300 rounded-lg hover:bg-slate-600/30 transition-all font-racing"
              >
                CANCELAR
              </button>
              <button
                onClick={confirmDeleteRace}
                className="flex-1 px-6 py-3 bg-red-600/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-600/30 transition-all font-racing"
              >
                SÍ, ELIMINAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Race Modal */}
      {showConfirmRaceModal && raceToConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-midnight via-green-500/10 to-midnight border-2 border-green-500/50 rounded-xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-racing text-green-400 mb-3">
                CONFIRMAR EVENTO
              </h3>
              <p className="text-sky-blue/80 text-lg mb-2">
                ¿Ya confirmaste la reserva con Speedpark?
              </p>
              <p className="text-electric-blue font-bold text-xl mb-2">
                "{raceToConfirm.name}"
              </p>
              <p className="text-yellow-400/70 text-sm">
                Los participantes verán que el evento está confirmado, pero podrán seguir uniéndose si hay cupos disponibles
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmRaceModal(false);
                  setRaceToConfirm(null);
                }}
                className="flex-1 px-6 py-3 bg-slate-600/20 border border-slate-500/50 text-slate-300 rounded-lg hover:bg-slate-600/30 transition-all font-racing"
              >
                CANCELAR
              </button>
              <button
                onClick={confirmRace}
                className="flex-1 px-6 py-3 bg-green-600/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-600/30 transition-all font-racing"
              >
                SÍ, CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Confirm Modal */}
      {showSuccessConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-gradient-to-br from-midnight via-green-500/20 to-midnight border-2 border-green-500/50 rounded-xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-2xl font-racing text-green-400 mb-3">
                ¡EVENTO CONFIRMADO!
              </h3>
              <p className="text-sky-blue/80 text-lg mb-2">
                La reserva está confirmada con Speedpark
              </p>
              <p className="text-electric-blue/70 text-sm">
                Los participantes pueden ver que el evento está listo
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Confirm Modal */}
      {showErrorConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-gradient-to-br from-midnight via-red-500/20 to-midnight border-2 border-red-500/50 rounded-xl p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-racing text-red-400 mb-3">
                ERROR
              </h3>
              <p className="text-sky-blue/80 text-lg">
                {confirmErrorMessage}
              </p>
            </div>
            <button
              onClick={() => setShowErrorConfirmModal(false)}
              className="w-full px-6 py-3 bg-red-600/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-600/30 transition-all font-racing"
            >
              CERRAR
            </button>
          </div>
        </div>
      )}

      {/* Invite Friends Modal */}
      {showInviteModal && raceToInvite && (
        <InviteFriendsModal
          race={raceToInvite}
          token={token}
          onClose={() => {
            setShowInviteModal(false);
            setRaceToInvite(null);
          }}
          onSuccess={() => {
            setShowInviteModal(false);
            setRaceToInvite(null);
          }}
        />
      )}
    </div>
  );
}

// Component for displaying squadron events
function SquadronEventCard({
  event,
  showUnregisterButton = false,
  onUnregister,
  isUnregistering = false
}: {
  event: any;
  showUnregisterButton?: boolean;
  onUnregister?: (e: React.MouseEvent) => void;
  isUnregistering?: boolean;
}) {
  const categoryConfig = EventCategoryConfig[event.category as EventCategory];
  const router = useRouter();
  const { user, token } = useAuth();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showPilotsModal, setShowPilotsModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [unregistering, setUnregistering] = useState(false);
  const [showUnregisterConfirm, setShowUnregisterConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Countdown timer for registration deadline
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const deadline = new Date(event.registrationDeadline).getTime();
      const distance = deadline - now;

      if (distance < 0) {
        setTimeRemaining('Cerrado');
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [event.registrationDeadline]);

  const isOrganizer = user?.email === 'icabreraquezada@gmail.com';
  const userSquadronId = (user as any)?.squadron?.squadronId;
  const userId = (user as any)?.id; // Use 'id' not '_id'

  // Find squadron participation
  const squadronParticipation = event.participants?.find(
    (p: any) => p.squadronId?._id?.toString() === userSquadronId?.toString() || p.squadronId?.toString() === userSquadronId?.toString()
  );

  // Check if THIS user is confirmed or invited
  const isUserConfirmed = squadronParticipation?.confirmedPilots?.some(
    (pilot: any) => {
      const pilotIdStr = pilot.pilotId?._id?.toString() || pilot.pilotId?.toString();
      const userIdStr = userId?.toString();
      console.log(`🔍 Checking pilot: ${pilotIdStr} vs user: ${userIdStr} = ${pilotIdStr === userIdStr}`);
      return pilotIdStr === userIdStr;
    }
  );

  const isUserInvited = squadronParticipation?.pendingInvitations?.some(
    (inv: any) => {
      const invPilotIdStr = inv.pilotId?._id?.toString() || inv.pilotId?.toString();
      const userIdStr = userId?.toString();
      console.log(`🔍 Checking invitation: ${invPilotIdStr} vs user: ${userIdStr} = ${invPilotIdStr === userIdStr}`);
      return invPilotIdStr === userIdStr && inv.status === 'pending';
    }
  );

  const isUserRegistered = isUserConfirmed || isUserInvited;
  const squadronRegisteredButNotUser = squadronParticipation && !isUserRegistered;

  // Check if registration is closed
  const isRegistrationClosed = new Date(event.registrationDeadline) < new Date();

  console.log(`📊 Event: ${event.name}`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Squadron ID: ${userSquadronId}`);
  console.log(`   Squadron Participation:`, squadronParticipation ? 'YES' : 'NO');
  console.log(`   Is User Confirmed: ${isUserConfirmed}`);
  console.log(`   Is User Invited: ${isUserInvited}`);
  console.log(`   Is User Registered: ${isUserRegistered}`);
  console.log(`   Squadron registered but not user: ${squadronRegisteredButNotUser}`);

  const handleCardClick = () => {
    // If user is registered, go to event page
    if (isUserRegistered) {
      router.push(`/evento/${event._id}`);
    }
    // If organizer, go to organizer view
    else if (isOrganizer) {
      router.push(`/organizador/evento/${event._id}`);
    }
  };

  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Check if user is authenticated
    if (!token || !user) {
      setToast({
        message: 'Debes iniciar sesión para unirte a un evento. Haz clic en "Login" en la barra de navegación.',
        type: 'error'
      });
      return;
    }

    setShowJoinModal(true);
  };

  const handleViewPilotsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPilotsModal(true);
  };

  const handleUnregisterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUnregister) {
      // If parent provided handler, use it
      onUnregister(e);
    } else {
      // Otherwise use internal handler
      setShowUnregisterConfirm(true);
    }
  };

  const handleConfirmUnregister = async () => {
    setShowUnregisterConfirm(false);
    setUnregistering(true);

    try {
      const response = await fetch(`/api/squadron-events/${event._id}/unregister`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setToast({
          message: 'Te has retirado exitosamente del evento',
          type: 'success'
        });
        // Reload to refresh event data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setToast({
          message: data.error || 'Error al retirarse',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error unregistering:', error);
      setToast({
        message: 'Error al retirarse del evento',
        type: 'error'
      });
    } finally {
      setUnregistering(false);
    }
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 backdrop-blur-sm border-2 border-slate-700/50 rounded-xl p-6 hover:border-electric-blue/50 transition-all shadow-lg hover:shadow-electric-blue/20 ${
          (isOrganizer || isUserRegistered) ? 'cursor-pointer hover:scale-[1.02]' : ''
        }`}
      >
      {/* Category Badge */}
      <div className={`inline-block px-4 py-1 rounded-full bg-gradient-to-r ${categoryConfig.color} text-white font-racing text-sm mb-4`}>
        {categoryConfig.name}
      </div>

      {/* Event Name */}
      <h3 className="text-2xl font-racing text-white mb-2">{event.name}</h3>

      {/* Description */}
      {event.description && (
        <p className="text-slate-400 mb-4">{event.description}</p>
      )}

      {/* Event Details Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-slate-500 text-sm">📅 Fecha</p>
          <p className="text-white font-racing">
            {new Date(event.eventDate).toLocaleDateString('es-CL', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </p>
        </div>
        <div>
          <p className="text-slate-500 text-sm">🕐 Hora</p>
          <p className="text-electric-blue font-racing text-2xl">{event.eventTime || '19:00'}</p>
        </div>
        <div>
          <p className="text-slate-500 text-sm">⏱️ Duración</p>
          <p className="text-white font-racing">
            {event.duration ? `${Math.floor(event.duration / 60)}h ${event.duration % 60}min` : '90min'}
          </p>
        </div>
        <div>
          <p className="text-slate-500 text-sm">📍 Ubicación</p>
          <p className="text-white font-racing">{event.location}</p>
        </div>
        <div>
          <p className="text-slate-500 text-sm">🏁 Escuderías</p>
          <p className="text-white font-racing">{event.participants?.length || 0}/{event.maxSquadrons}</p>
        </div>
        <div>
          <p className="text-slate-500 text-sm">🏆 Puntos Ganador</p>
          <p className="text-electric-blue font-racing">{event.pointsForWinner}</p>
        </div>
      </div>

      {/* View Pilots Button */}
      {event.participants && event.participants.length > 0 && (
        <button
          onClick={handleViewPilotsClick}
          className="mb-4 px-4 py-2 bg-purple-500/20 border border-purple-500/50 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all font-racing text-sm inline-block"
        >
          👥 VER PILOTOS INSCRITOS ({event.participants.length} escuderías)
        </button>
      )}

      {/* Registration Deadline Countdown */}
      <div className="mb-4 p-3 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-400 text-sm font-racing">⏰ Cierre de Inscripciones</p>
            <p className="text-slate-300 text-xs">
              {new Date(event.registrationDeadline).toLocaleDateString('es-CL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="text-right">
            <p className={`font-racing text-2xl ${
              timeRemaining === 'Cerrado' ? 'text-red-500' :
              timeRemaining.includes('d') ? 'text-green-400' :
              timeRemaining.includes('h') && !timeRemaining.includes('m') ? 'text-yellow-400' :
              'text-orange-400 animate-pulse'
            }`}>
              {timeRemaining || '...'}
            </p>
            <p className="text-slate-500 text-xs">restante</p>
          </div>
        </div>
      </div>

      {/* Status and Join/Unregister Buttons */}
      <div className="flex items-center justify-between gap-2">
        <span className={`px-3 py-1 rounded-full text-xs font-racing ${
          (showUnregisterButton || isUserRegistered) ? 'bg-green-600/20 text-green-400 border border-green-500/50' :
          event.status === 'published' ? 'bg-green-600/20 text-green-400 border border-green-500/50' :
          event.status === 'registration_open' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50' :
          event.status === 'completed' ? 'bg-slate-600/20 text-slate-400 border border-slate-500/50' :
          'bg-yellow-600/20 text-yellow-400 border border-yellow-500/50'
        }`}>
          {(showUnregisterButton || isUserRegistered) ? '✓ REGISTRADO' :
           event.status === 'published' ? 'Publicado' :
           event.status === 'registration_open' ? 'Inscripciones Abiertas' :
           event.status === 'completed' ? 'Completado' :
           'Borrador'}
        </span>

        {/* Unregister Button - Shows when user is registered */}
        {(showUnregisterButton || isUserRegistered) && (
          <button
            onClick={handleUnregisterClick}
            disabled={isUnregistering || unregistering}
            className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 text-sm font-bold"
          >
            {(isUnregistering || unregistering) ? '⏳ PROCESANDO...' : '❌ RETIRARME'}
          </button>
        )}

        {/* Join Button - Shows when user is NOT registered */}
        {!showUnregisterButton && !isUserRegistered && (event.status === 'published' || event.status === 'registration_open') && !isRegistrationClosed && (
          <button
            onClick={handleJoinClick}
            className="px-4 py-2 rounded-lg font-racing transition-all bg-purple-500/20 border border-purple-500/50 text-purple-400 hover:bg-purple-500/30"
          >
            🏆 UNIRSE
          </button>
        )}

        {/* Registration Closed Message */}
        {!showUnregisterButton && !isUserRegistered && (event.status === 'published' || event.status === 'registration_open') && isRegistrationClosed && (
          <span className="px-4 py-2 bg-red-600/20 border border-red-500/50 text-red-400 rounded-lg font-racing text-sm">
            🔒 INSCRIPCIONES CERRADAS
          </span>
        )}
      </div>
    </div>

    {/* Join Modal */}
    {showJoinModal && (
      <JoinEventModal
        event={event}
        onClose={() => setShowJoinModal(false)}
        onSuccess={() => {
          setShowJoinModal(false);
          window.location.reload(); // Refresh to show updated registration
        }}
      />
    )}

    {/* Pilots Modal */}
    {showPilotsModal && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowPilotsModal(false)}>
        <div className="bg-gradient-to-br from-midnight via-purple-900/20 to-midnight border-2 border-purple-500/50 rounded-xl p-8 max-w-2xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-racing text-purple-400">
              👥 PILOTOS INSCRITOS
            </h3>
            <button
              onClick={() => setShowPilotsModal(false)}
              className="text-purple-400 hover:text-white transition-colors text-2xl"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {event.participants && event.participants.length > 0 ? (
              event.participants.map((participant: any, index: number) => (
                <div key={index} className="bg-black/30 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🏁</span>
                    <h4 className="text-xl font-racing text-white">
                      {participant.squadronId?.name || 'Escudería'}
                    </h4>
                  </div>

                  {/* Confirmed Pilots */}
                  {participant.confirmedPilots && participant.confirmedPilots.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm text-green-400 font-racing mb-2">✓ Confirmados:</p>
                      <div className="space-y-1">
                        {participant.confirmedPilots.map((pilot: any, pIndex: number) => (
                          <div key={pIndex} className="flex items-center gap-2 text-sm text-white ml-4">
                            <span className="text-green-400">•</span>
                            <span>{pilot.pilotId?.profile?.alias || `${pilot.pilotId?.profile?.firstName} ${pilot.pilotId?.profile?.lastName}` || pilot.pilotId?.email || 'Piloto'}</span>
                            {pilot.kartNumber && <span className="text-electric-blue">| Kart #{pilot.kartNumber}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending Invitations */}
                  {participant.pendingInvitations && participant.pendingInvitations.filter((inv: any) => inv.status === 'pending').length > 0 && (
                    <div>
                      <p className="text-sm text-yellow-400 font-racing mb-2">⏳ Pendientes:</p>
                      <div className="space-y-1">
                        {participant.pendingInvitations
                          .filter((inv: any) => inv.status === 'pending')
                          .map((inv: any, iIndex: number) => (
                            <div key={iIndex} className="flex items-center gap-2 text-sm text-white ml-4">
                              <span className="text-yellow-400">•</span>
                              <span>{inv.pilotId?.profile?.alias || `${inv.pilotId?.profile?.firstName} ${inv.pilotId?.profile?.lastName}` || inv.pilotId?.email || 'Piloto'}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-slate-400">No hay escuderías inscritas aún</p>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Unregister Confirmation Modal */}
    {showUnregisterConfirm && (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowUnregisterConfirm(false)}>
        <div className="bg-gradient-to-br from-midnight via-red-900/20 to-midnight border-2 border-red-500/50 rounded-xl p-8 max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">⚠️</div>
            <h3 className="text-2xl font-racing text-red-400 mb-2">
              ¿RETIRARSE DEL EVENTO?
            </h3>
            <p className="text-sky-blue/80 font-digital">
              Solo tú serás retirado, tus compañeros de escudería seguirán participando.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowUnregisterConfirm(false)}
              className="flex-1 px-6 py-3 bg-slate-600/20 border border-slate-500/50 text-slate-300 rounded-lg hover:bg-slate-600/30 transition-all font-racing"
            >
              CANCELAR
            </button>
            <button
              onClick={handleConfirmUnregister}
              disabled={unregistering}
              className="flex-1 px-6 py-3 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-all font-racing disabled:opacity-50"
            >
              {unregistering ? '⏳ PROCESANDO...' : 'RETIRARME'}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Toast Notification */}
    {toast && (
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(null)}
      />
    )}
    </>
  );
}

// Modal de resultados completos del evento
function EventResultsModal({ event, onClose }: { event: any; onClose: () => void }) {
  const categoryConfig = EventCategoryConfig[event.category as any];
  const [raceResults, setRaceResults] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [highlightedDriver, setHighlightedDriver] = useState<string | null>(null);
  const [highlightedDriverTimes, setHighlightedDriverTimes] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (event.linkedRaceSessionId) {
      fetchRaceResults();
    }
  }, [event.linkedRaceSessionId]);

  const fetchRaceResults = async () => {
    if (!event.linkedRaceSessionId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/race-results-v0?sessionId=${encodeURIComponent(event.linkedRaceSessionId)}`);
      const data = await response.json();

      if (data.success) {
        setRaceResults(data.race.drivers);
      }
    } catch (error) {
      console.error('Error fetching race results:', error);
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

  const getPositionColor = (position: number) => {
    if (position === 1) return 'text-gold';
    if (position === 2) return 'text-gray-300';
    if (position === 3) return 'text-orange-400';
    return 'text-electric-blue';
  };

  const getMedalEmoji = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-midnight via-slate-900 to-midnight border-2 border-green-500/50 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-midnight to-slate-900 border-b border-green-500/30 p-6 z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{categoryConfig?.icon || '🏆'}</span>
              <div>
                <h2 className="text-3xl font-racing text-white">{event.name}</h2>
                <p className="text-gray-400 text-sm">{event.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-all"
            >
              ×
            </button>
          </div>

          <div className="flex items-center gap-4 text-sm flex-wrap">
            <span className="px-3 py-1 bg-green-600/20 text-green-400 border border-green-500/50 rounded-full font-racing">
              ✅ FINALIZADO
            </span>
            <span className="text-gray-400">
              📅 {new Date(event.finalizedAt || event.eventDate).toLocaleDateString('es-CL', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </span>
            <span className="text-gray-400">
              🏁 {event.location}
            </span>
            {!selectedDriver && (
              <button
                onClick={() => setSelectedDriver(null)}
                className="text-electric-blue hover:text-cyan-400 font-bold ml-auto"
              >
                {selectedDriver ? '← Volver a resultados' : ''}
              </button>
            )}
          </div>
        </div>

        {/* Resultados de la carrera */}
        <div className="p-6">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block text-8xl animate-spin">🏁</div>
              <p className="text-gray-400 mt-4">Cargando resultados...</p>
            </div>
          )}

          {/* Tabla de resultados de carrera */}
          {!loading && !selectedDriver && raceResults.length > 0 && (
            <>
              <div className="mb-6">
                <h3 className="text-2xl font-racing text-electric-blue mb-2">🏁 RESULTADOS DE CARRERA</h3>
                <p className="text-gray-400 text-sm">Haz click en un piloto para ver sus tiempos por vuelta</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-electric-blue/30">
                      <th className="text-left p-3 text-electric-blue">Pos</th>
                      <th className="text-left p-3 text-electric-blue">Piloto</th>
                      <th className="text-left p-3 text-electric-blue">Escudería</th>
                      <th className="text-center p-3 text-electric-blue">Kart</th>
                      <th className="text-center p-3 text-electric-blue">Vueltas</th>
                      <th className="text-right p-3 text-electric-blue">Mejor Vuelta</th>
                      <th className="text-right p-3 text-electric-blue">Última Vuelta</th>
                      <th className="text-right p-3 text-electric-blue">Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {raceResults.map((driver: any, idx: number) => (
                      <tr
                        key={idx}
                        onClick={() => setSelectedDriver(driver)}
                        className="border-b border-sky-blue/10 hover:bg-electric-blue/10 cursor-pointer transition-all"
                      >
                        <td className="p-3">
                          <span className={`text-lg font-bold ${getPositionColor(driver.finalPosition || driver.position)}`}>
                            {getMedalEmoji(driver.finalPosition || driver.position) || `#${driver.finalPosition || driver.position}`}
                          </span>
                        </td>
                        <td className="p-3 text-white font-semibold">{driver.driverName}</td>
                        <td className="p-3 text-left">
                          {driver.squadronName ? (
                            <span className="text-purple-400 font-medium text-sm">
                              {driver.squadronName}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs italic">Sin escudería</span>
                          )}
                        </td>
                        <td className="p-3 text-center text-sky-blue">#{driver.kartNumber}</td>
                        <td className="p-3 text-center text-sky-blue">{driver.totalLaps}</td>
                        <td className="p-3 text-right font-mono text-electric-blue">
                          {formatTime(driver.bestTime)}
                        </td>
                        <td className="p-3 text-right font-mono text-sky-blue">
                          {formatTime(driver.lastTime)}
                        </td>
                        <td className="p-3 text-right font-mono text-gray-400">
                          {formatTime(driver.averageTime)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Gráfico de fluctuación de posiciones */}
              <div className="mt-8 pt-8 border-t border-electric-blue/20">
                <div className="mb-6">
                  <h3 className="text-2xl font-racing text-electric-blue mb-2">📈 EVOLUCIÓN DE POSICIONES</h3>
                  <p className="text-gray-400 text-sm">Fluctuación de posiciones vuelta por vuelta</p>
                </div>

                <div className="bg-racing-black/40 border border-electric-blue/20 rounded-lg p-6">
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart
                      data={(() => {
                        // Preparar datos para el gráfico
                        if (raceResults.length === 0) return [];

                        // Obtener el número máximo de vueltas
                        const maxLaps = Math.max(...raceResults.map((d: any) => d.totalLaps || 0));

                        // Crear un objeto para cada vuelta
                        const chartData = [];
                        for (let lapNum = 1; lapNum <= maxLaps; lapNum++) {
                          const lapData: any = { vuelta: lapNum };

                          // Para cada piloto, encontrar su posición en esa vuelta
                          raceResults.forEach((driver: any) => {
                            const lap = driver.laps?.find((l: any) => l.lapNumber === lapNum);
                            if (lap) {
                              lapData[driver.driverName] = lap.finalPosition || lap.position;
                            }
                          });

                          chartData.push(lapData);
                        }

                        return chartData;
                      })()}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <defs>
                        {raceResults.map((driver: any, idx: number) => {
                          return (
                            <filter key={`glow-${idx}`} id={`glow-${idx}`}>
                              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                              <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          );
                        })}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="vuelta"
                        stroke="#0ea5e9"
                        label={{ value: 'Vuelta', position: 'insideBottom', offset: -5, fill: '#0ea5e9' }}
                      />
                      <YAxis
                        stroke="#0ea5e9"
                        label={{ value: 'Posición', angle: -90, position: 'insideLeft', fill: '#0ea5e9' }}
                        domain={[1, 'auto']}
                        ticks={Array.from({ length: raceResults.length }, (_, i) => i + 1)}
                      />
                      <Legend
                        iconType="line"
                        onClick={(e: any) => {
                          // Toggle highlight: si ya está seleccionado, deseleccionar
                          if (highlightedDriver === e.dataKey) {
                            setHighlightedDriver(null);
                          } else {
                            setHighlightedDriver(e.dataKey);
                          }
                        }}
                        wrapperStyle={{
                          paddingTop: '20px',
                          cursor: 'pointer'
                        }}
                        formatter={(value: string) => {
                          // Resaltar el nombre si está seleccionado
                          const isSelected = highlightedDriver === value;
                          return (
                            <span style={{
                              fontWeight: isSelected ? 'bold' : 'normal',
                              fontSize: isSelected ? '1.1em' : '1em',
                              color: isSelected ? '#fff' : '#9ca3af',
                              textDecoration: isSelected ? 'underline' : 'none'
                            }}>
                              {value}
                            </span>
                          );
                        }}
                      />
                      {raceResults.map((driver: any, idx: number) => {
                        // Generar colores distintos para cada piloto (más colores para más pilotos)
                        const colors = [
                          '#fbbf24', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6',
                          '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#a855f7',
                          '#f59e0b', '#dc2626', '#059669', '#2563eb', '#7c3aed',
                          '#db2777', '#0d9488', '#ea580c', '#0284c7', '#9333ea',
                          '#fcd34d', '#fca5a5', '#6ee7b7', '#93c5fd', '#c4b5fd',
                          '#fbcfe8', '#5eead4', '#fdba74', '#7dd3fc', '#d8b4fe'
                        ];

                        // Determinar opacidad basado en si está resaltado
                        const isHighlighted = highlightedDriver === null || highlightedDriver === driver.driverName;
                        const opacity = isHighlighted ? 1 : 0.2;
                        const strokeWidth = isHighlighted && highlightedDriver === driver.driverName ? 4 : 2.5;

                        return (
                          <Line
                            key={driver.driverName}
                            type="monotone"
                            dataKey={driver.driverName}
                            stroke={colors[idx % colors.length]}
                            strokeWidth={strokeWidth}
                            strokeOpacity={opacity}
                            dot={{
                              r: isHighlighted && highlightedDriver === driver.driverName ? 5 : 4,
                              strokeWidth: 2,
                              fill: colors[idx % colors.length],
                              fillOpacity: opacity,
                              cursor: 'pointer',
                              onClick: () => {
                                // Toggle highlight cuando se hace click en el punto
                                if (highlightedDriver === driver.driverName) {
                                  setHighlightedDriver(null);
                                } else {
                                  setHighlightedDriver(driver.driverName);
                                }
                              }
                            }}
                            activeDot={false}
                            connectNulls={true}
                            onClick={() => {
                              // Toggle highlight cuando se hace click en la línea
                              if (highlightedDriver === driver.driverName) {
                                setHighlightedDriver(null);
                              } else {
                                setHighlightedDriver(driver.driverName);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico de tiempos por vuelta */}
              <div className="mt-8 pt-8 border-t border-electric-blue/20">
                <div className="mb-6">
                  <h3 className="text-2xl font-racing text-electric-blue mb-2">⏱️ EVOLUCIÓN DE TIEMPOS</h3>
                  <p className="text-gray-400 text-sm">Tiempos por vuelta de cada piloto</p>
                </div>

                <div className="bg-racing-black/40 border border-electric-blue/20 rounded-lg p-6">
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart
                      data={(() => {
                        // Preparar datos para el gráfico de tiempos
                        if (raceResults.length === 0) return [];

                        // Obtener el número máximo de vueltas
                        const maxLaps = Math.max(...raceResults.map((d: any) => d.totalLaps || 0));

                        // Crear un objeto para cada vuelta
                        const chartData = [];
                        for (let lapNum = 1; lapNum <= maxLaps; lapNum++) {
                          const lapData: any = { vuelta: lapNum };

                          // Para cada piloto, encontrar su tiempo en esa vuelta
                          raceResults.forEach((driver: any) => {
                            const lap = driver.laps?.find((l: any) => l.lapNumber === lapNum);
                            if (lap && lap.time > 0) {
                              // Convertir milisegundos a segundos para mejor visualización
                              lapData[driver.driverName] = lap.time / 1000;
                            }
                          });

                          chartData.push(lapData);
                        }

                        return chartData;
                      })()}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis
                        dataKey="vuelta"
                        stroke="#0ea5e9"
                        label={{ value: 'Vuelta', position: 'insideBottom', offset: -5, fill: '#0ea5e9' }}
                      />
                      <YAxis
                        stroke="#0ea5e9"
                        label={{ value: 'Tiempo (segundos)', angle: -90, position: 'insideLeft', fill: '#0ea5e9' }}
                        domain={['auto', 'auto']}
                        tickFormatter={(value) => value.toFixed(1)}
                      />
                      <Legend
                        iconType="line"
                        onClick={(e: any) => {
                          // Toggle highlight: si ya está seleccionado, deseleccionar
                          if (highlightedDriverTimes === e.dataKey) {
                            setHighlightedDriverTimes(null);
                          } else {
                            setHighlightedDriverTimes(e.dataKey);
                          }
                        }}
                        wrapperStyle={{
                          paddingTop: '20px',
                          cursor: 'pointer'
                        }}
                        formatter={(value: string) => {
                          // Resaltar el nombre si está seleccionado
                          const isSelected = highlightedDriverTimes === value;
                          return (
                            <span style={{
                              fontWeight: isSelected ? 'bold' : 'normal',
                              fontSize: isSelected ? '1.1em' : '1em',
                              color: isSelected ? '#fff' : '#9ca3af',
                              textDecoration: isSelected ? 'underline' : 'none'
                            }}>
                              {value}
                            </span>
                          );
                        }}
                      />
                      {raceResults.map((driver: any, idx: number) => {
                        // Generar colores distintos para cada piloto (mismos colores que el gráfico anterior)
                        const colors = [
                          '#fbbf24', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6',
                          '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#a855f7',
                          '#f59e0b', '#dc2626', '#059669', '#2563eb', '#7c3aed',
                          '#db2777', '#0d9488', '#ea580c', '#0284c7', '#9333ea',
                          '#fcd34d', '#fca5a5', '#6ee7b7', '#93c5fd', '#c4b5fd',
                          '#fbcfe8', '#5eead4', '#fdba74', '#7dd3fc', '#d8b4fe'
                        ];

                        // Determinar opacidad basado en si está resaltado
                        const isHighlighted = highlightedDriverTimes === null || highlightedDriverTimes === driver.driverName;
                        const opacity = isHighlighted ? 1 : 0.2;
                        const strokeWidth = isHighlighted && highlightedDriverTimes === driver.driverName ? 4 : 2.5;

                        return (
                          <Line
                            key={driver.driverName}
                            type="monotone"
                            dataKey={driver.driverName}
                            stroke={colors[idx % colors.length]}
                            strokeWidth={strokeWidth}
                            strokeOpacity={opacity}
                            dot={{
                              r: isHighlighted && highlightedDriverTimes === driver.driverName ? 5 : 4,
                              strokeWidth: 2,
                              fill: colors[idx % colors.length],
                              fillOpacity: opacity,
                              cursor: 'pointer',
                              onClick: () => {
                                // Toggle highlight cuando se hace click en el punto
                                if (highlightedDriverTimes === driver.driverName) {
                                  setHighlightedDriverTimes(null);
                                } else {
                                  setHighlightedDriverTimes(driver.driverName);
                                }
                              }
                            }}
                            activeDot={false}
                            connectNulls={true}
                            onClick={() => {
                              // Toggle highlight cuando se hace click en la línea
                              if (highlightedDriverTimes === driver.driverName) {
                                setHighlightedDriverTimes(null);
                              } else {
                                setHighlightedDriverTimes(driver.driverName);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {/* Detalles del piloto seleccionado */}
          {!loading && selectedDriver && (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-racing text-electric-blue mb-1">
                    👤 {selectedDriver.driverName} - Análisis de Vueltas
                  </h3>
                  <p className="text-sm text-sky-blue/60">
                    Posición: {selectedDriver.finalPosition || selectedDriver.position} • Kart #{selectedDriver.kartNumber} • {selectedDriver.totalLaps} vueltas
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="text-electric-blue hover:text-cyan-400 font-bold"
                >
                  ← Volver a resultados
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-racing-black/40 border border-electric-blue/20 rounded-lg p-4">
                  <div className="text-sm text-sky-blue/60 mb-1">Mejor Vuelta</div>
                  <div className="text-2xl font-mono font-bold text-gold">
                    {formatTime(selectedDriver.bestTime)}
                  </div>
                </div>
                <div className="bg-racing-black/40 border border-electric-blue/20 rounded-lg p-4">
                  <div className="text-sm text-sky-blue/60 mb-1">Última Vuelta</div>
                  <div className="text-2xl font-mono font-bold text-electric-blue">
                    {formatTime(selectedDriver.lastTime)}
                  </div>
                </div>
                <div className="bg-racing-black/40 border border-electric-blue/20 rounded-lg p-4">
                  <div className="text-sm text-sky-blue/60 mb-1">Promedio</div>
                  <div className="text-2xl font-mono font-bold text-gray-300">
                    {formatTime(selectedDriver.averageTime)}
                  </div>
                </div>
              </div>

              {selectedDriver.laps && selectedDriver.laps.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-electric-blue/30">
                        <th className="text-left p-3 text-electric-blue">Vuelta</th>
                        <th className="text-right p-3 text-electric-blue">Tiempo</th>
                        <th className="text-center p-3 text-electric-blue">Posición</th>
                        <th className="text-right p-3 text-electric-blue">Gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDriver.laps
                        .sort((a: any, b: any) => a.lapNumber - b.lapNumber)
                        .map((lap: any, idx: number) => (
                          <tr
                            key={idx}
                            className={`border-b border-sky-blue/10 ${
                              lap.isPersonalBest ? 'bg-gold/10' : ''
                            }`}
                          >
                            <td className="p-3 text-white font-semibold">
                              Vuelta {lap.lapNumber}
                              {lap.isPersonalBest && <span className="ml-2 text-gold">⭐</span>}
                            </td>
                            <td className={`p-3 text-right font-mono font-bold ${
                              lap.isPersonalBest ? 'text-gold' : 'text-electric-blue'
                            }`}>
                              {formatTime(lap.time)}
                            </td>
                            <td className="p-3 text-center text-sky-blue">P{lap.finalPosition || lap.position}</td>
                            <td className="p-3 text-right text-gray-400">{lap.gapToLeader || '-'}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  No hay datos de vueltas individuales para este piloto
                </div>
              )}
            </>
          )}

          {!loading && raceResults.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p>No hay resultados de carrera disponibles</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gradient-to-r from-midnight to-slate-900 border-t border-green-500/30 p-4">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-electric-blue to-sky-blue text-midnight font-racing text-lg rounded-xl hover:from-sky-blue hover:to-electric-blue transition-all shadow-lg hover:shadow-electric-blue/50"
          >
            CERRAR
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RacesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-midnight via-racing-black to-midnight flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-electric-blue text-xl font-racing">Cargando...</p>
        </div>
      </div>
    }>
      <RacesPageContent />
    </Suspense>
  );
}
