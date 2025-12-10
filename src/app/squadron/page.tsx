'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import CreateSquadronModal from '@/components/CreateSquadronModal';
import SquadronSearchModal from '@/components/SquadronSearchModal';
import SquadronDashboardView from '@/components/SquadronDashboardView';
import MyInvitationsCard from '@/components/MyInvitationsCard';

interface Squadron {
  _id: string;
  squadronId: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
  };
  division: 'Elite' | 'Masters' | 'Pro' | 'Open';
  ranking: number;
  totalPoints: number;
  fairRacingAverage: number;
  members: Array<{
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      alias?: string;
    };
    role: string;
    joinedAt: string;
    currentScore: number;
    totalRacesClean: number;
  }>;
  stats: {
    memberCount: number;
    availableSpots: number;
    isFull: boolean;
    winRate: string;
    averageFairRacing: number;
  };
}

export default function SquadronDashboard() {
  const { user, token, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [hasSquadron, setHasSquadron] = useState(false);
  const [squadron, setSquadron] = useState<Squadron | null>(null);
  const [isCaptain, setIsCaptain] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [invitationsCount, setInvitationsCount] = useState(0);
  const [showInvitations, setShowInvitations] = useState(false);
  const [eventInvitations, setEventInvitations] = useState<any[]>([]);
  const [eventInvitationsLoading, setEventInvitationsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !token) {
      setLoading(false);
      return;
    }
    fetchMySquadron();
    fetchInvitationsCount();
    fetchEventInvitations();
  }, [user, token, authLoading]);

  const fetchInvitationsCount = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/squadron/my-invitations', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setInvitationsCount(data.invitations?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  };

  const fetchMySquadron = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch('/api/squadron/my-squadron', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setHasSquadron(data.hasSquadron);
        setSquadron(data.squadron || null);
        setIsCaptain(data.isCaptain || false);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventInvitations = async () => {
    if (!token) return;
    try {
      setEventInvitationsLoading(true);
      const response = await fetch('/api/squadron-events/my-invitations', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setEventInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error('Error fetching event invitations:', error);
    } finally {
      setEventInvitationsLoading(false);
    }
  };

  const handleEventInvitationResponse = async (invitationId: string, eventId: string, action: 'accept' | 'decline') => {
    try {
      const response = await fetch(`/api/squadron-events/${eventId}/respond-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ invitationId, action }),
      });

      const data = await response.json();
      if (data.success) {
        alert(action === 'accept' ? '¡Te has unido al evento!' : 'Invitación rechazada');
        fetchEventInvitations(); // Refresh event invitations
      } else {
        alert(data.error || 'Error al procesar la invitación');
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
      alert('Error al procesar la invitación');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-electric-blue mx-auto"></div>
            <p className="mt-4 text-electric-blue font-digital">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-3xl font-racing text-electric-blue mb-4">ACCESO RESTRINGIDO</h2>
            <p className="text-sky-blue mb-6">Debes iniciar sesión</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(0, 212, 255, 0.1) 2px, transparent 2px)', backgroundSize: '100px 100px'}} />
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-2xl animate-pulse"></div>
      </div>
      <Navbar />
      <div className="relative z-10">
        <div className="border-b border-electric-blue/30 bg-gradient-to-r from-midnight via-rb-blue/10 to-midnight">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-racing text-electric-blue tracking-wider">SQUADRON COMMAND</h1>
                <p className="text-sky-blue/80 mt-2">Sistema de Escuderías</p>
              </div>
              {!hasSquadron && (
                <button
                  onClick={() => setShowInvitations(!showInvitations)}
                  className={`px-6 py-3 border-2 font-racing rounded-lg transition-all ${
                    invitationsCount > 0
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 hover:bg-purple-500/30 animate-pulse'
                      : 'bg-midnight/50 border-electric-blue/30 text-sky-blue/70 hover:border-electric-blue/50'
                  }`}
                >
                  📨 INVITACIONES RECIBIDAS ({invitationsCount})
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!hasSquadron ? (
            <div className="space-y-6">
              {/* Invitations Card */}
              {showInvitations && (
                <MyInvitationsCard
                  token={token || ''}
                  onAccept={() => {
                    fetchMySquadron();
                    fetchInvitationsCount();
                    setShowInvitations(false);
                  }}
                />
              )}

              <div className="bg-gradient-to-br from-midnight via-rb-blue/20 to-midnight border-2 border-electric-blue/50 rounded-xl p-8 text-center">
                <div className="mb-6">
                  <h2 className="text-3xl font-racing text-electric-blue mb-2">SIN ESCUDERÍA</h2>
                  <p className="text-sky-blue/80">No perteneces a ninguna escudería</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="group relative px-8 py-6 bg-gradient-to-r from-electric-blue to-cyan-400 text-midnight font-racing text-xl rounded-lg hover:shadow-lg hover:shadow-electric-blue/50 transition-all"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-electric-blue opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                    <div className="relative">
                      🏁 CREAR NUEVA ESCUDERÍA
                    </div>
                  </button>

                  <button
                    onClick={() => setIsSearchModalOpen(true)}
                    className="px-8 py-6 border-2 border-electric-blue/50 text-electric-blue font-racing text-xl rounded-lg hover:bg-electric-blue/10 transition-all"
                  >
                    🔍 BUSCAR ESCUDERÍAS
                  </button>
                </div>

                <div className="mt-8 grid md:grid-cols-3 gap-4 text-left">
                  <div className="p-4 bg-midnight/50 border border-electric-blue/20 rounded-lg">
                    <p className="text-electric-blue font-digital text-sm mb-1">👥 EQUIPO</p>
                    <p className="text-sky-blue/70 text-xs">Forma un equipo de 2-4 pilotos</p>
                  </div>
                  <div className="p-4 bg-midnight/50 border border-electric-blue/20 rounded-lg">
                    <p className="text-electric-blue font-digital text-sm mb-1">🏆 COMPETICIÓN</p>
                    <p className="text-sky-blue/70 text-xs">Compite en 4 divisiones</p>
                  </div>
                  <div className="p-4 bg-midnight/50 border border-electric-blue/20 rounded-lg">
                    <p className="text-electric-blue font-digital text-sm mb-1">⚡ FAIR RACING</p>
                    <p className="text-sky-blue/70 text-xs">Mantén un puntaje limpio</p>
                  </div>
                </div>
              </div>
            </div>
          ) : squadron ? (
            <>
              {/* Event Invitations Section */}
              {!eventInvitationsLoading && eventInvitations.length > 0 && (
                <div className="bg-gradient-to-br from-purple-900/40 via-purple-800/30 to-purple-900/40 border-2 border-purple-500/50 rounded-xl p-6 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-3xl">🏆</span>
                    <h2 className="text-2xl font-racing text-purple-400">
                      INVITACIONES A EVENTOS DE CAMPEONATO
                    </h2>
                    <span className="px-3 py-1 bg-purple-500/30 border border-purple-400/50 text-purple-300 rounded-full text-sm font-racing">
                      {eventInvitations.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {eventInvitations.map((invitation) => (
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
                              onClick={() => handleEventInvitationResponse(invitation.invitationId, invitation.eventId, 'accept')}
                              className="px-4 py-2 bg-green-600/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-600/30 transition-all font-racing"
                            >
                              ✓ ACEPTAR
                            </button>
                            <button
                              onClick={() => handleEventInvitationResponse(invitation.invitationId, invitation.eventId, 'decline')}
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

              <SquadronDashboardView
                squadron={squadron}
                isCaptain={isCaptain}
                onLeave={() => fetchMySquadron()}
                onTransferCaptain={() => fetchMySquadron()}
                token={token || ''}
              />

              {/* Recent Results */}
              {squadron && (
                <SquadronRecentResults
                  squadronId={squadron._id}
                  token={token || ''}
                />
              )}
            </>
          ) : null}
        </div>
      </div>

      <CreateSquadronModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchMySquadron();
          setIsCreateModalOpen(false);
        }}
        token={token || ''}
      />

      <SquadronSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onJoinSuccess={() => {
          fetchMySquadron();
          setIsSearchModalOpen(false);
        }}
        token={token || ''}
      />
    </div>
  );
}

// Squadron Recent Results Component
function SquadronRecentResults({ squadronId, token }: { squadronId: string; token: string }) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentResults();
  }, [squadronId]);

  const fetchRecentResults = async () => {
    try {
      const response = await fetch(`/api/squadron/${squadronId}/recent-results`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error('Error fetching recent results:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-midnight via-purple-900/20 to-midnight border-2 border-purple-500/50 rounded-xl p-8 mt-8">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🏁</div>
          <p className="text-sky-blue/70">Cargando resultados...</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-gradient-to-br from-midnight via-purple-900/20 to-midnight border-2 border-purple-500/50 rounded-xl p-8 mt-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">📊</span>
          <h2 className="text-2xl font-racing text-purple-400">ÚLTIMOS RESULTADOS</h2>
        </div>
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-gray-400">Aún no hay resultados registrados</p>
          <p className="text-sm text-gray-500 mt-2">
            Los resultados de campeonatos aparecerán aquí
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-midnight via-purple-900/20 to-midnight border-2 border-purple-500/50 rounded-xl p-8 mt-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">📊</span>
        <h2 className="text-2xl font-racing text-purple-400">ÚLTIMOS RESULTADOS</h2>
      </div>

      <div className="space-y-4">
        {results.map((result) => {
          const positionEmoji =
            result.position === 1 ? '🥇' :
            result.position === 2 ? '🥈' :
            result.position === 3 ? '🥉' :
            `${result.position}°`;

          return (
            <div
              key={result.eventId}
              className="bg-black/30 border border-purple-500/20 rounded-lg p-4 hover:bg-black/40 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white font-bold text-lg">{result.eventName}</h3>
                  </div>
                  <p className="text-sm text-gray-400">
                    {new Date(result.finalizedAt || result.eventDate).toLocaleDateString('es-CL', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-gray-500">{result.location}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl mb-1">{positionEmoji}</div>
                  <p className="text-electric-blue font-bold text-lg">
                    +{result.pointsEarned} pts
                  </p>
                  <p className="text-xs text-gray-400">
                    {result.position}° de {result.totalSquadrons}
                  </p>
                </div>
              </div>

              {/* Pilots who participated */}
              {result.pilots && result.pilots.length > 0 && (
                <div className="border-t border-purple-500/20 pt-3 mt-3">
                  <p className="text-xs text-gray-400 mb-2">Pilotos:</p>
                  <div className="flex flex-wrap gap-2">
                    {result.pilots.map((pilot: any, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded text-xs text-white"
                      >
                        {pilot.pilotId?.profile?.alias ||
                         `${pilot.pilotId?.profile?.firstName} ${pilot.pilotId?.profile?.lastName}` ||
                         'Piloto'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {results.length >= 10 && (
        <p className="text-center text-gray-500 text-sm mt-4">
          Mostrando los últimos 10 resultados
        </p>
      )}
    </div>
  );
}
