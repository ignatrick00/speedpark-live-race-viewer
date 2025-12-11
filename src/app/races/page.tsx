'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { EventCategoryConfig } from '@/types/squadron-events';
import { useRouter } from 'next/navigation';
import JoinEventModal from '@/components/JoinEventModal';
import Toast from '@/components/Toast';

type ViewMode = 'selection' | 'championships' | 'championships-upcoming' | 'championships-past' | 'friendly' | 'friendly-upcoming' | 'friendly-past' | 'friendly-create' | 'my-registered-events';

interface Participant {
  userId: string;
  kartNumber: number;
  name: string;
  joinedAt: Date;
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
}

export default function RacesPage() {
  const { user, token } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('selection');
  const [championshipRaces, setChampionshipRaces] = useState<Race[]>([]);
  const [friendlyRaces, setFriendlyRaces] = useState<Race[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(true);

  useEffect(() => {
    console.log('🔄 ViewMode changed to:', viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (token) {
      fetchRaces();
      fetchInvitations();
    }
  }, [token]);

  const fetchRaces = async () => {
    try {
      setIsLoading(true);

      // Fetch friendly races
      const friendlyResponse = await fetch('/api/races/friendly', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const friendlyData = await friendlyResponse.json();

      if (friendlyData.success) {
        setFriendlyRaces(friendlyData.races || []);
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
          />
        )}

        {viewMode === 'friendly-upcoming' && (
          <FriendlyUpcomingView
            races={friendlyRaces}
            isLoading={isLoading}
            onRefresh={fetchRaces}
          />
        )}

        {viewMode === 'friendly-past' && (
          <FriendlyPastView
            races={friendlyRaces}
            isLoading={isLoading}
            onRefresh={fetchRaces}
          />
        )}

        {viewMode === 'friendly-create' && (
          <FriendlyCreateView
            token={token}
            onBack={() => setViewMode('selection')}
            onSuccess={() => {
              fetchRaces();
              setViewMode('friendly-join');
            }}
          />
        )}

        {viewMode === 'my-registered-events' && (
          <MyRegisteredEventsView
            token={token}
            userId={user?.id}
          />
        )}
      </div>
    </div>
    </>
  );
}

// Selection View - Three big cards
function SelectionView({
  onSelectChampionships,
  onSelectFriendly,
  onSelectMyEvents,
}: {
  onSelectChampionships: () => void;
  onSelectFriendly: () => void;
  onSelectMyEvents: () => void;
}) {
  return (
    <div className="grid md:grid-cols-3 gap-6">
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
}: {
  onSelectUpcoming: () => void;
  onSelectPast: () => void;
  onSelectCreate: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {/* Próximas Carreras Card */}
        <button
          onClick={onSelectUpcoming}
          className="group relative bg-gradient-to-br from-midnight via-electric-blue/20 to-midnight border-2 border-electric-blue rounded-2xl p-10 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-electric-blue/50"
        >
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
}: {
  races: Race[];
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const { token, user } = useAuth();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);

  const handleJoinClick = (race: Race) => {
    setSelectedRace(race);
    setShowJoinModal(true);
  };

  const handleDeleteRace = async (raceId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta carrera?')) {
      return;
    }

    try {
      const response = await fetch(`/api/races/friendly/${raceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        alert('Carrera eliminada exitosamente');
        onRefresh();
      } else {
        alert(data.error || 'Error al eliminar la carrera');
      }
    } catch (error) {
      console.error('Error deleting race:', error);
      alert('Error al eliminar la carrera');
    }
  };

  const handleConfirmRace = async (raceId: string) => {
    if (!confirm('¿Confirmar esta carrera? Los participantes no podrán unirse después.')) {
      return;
    }

    try {
      const response = await fetch(`/api/races/friendly/${raceId}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        alert('Carrera confirmada exitosamente');
        onRefresh();
      } else {
        alert(data.error || 'Error al confirmar la carrera');
      }
    } catch (error) {
      console.error('Error confirming race:', error);
      alert('Error al confirmar la carrera');
    }
  };

  // Filter upcoming races only
  const upcomingRaces = races.filter(race => {
    const raceDate = new Date(race.date);
    const now = new Date();
    return raceDate >= now;
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
            onJoinClick={() => handleJoinClick(race)}
            onDeleteClick={() => handleDeleteRace(race._id)}
            onConfirmClick={() => handleConfirmRace(race._id)}
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
    </>
  );
}

// Friendly Past View
function FriendlyPastView({
  races,
  isLoading,
  onRefresh,
}: {
  races: Race[];
  isLoading: boolean;
  onRefresh: () => void;
}) {
  // Filter past races only
  const pastRaces = races.filter(race => {
    const raceDate = new Date(race.date);
    const now = new Date();
    return raceDate < now;
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
          NO HAY CARRERAS PASADAS
        </h3>
        <p className="text-sky-blue/70 mb-6">
          Aún no se han completado carreras amistosas
        </p>
      </div>
    );
  }

  return (
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
        />
      ))}
    </div>
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

  const handleJoinClick = (race: Race) => {
    setSelectedRace(race);
    setShowJoinModal(true);
  };

  const handleDeleteRace = async (raceId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta carrera?')) {
      return;
    }

    try {
      const response = await fetch(`/api/races/friendly/${raceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        alert('Carrera eliminada exitosamente');
        onRefresh();
      } else {
        alert(data.error || 'Error al eliminar la carrera');
      }
    } catch (error) {
      console.error('Error deleting race:', error);
      alert('Error al eliminar la carrera');
    }
  };

  const handleConfirmRace = async (raceId: string) => {
    if (!confirm('¿Confirmar esta carrera? Los participantes no podrán unirse después.')) {
      return;
    }

    try {
      const response = await fetch(`/api/races/friendly/${raceId}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        alert('Carrera confirmada exitosamente');
        onRefresh();
      } else {
        alert(data.error || 'Error al confirmar la carrera');
      }
    } catch (error) {
      console.error('Error confirming race:', error);
      alert('Error al confirmar la carrera');
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
            onDeleteClick={() => handleDeleteRace(race._id)}
            onConfirmClick={() => handleConfirmRace(race._id)}
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
    </>
  );
}

// Friendly Create View
function FriendlyCreateView({
  token,
  onBack,
  onSuccess,
}: {
  token: string | null;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [raceName, setRaceName] = useState('');
  const [selectedKart, setSelectedKart] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<'form' | 'kart'>('form'); // Paso 1: formulario, Paso 2: selección de kart

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

  // Generar bloques horarios de 12:00 a 22:00 (10 PM)
  const timeSlots = [
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00'
  ];

  const handleCreateRace = async () => {
    if (!raceName.trim() || !selectedDate || !selectedTime || !selectedKart) {
      alert('Por favor completa todos los campos y selecciona tu kart');
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
          kartNumber: selectedKart,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('¡Carrera creada exitosamente! Serás redirigido a las carreras disponibles.');
        onSuccess();
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
          ✨ CREAR CARRERA AMISTOSA {step === 'kart' && '- SELECCIONA TU KART'}
        </h3>

        {/* PASO 1: Formulario */}
        {step === 'form' && (
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

        {/* Date Selection */}
        <div className="mb-8">
          <label className="block text-electric-blue font-racing text-lg mb-3">
            📅 SELECCIONA LA FECHA
          </label>
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
        </div>

        {/* Time Selection */}
        {selectedDate && (
          <div className="mb-8">
            <label className="block text-electric-blue font-racing text-lg mb-3">
              🕐 SELECCIONA LA HORA
            </label>
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

        {/* Botones Paso 1 */}
        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="flex-1 px-6 py-3 border-2 border-sky-blue/50 text-sky-blue rounded-lg hover:bg-sky-blue/10 transition-all"
          >
            CANCELAR
          </button>
          <button
            onClick={() => setStep('kart')}
            disabled={!raceName || !selectedDate || !selectedTime}
            style={{
              backgroundColor: raceName && selectedDate && selectedTime ? '#FFD700' : '#333',
              color: raceName && selectedDate && selectedTime ? '#0a0a15' : '#666',
              cursor: !raceName || !selectedDate || !selectedTime ? 'not-allowed' : 'pointer',
            }}
            className="flex-1 px-6 py-3 font-racing rounded-lg transition-all shadow-lg"
          >
            SIGUIENTE →
          </button>
        </div>
          </>
        )}

        {/* PASO 2: Selección de Kart */}
        {step === 'kart' && (
          <>
        {/* Kart Selection Grid */}
        <div className="mb-8">
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 20 }, (_, i) => i + 1).map((kartNum) => {
              const isSelected = selectedKart === kartNum;
              return (
                <button
                  key={kartNum}
                  onClick={() => setSelectedKart(kartNum)}
                  type="button"
                  style={{
                    backgroundImage: isSelected
                      ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.5), rgba(255, 215, 0, 0.3)), url(/images/Friendly-races/kart.png)'
                      : 'linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(14, 165, 233, 0.2)), url(/images/Friendly-races/kart.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                  className={`p-3 rounded-lg border-3 transition-all relative ${
                    isSelected
                      ? 'border-gold shadow-lg shadow-gold/50 scale-105'
                      : 'border-electric-blue/30 hover:border-electric-blue hover:scale-105'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-0 left-0 right-0 bg-gold text-midnight text-xs font-bold py-1 text-center z-40">
                      ⭐ SELECCIONADO
                    </div>
                  )}
                  <div className="text-center relative z-10 mt-3">
                    <p className="text-xs mb-1 font-bold text-sky-blue/70">KART</p>
                    <p className={`text-3xl font-bold font-digital drop-shadow-lg ${
                      isSelected ? 'text-gold' : 'text-electric-blue'
                    }`}
                    style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
                    >
                      #{kartNum}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Resumen con kart seleccionado */}
        {selectedKart && (
          <div className="mb-8 p-4 bg-gold/10 border border-gold/30 rounded-lg">
            <h4 className="text-gold font-racing mb-2">✓ RESUMEN FINAL</h4>
            <div className="text-sky-blue/90 space-y-1">
              <p><span className="text-sky-blue/50">Carrera:</span> {raceName}</p>
              <p><span className="text-sky-blue/50">Fecha:</span> {selectedDate?.toLocaleDateString('es-CL')}</p>
              <p><span className="text-sky-blue/50">Hora:</span> {selectedTime}</p>
              <p><span className="text-sky-blue/50">Tu Kart:</span> <span className="text-gold font-bold text-xl">#{selectedKart}</span></p>
            </div>
          </div>
        )}

        {/* Botones Paso 2 */}
        <div className="flex gap-4">
          <button
            onClick={() => setStep('form')}
            disabled={isCreating}
            className="flex-1 px-6 py-3 border-2 border-sky-blue/50 text-sky-blue rounded-lg hover:bg-sky-blue/10 transition-all disabled:opacity-50"
          >
            ← ATRÁS
          </button>
          <button
            onClick={handleCreateRace}
            disabled={!selectedKart || isCreating}
            style={{
              backgroundColor: selectedKart && !isCreating ? '#FFD700' : '#333',
              color: selectedKart && !isCreating ? '#0a0a15' : '#666',
              cursor: !selectedKart || isCreating ? 'not-allowed' : 'pointer',
            }}
            className="flex-1 px-6 py-3 font-racing rounded-lg transition-all shadow-lg"
          >
            {isCreating ? 'CREANDO...' : '✓ CONFIRMAR Y CREAR'}
          </button>
        </div>
          </>
        )}
      </div>
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
  const [selectedKart, setSelectedKart] = useState<number | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [occupiedKarts, setOccupiedKarts] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOccupiedKarts();
  }, []);

  const fetchOccupiedKarts = async () => {
    try {
      console.log('🔍 Fetching participants for race:', race._id);
      console.log('🔑 Token exists:', !!token);

      const response = await fetch(`/api/races/friendly/${race._id}/participants`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      console.log('📡 Participants response status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error('❌ Participants response error:', text);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      console.log('📦 Participants data:', data);

      if (data.success) {
        const karts = data.participants.map((p: any) => p.kartNumber).filter(Boolean);
        setOccupiedKarts(karts);
      }
    } catch (error) {
      console.error('Error fetching occupied karts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!selectedKart) {
      alert('Por favor selecciona un kart');
      return;
    }

    if (!token) {
      alert('No estás autenticado');
      return;
    }

    setIsJoining(true);
    try {
      console.log('🏁 Intentando unirse a carrera:', race._id, 'con kart:', selectedKart);
      const response = await fetch(`/api/races/friendly/${race._id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ kartNumber: selectedKart }),
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error('❌ Join response error (raw):', text);
        alert(`Error al unirse: ${response.status} - ${text.substring(0, 100)}`);
        setIsJoining(false);
        return;
      }

      const data = await response.json();
      console.log('📦 Response data:', data);

      if (data.success) {
        // Actualizar lista de karts ocupados antes de cerrar
        setOccupiedKarts([...occupiedKarts, selectedKart]);
        alert('¡Te has unido a la carrera exitosamente!');
        onSuccess();
      } else {
        alert(data.error || 'Error al unirse a la carrera');
      }
    } catch (error) {
      console.error('❌ Error joining race:', error);
      alert('Error al unirse a la carrera: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsJoining(false);
    }
  };

  const karts = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl bg-gradient-to-br from-midnight via-electric-blue/20 to-midnight border-2 border-electric-blue/50 rounded-xl p-8">
        <h3 className="text-3xl font-racing text-electric-blue mb-2 text-center">
          🏎️ SELECCIONA TU KART
        </h3>
        <p className="text-sky-blue/70 text-center mb-6">
          {race.name}
        </p>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-2">⚙️</div>
            <p className="text-sky-blue/70">Cargando karts...</p>
          </div>
        ) : (
          <>
            {/* Kart Grid */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              {karts.map((kartNumber) => {
                const isOccupied = occupiedKarts.includes(kartNumber);
                const isSelected = selectedKart === kartNumber;

                return (
                  <button
                    key={kartNumber}
                    onClick={() => !isOccupied && setSelectedKart(kartNumber)}
                    disabled={isOccupied}
                    style={{
                      backgroundImage: isOccupied
                        ? 'linear-gradient(135deg, rgba(127, 29, 29, 0.7), rgba(153, 27, 27, 0.6)), url(/images/Friendly-races/kart.png)'
                        : isSelected
                        ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.5), rgba(255, 215, 0, 0.3)), url(/images/Friendly-races/kart.png)'
                        : 'linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(14, 165, 233, 0.2)), url(/images/Friendly-races/kart.png)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                    className={`p-4 rounded-lg border-4 transition-all relative overflow-hidden ${
                      isOccupied
                        ? 'border-red-500 cursor-not-allowed'
                        : isSelected
                        ? 'border-gold shadow-lg shadow-gold/50 scale-105'
                        : 'border-electric-blue/30 hover:border-electric-blue hover:scale-105'
                    }`}
                  >
                    {/* OCUPADO - Badge grande */}
                    {isOccupied && (
                      <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-xs font-bold py-1 text-center z-40">
                        ❌ OCUPADO
                      </div>
                    )}

                    {/* DISPONIBLE - Badge grande */}
                    {!isOccupied && !isSelected && (
                      <div className="absolute top-0 left-0 right-0 bg-green-600 text-white text-xs font-bold py-1 text-center z-40">
                        ✅ DISPONIBLE
                      </div>
                    )}

                    {/* SELECCIONADO - Badge grande */}
                    {isSelected && (
                      <div className="absolute top-0 left-0 right-0 bg-gold text-midnight text-xs font-bold py-1 text-center z-40">
                        ⭐ SELECCIONADO
                      </div>
                    )}

                    {/* Número del kart */}
                    <div className="text-center relative z-10 mt-4">
                      <p className="text-xs mb-1 font-bold text-sky-blue/70">KART</p>
                      <p className={`text-5xl font-bold font-digital drop-shadow-lg ${
                        isOccupied ? 'text-red-400' : isSelected ? 'text-gold' : 'text-electric-blue'
                      }`}
                      style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
                      >
                        #{kartNumber}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 mb-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-electric-blue/30 border border-electric-blue rounded"></div>
                <span className="text-sky-blue/70">Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gold/30 border border-gold rounded"></div>
                <span className="text-sky-blue/70">Seleccionado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-900/20 border border-red-500/50 rounded"></div>
                <span className="text-sky-blue/70">Ocupado</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={onClose}
                disabled={isJoining}
                className="flex-1 px-6 py-3 border-2 border-sky-blue/50 text-sky-blue rounded-lg hover:bg-sky-blue/10 transition-all disabled:opacity-50"
              >
                CANCELAR
              </button>
              <button
                onClick={handleJoin}
                disabled={!selectedKart || isJoining}
                style={{
                  backgroundColor: selectedKart && !isJoining ? '#FFD700' : '#333',
                  color: selectedKart && !isJoining ? '#0a0a15' : '#666',
                  cursor: !selectedKart || isJoining ? 'not-allowed' : 'pointer',
                }}
                className="flex-1 px-6 py-3 font-racing rounded-lg transition-all shadow-lg"
              >
                {isJoining ? 'UNIÉNDOTE...' : 'CONFIRMAR'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Race Card Component
function RaceCard({
  race,
  currentUserId,
  onJoinClick,
  onDeleteClick,
  onConfirmClick,
}: {
  race: Race;
  currentUserId?: string;
  onJoinClick?: () => void;
  onDeleteClick?: () => void;
  onConfirmClick?: () => void;
}) {
  const isChampionship = race.type === 'championship';
  const isCreator = currentUserId && race.organizerId === currentUserId;
  const isParticipant = currentUserId && race.participantsList?.some(
    (participant) => participant.userId === currentUserId
  );

  console.log('🔍 RaceCard Debug:', {
    raceName: race.name,
    organizerId: race.organizerId,
    currentUserId,
    isCreator,
    isParticipant,
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
        <div
          className={`px-3 py-1 rounded-lg text-xs font-racing ${
            isChampionship
              ? 'bg-cyan-400/20 text-cyan-400'
              : 'bg-electric-blue/20 text-electric-blue'
          }`}
        >
          {isChampionship ? '🏆 CAMPEONATO' : '🤝 AMISTOSA'}
        </div>
      </div>

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
                className="flex items-center justify-between text-sm"
              >
                <span className="text-sky-blue flex items-center gap-2">
                  <span className="text-gold font-digital">#{participant.kartNumber}</span>
                  <span>{participant.name}</span>
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
              <button
                onClick={onConfirmClick}
                className="px-3 py-2 rounded-lg font-racing transition-all bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-600/30 text-sm"
              >
                ✓ CONFIRMAR
              </button>
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

          {/* Botón de unirse/unido (solo si NO es el creador) */}
          {!isCreator && onJoinClick && (
            <button
              onClick={isParticipant ? undefined : onJoinClick}
              disabled={isParticipant}
              className={`px-4 py-2 rounded-lg font-racing transition-all ${
                isParticipant
                  ? 'bg-green-600/20 border border-green-500/50 text-green-400 cursor-not-allowed'
                  : 'bg-electric-blue/20 border border-electric-blue/50 text-electric-blue hover:bg-electric-blue/30'
              }`}
            >
              {isParticipant ? '✓ UNIDO' : 'UNIRME'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// My Registered Events View
function MyRegisteredEventsView({ token, userId }: { token: string; userId?: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unregisteringEventId, setUnregisteringEventId] = useState<string | null>(null);
  const [showUnregisterConfirm, setShowUnregisterConfirm] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    fetchMyEvents();
  }, []);

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

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin text-6xl mb-4">🏁</div>
        <p className="text-sky-blue/70">Cargando tus carreras...</p>
      </div>
    );
  }

  if (events.length === 0) {
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
      {events.map((event) => (
        <SquadronEventCard
          key={event._id}
          event={event}
          showUnregisterButton={true}
          onUnregister={(e) => handleUnregisterClick(event._id, e)}
          isUnregistering={unregisteringEventId === event._id}
        />
      ))}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Unregister Confirmation Modal */}
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
            <div className="text-center text-gray-400 py-12">Cargando resultados...</div>
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
                          <span className={`text-lg font-bold ${getPositionColor(driver.position)}`}>
                            {getMedalEmoji(driver.position) || `#${driver.position}`}
                          </span>
                        </td>
                        <td className="p-3 text-white font-semibold">{driver.driverName}</td>
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
                    Posición: {selectedDriver.position} • Kart #{selectedDriver.kartNumber} • {selectedDriver.totalLaps} vueltas
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
                            <td className="p-3 text-center text-sky-blue">P{lap.position}</td>
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

