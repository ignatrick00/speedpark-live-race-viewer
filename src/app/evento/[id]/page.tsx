'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import Toast from '@/components/Toast';
import { EventCategoryConfig, EventCategory } from '@/types/squadron-events';

export default function EventoPage() {
  const router = useRouter();
  const params = useParams();
  const { token, user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myParticipation, setMyParticipation] = useState<any>(null);
  const [squadron, setSquadron] = useState<any>(null);
  const [availableTeammates, setAvailableTeammates] = useState<any[]>([]);
  const [selectedTeammate, setSelectedTeammate] = useState<any>(null);
  const [inviting, setInviting] = useState(false);
  const [showKartModal, setShowKartModal] = useState(false);
  const [selectedKart, setSelectedKart] = useState<number | null>(null);
  const [occupiedKarts, setOccupiedKarts] = useState<number[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [unregistering, setUnregistering] = useState(false);
  const [hasUnregistered, setHasUnregistered] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showUnregisterConfirm, setShowUnregisterConfirm] = useState(false);

  useEffect(() => {
    if (token && params.id) {
      fetchEvent();
    }
  }, [token, params.id]);

  // Filter available teammates when myParticipation or squadron changes
  useEffect(() => {
    if (myParticipation && squadron) {
      const confirmedIds = myParticipation.confirmedPilots.map((p: any) =>
        p.pilotId?._id?.toString() || p.pilotId?.toString()
      );
      const invitedIds = myParticipation.pendingInvitations
        .filter((inv: any) => inv.status === 'pending')
        .map((inv: any) => inv.pilotId?._id?.toString() || inv.pilotId?.toString());

      const available = squadron.members.filter((member: any) => {
        const memberId = member._id?.toString();
        return !confirmedIds.includes(memberId) && !invitedIds.includes(memberId);
      });
      setAvailableTeammates(available);
    }
  }, [myParticipation, squadron]);

  // Countdown timer for registration deadline
  useEffect(() => {
    if (!event?.registrationDeadline) return;

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const deadline = new Date(event.registrationDeadline).getTime();
      const distance = deadline - now;

      if (distance < 0) {
        setTimeRemaining('Inscripciones cerradas');
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [event]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/squadron-events/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEvent(data.event);

        // Find user's squadron participation
        const userSquadronId = (user as any)?.squadron?.squadronId;
        const participation = data.event.participants?.find(
          (p: any) => p.squadronId?._id?.toString() === userSquadronId?.toString() || p.squadronId?.toString() === userSquadronId?.toString()
        );
        setMyParticipation(participation);
      }

      // Fetch occupied karts
      const kartsResponse = await fetch(`/api/squadron-events/${params.id}/occupied-karts`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (kartsResponse.ok) {
        const kartsData = await kartsResponse.json();
        setOccupiedKarts(kartsData.occupiedKarts || []);
      }

      // Fetch squadron members
      const squadronResponse = await fetch('/api/squadron/my-squadron', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (squadronResponse.ok) {
        const squadronData = await squadronResponse.json();
        if (squadronData.squadron) {
          setSquadron(squadronData.squadron);
        }
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenKartModal = () => {
    if (!selectedTeammate) {
      alert('Selecciona un compañero de equipo');
      return;
    }
    setShowKartModal(true);
  };

  const handleConfirmInvite = async () => {
    if (!selectedKart) {
      alert('Selecciona un kart para tu compañero');
      return;
    }

    if (!selectedTeammate) {
      alert('Selecciona un compañero');
      return;
    }

    setInviting(true);
    try {
      const response = await fetch(`/api/squadron-events/${params.id}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: selectedTeammate.email,
          kartNumber: selectedKart
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setToast({
          message: 'Invitación enviada exitosamente. Tu compañero tiene 2 horas para aceptar.',
          type: 'success'
        });
        setSelectedTeammate(null);
        setSelectedKart(null);
        setShowKartModal(false);
        fetchEvent();
      } else {
        setToast({
          message: data.error || 'Error al enviar invitación',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error inviting teammate:', error);
      setToast({
        message: 'Error al enviar invitación',
        type: 'error'
      });
    } finally {
      setInviting(false);
    }
  };

  const handleUnregisterClick = () => {
    setShowUnregisterConfirm(true);
  };

  const handleConfirmUnregister = async () => {
    setShowUnregisterConfirm(false);
    setUnregistering(true);

    try {
      const response = await fetch(`/api/squadron-events/${params.id}/unregister`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setToast({
          message: 'Te has desregistrado exitosamente del evento',
          type: 'success'
        });
        setHasUnregistered(true);
        fetchEvent();
      } else {
        setToast({
          message: data.error || 'Error al desregistrarse',
          type: 'error'
        });
        setUnregistering(false);
      }
    } catch (error) {
      console.error('Error unregistering:', error);
      setToast({
        message: 'Error al desregistrarse del evento',
        type: 'error'
      });
      setUnregistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-purple-400">Cargando evento...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-red-400 text-xl mb-4">Evento no encontrado</p>
            <button
              onClick={() => router.push('/races')}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  const config = EventCategoryConfig[event.category as EventCategory];
  const totalSlots = event.maxPilotsPerSquadron;
  const confirmedPilots = myParticipation?.confirmedPilots?.length || 0;
  const pendingInvites = myParticipation?.pendingInvitations?.filter((inv: any) => inv.status === 'pending').length || 0;
  const availableSlots = totalSlots - confirmedPilots - pendingInvites;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/races')}
            className="text-purple-400 hover:text-purple-300 mb-4 flex items-center gap-2"
          >
            ← Volver a carreras
          </button>

          <div className={`bg-gradient-to-r ${config.color}/10 border border-white/10 rounded-2xl p-8`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-purple-400 font-bold mb-2">{config.name}</p>
                <h1 className="text-4xl font-bold text-white mb-2">{event.name}</h1>
                {event.description && (
                  <p className="text-gray-400">{event.description}</p>
                )}
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                myParticipation ? 'bg-green-600/20 text-green-400 border border-green-500/50' : 'bg-gray-700 text-white'
              }`}>
                {myParticipation ? '✓ REGISTRADO' : event.status}
              </span>
            </div>

            {/* Registration Deadline Timer */}
            {!myParticipation && timeRemaining && (
              <div className={`mt-6 p-4 rounded-xl border-2 ${
                timeRemaining === 'Inscripciones cerradas'
                  ? 'bg-red-900/20 border-red-500'
                  : 'bg-yellow-900/20 border-yellow-500 animate-pulse'
              }`}>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl">⏰</span>
                  <div>
                    <p className="text-xs text-gray-400 uppercase">Cierre de Inscripciones</p>
                    <p className={`text-2xl font-racing font-bold ${
                      timeRemaining === 'Inscripciones cerradas' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {timeRemaining}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-black/30 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Puntos Ganador</p>
                <p className="text-2xl font-bold text-purple-400">{config.points}</p>
              </div>
              <div className="bg-black/30 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">📅 Fecha</p>
                <p className="text-lg font-bold">{new Date(event.eventDate).toLocaleDateString('es-CL')}</p>
              </div>
              <div className="bg-black/30 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">🕐 Hora</p>
                <p className="text-2xl font-bold text-electric-blue">{event.eventTime || '19:00'}</p>
              </div>
              <div className="bg-black/30 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">⏱️ Duración</p>
                <p className="text-lg font-bold">{event.duration ? `${Math.floor(event.duration / 60)}h ${event.duration % 60}min` : '90min'}</p>
              </div>
              <div className="bg-black/30 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">📍 Ubicación</p>
                <p className="text-lg font-bold">{event.location}</p>
              </div>
              <div className="bg-black/30 p-4 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">🏁 Escuderías</p>
                <p className="text-lg font-bold">{event.participants?.length || 0}/{event.maxSquadrons}</p>
              </div>
            </div>
          </div>
        </div>

        {/* My Team Section */}
        {myParticipation && (
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-racing text-purple-400">Mi Equipo</h3>
              {!hasUnregistered && (
                <button
                  onClick={handleUnregisterClick}
                  disabled={unregistering}
                  className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 text-sm font-bold"
                >
                  {unregistering ? '⏳ DESREGISTRANDO...' : '❌ DESREGISTRARSE'}
                </button>
              )}
            </div>

            {/* Team Status */}
            <div className="bg-black/30 border border-purple-500/30 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-400">Confirmados</p>
                  <p className="text-2xl font-racing text-green-400">{confirmedPilots}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Pendientes</p>
                  <p className="text-2xl font-racing text-yellow-400">{pendingInvites}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Disponibles</p>
                  <p className="text-2xl font-racing text-purple-400">{availableSlots}</p>
                </div>
              </div>
            </div>

            {/* Confirmed Pilots */}
            <div className="mb-6">
              <h4 className="text-lg font-racing text-white mb-3">Pilotos Confirmados</h4>
              <div className="space-y-2">
                {myParticipation.confirmedPilots?.map((pilot: any, index: number) => (
                  <div key={index} className="flex items-center justify-between bg-black/30 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500/30 to-green-700/30 rounded-full flex items-center justify-center border border-green-500/50">
                        <span className="text-lg">✓</span>
                      </div>
                      <div>
                        <p className="text-white font-racing">{pilot.pilotId?.profile?.alias || `${pilot.pilotId?.profile?.firstName} ${pilot.pilotId?.profile?.lastName}`}</p>
                        <p className="text-sm text-gray-400">{pilot.pilotId?.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Invitations */}
            {pendingInvites > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-racing text-white mb-3">Invitaciones Pendientes</h4>
                <div className="space-y-2">
                  {myParticipation.pendingInvitations?.filter((inv: any) => inv.status === 'pending').map((inv: any, index: number) => (
                    <div key={index} className="flex items-center justify-between bg-black/30 p-4 rounded-lg border border-yellow-500/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-500/30 to-yellow-700/30 rounded-full flex items-center justify-center border border-yellow-500/50">
                          <span className="text-lg">⏳</span>
                        </div>
                        <div>
                          <p className="text-white font-racing">{inv.pilotId?.profile?.alias || `${inv.pilotId?.profile?.firstName} ${inv.pilotId?.profile?.lastName}`}</p>
                          <p className="text-sm text-yellow-400">Expira: {new Date(inv.expiresAt).toLocaleString('es-CL')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invite Teammate */}
            {availableSlots > 0 && (
              <div>
                <h4 className="text-lg font-racing text-white mb-3">Invitar Compañero</h4>
                {availableTeammates.length === 0 ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
                    <p className="text-yellow-400">No hay compañeros disponibles para invitar</p>
                    <p className="text-sm text-gray-400 mt-1">Todos los miembros ya están confirmados o tienen invitaciones pendientes</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      {availableTeammates.map((teammate) => (
                        <button
                          key={teammate._id}
                          onClick={() => setSelectedTeammate(teammate)}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            selectedTeammate?._id === teammate._id
                              ? 'border-purple-400 bg-purple-500/20'
                              : 'border-purple-500/30 bg-black/30 hover:border-purple-400/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500/30 to-purple-700/30 rounded-full flex items-center justify-center border border-purple-500/50">
                              <span className="text-lg">👤</span>
                            </div>
                            <div>
                              <p className="text-white font-racing">
                                {teammate.profile?.alias || `${teammate.profile?.firstName} ${teammate.profile?.lastName}`}
                              </p>
                              <p className="text-sm text-gray-400">{teammate.email}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleOpenKartModal}
                      disabled={inviting || !selectedTeammate}
                      className="w-full px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all disabled:opacity-50 font-racing"
                    >
                      {inviting ? 'ENVIANDO...' : selectedTeammate ? `📨 INVITAR A ${selectedTeammate.profile?.alias || selectedTeammate.profile?.firstName}` : '📨 SELECCIONA UN COMPAÑERO'}
                    </button>
                    <p className="text-sm text-gray-400 mt-2">
                      ⏱️ Las invitaciones expiran en 2 horas
                    </p>
                  </>
                )}
              </div>
            )}

            {availableSlots === 0 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                <p className="text-green-400">✓ Equipo completo</p>
              </div>
            )}
          </div>
        )}

        {/* Event Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-6">
            <h3 className="text-xl font-bold text-purple-400 mb-4">Requisitos</h3>
            <div className="space-y-3">
              {config.requiredRank ? (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  <span className="text-gray-300">Top {config.requiredRank} escuderías en ranking</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">✅</span>
                  <span className="text-green-400">Sin restricciones - Abierto a todos</span>
                </div>
              )}
              {config.mandatoryForTop && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  <span className="text-orange-400">Obligatorio para Top {config.mandatoryForTop}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-2xl">📅</span>
                <span className="text-gray-300">{config.frequencyPerYear} eventos por año</span>
              </div>
            </div>
          </div>

          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-6">
            <h3 className="text-xl font-bold text-purple-400 mb-4">Escuderías Registradas</h3>
            <p className="text-3xl font-racing text-white mb-2">{event.participants?.length || 0} / {event.maxSquadrons}</p>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${((event.participants?.length || 0) / event.maxSquadrons) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Kart Selection Modal */}
      {showKartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl bg-gradient-to-br from-midnight via-purple-500/20 to-midnight border-2 border-purple-500/50 rounded-xl p-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setShowKartModal(false);
                setSelectedKart(null);
              }}
              className="absolute top-4 right-4 text-purple-400 hover:text-white transition-colors text-2xl z-10"
            >
              ✕
            </button>

            <h3 className="text-3xl font-racing text-purple-400 mb-2 text-center">
              🏎️ SELECCIONA KART PARA TU COMPAÑERO
            </h3>
            <p className="text-sky-blue/70 text-center mb-6">
              {selectedTeammate?.profile?.alias || `${selectedTeammate?.profile?.firstName} ${selectedTeammate?.profile?.lastName}`}
            </p>

            <div className="grid grid-cols-5 gap-3 mb-6">
              {Array.from({ length: 20 }, (_, i) => i + 1).map((kartNumber) => {
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
                        ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.5), rgba(147, 51, 234, 0.3)), url(/images/Friendly-races/kart.png)'
                        : 'linear-gradient(135deg, rgba(109, 40, 217, 0.3), rgba(126, 34, 206, 0.2)), url(/images/Friendly-races/kart.png)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                    className={`p-4 rounded-lg border-4 transition-all relative overflow-hidden ${
                      isOccupied
                        ? 'border-red-500 cursor-not-allowed'
                        : isSelected
                        ? 'border-purple-400 shadow-lg shadow-purple-400/50 scale-105'
                        : 'border-purple-500/30 hover:border-purple-400 hover:scale-105'
                    }`}
                  >
                    <div className="relative z-10">
                      <div className="text-3xl font-racing text-white drop-shadow-lg">
                        {kartNumber}
                      </div>
                      {isOccupied && (
                        <div className="text-xs text-red-300 font-bold mt-1">
                          OCUPADO
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-4 justify-center mb-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500/30 border-2 border-purple-500/50 rounded"></div>
                <span className="text-sky-blue/70">Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-400 border-2 border-purple-400 rounded"></div>
                <span className="text-sky-blue/70">Seleccionado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600/50 border-2 border-red-500 rounded"></div>
                <span className="text-sky-blue/70">Ocupado</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowKartModal(false);
                  setSelectedKart(null);
                }}
                disabled={inviting}
                className="flex-1 px-6 py-3 border border-sky-blue/30 text-sky-blue/70 rounded-lg hover:bg-sky-blue/10 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmInvite}
                disabled={inviting || !selectedKart}
                className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all disabled:opacity-50 font-racing"
              >
                {inviting ? 'ENVIANDO...' : '📨 CONFIRMAR INVITACIÓN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unregister Confirmation Modal */}
      {showUnregisterConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-midnight via-red-900/20 to-midnight border-2 border-red-500/50 rounded-xl p-8 max-w-md mx-4 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-racing text-red-400 mb-2">
                ¿DESREGISTRARSE DEL EVENTO?
              </h3>
              <p className="text-sky-blue/80 font-digital">
                Solo tú serás eliminado, tus compañeros de escudería seguirán participando.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUnregisterConfirm(false)}
                disabled={unregistering}
                className="flex-1 px-6 py-3 border-2 border-sky-blue/30 text-sky-blue rounded-lg hover:bg-sky-blue/10 transition-all font-racing disabled:opacity-50"
              >
                CANCELAR
              </button>
              <button
                onClick={handleConfirmUnregister}
                disabled={unregistering}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg hover:shadow-red-500/50 transition-all font-racing disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {unregistering ? 'PROCESANDO...' : 'DESREGISTRAR'}
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
    </div>
  );
}
