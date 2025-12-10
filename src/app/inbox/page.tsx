'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import { EventCategoryConfig, EventCategory } from '@/types/squadron-events';

// Countdown timer component
function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('Expirada');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return (
    <span className={isExpired ? 'text-red-500 font-bold' : 'text-yellow-400 font-bold'}>
      {timeLeft}
    </span>
  );
}

export default function InboxPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [invitations, setInvitations] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchInvitations();
      fetchNotifications();
    }
  }, [token]);

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/invitations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ read: true })
      });

      if (response.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleRespondSquadronInvite = async (invitationId: string, accept: boolean, squadronName: string) => {
    setResponding(invitationId);
    try {
      const endpoint = accept ? '/api/squadron/accept-invitation' : '/api/squadron/reject-invitation';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          invitationId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(accept ? `Te has unido a ${squadronName}!` : 'Invitación rechazada');
        fetchInvitations();
      } else {
        alert(data.error || 'Error al responder invitación');
      }
    } catch (error) {
      console.error('Error responding to squadron invitation:', error);
      alert('Error al responder invitación');
    } finally {
      setResponding(null);
    }
  };

  const handleRespondClassInvite = async (invitationToken: string, accept: boolean) => {
    setResponding(invitationToken);
    try {
      const response = await fetch(`/api/group-invitations/${invitationToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: accept ? 'accept' : 'reject',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(accept ? '¡Invitación aceptada! Te has unido a la clase grupal.' : 'Invitación rechazada');
        fetchInvitations();
      } else {
        alert(data.error || 'Error al responder invitación');
      }
    } catch (error) {
      console.error('Error responding to class invitation:', error);
      alert('Error al responder invitación');
    } finally {
      setResponding(null);
    }
  };

  const handleRespondEventInvite = async (eventId: string, accept: boolean) => {
    setResponding(eventId);
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

      if (response.ok) {
        alert(accept ? 'Has aceptado la invitación al evento!' : 'Invitación rechazada');
        fetchInvitations();
      } else {
        alert(data.error || 'Error al responder invitación');
      }
    } catch (error) {
      console.error('Error responding to event invitation:', error);
      alert('Error al responder invitación');
    } finally {
      setResponding(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-gray-400 text-xl mb-4">Debes iniciar sesión para ver invitaciones</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-racing text-electric-blue mb-2">📬 Inbox</h1>
          <p className="text-gray-400">
            Revisa tus invitaciones y notificaciones pendientes
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-purple-400">Cargando invitaciones...</p>
            </div>
          </div>
        ) : invitations.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-2xl font-racing text-white mb-2">No tienes invitaciones</h3>
            <p className="text-gray-400 mb-6">Cuando recibas invitaciones a escuderías o eventos, aparecerán aquí</p>
            <button
              onClick={() => router.push('/races')}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all"
            >
              Ver carreras
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => {
              if (invitation.type === 'squadron') {
                return (
                  <div
                    key={`squadron-${invitation.squadronId}`}
                    className="bg-gradient-to-br from-blue-900/20 via-slate-800/80 to-slate-900/90 border-2 border-blue-500/30 rounded-xl p-6 hover:border-blue-400/50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-3xl">🏁</span>
                          <div>
                            <h3 className="text-2xl font-racing text-white">
                              {invitation.squadronName}
                            </h3>
                            {invitation.squadronTag && (
                              <p className="text-blue-400 font-bold">[{invitation.squadronTag}]</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-400">
                          <p>
                            <span className="text-gray-500">Invitado por:</span>{' '}
                            <span className="text-white">
                              {invitation.invitedBy?.profile?.alias ||
                                `${invitation.invitedBy?.profile?.firstName} ${invitation.invitedBy?.profile?.lastName}`}
                            </span>
                          </p>
                          <div className="flex gap-4 text-xs mt-3">
                            <span className="text-sky-blue/60">
                              📊 {invitation.division}
                            </span>
                            <span className="text-sky-blue/60">
                              ⚡ Fair Racing: {invitation.fairRacingAverage}
                            </span>
                            <span className="text-sky-blue/60">
                              🏆 {invitation.totalPoints} pts
                            </span>
                          </div>
                          <p className="text-xs text-sky-blue/50 mt-2">
                            Recibida: {new Date(invitation.invitedAt).toLocaleString('es-CL')}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => handleRespondSquadronInvite(invitation._id, true, invitation.squadronName)}
                          disabled={responding === invitation._id}
                          className="px-6 py-2 bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg hover:bg-green-500/30 transition-all disabled:opacity-50 font-bold"
                        >
                          {responding === invitation._id ? '⏳' : '✓ ACEPTAR'}
                        </button>
                        <button
                          onClick={() => handleRespondSquadronInvite(invitation._id, false, invitation.squadronName)}
                          disabled={responding === invitation._id}
                          className="px-6 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 font-bold"
                        >
                          {responding === invitation._id ? '⏳' : '✕ RECHAZAR'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              } else if (invitation.type === 'event') {
                // Event invitation
                const categoryConfig = EventCategoryConfig[invitation.category as EventCategory];
                return (
                  <div
                    key={`event-${invitation.eventId}`}
                    className={`bg-gradient-to-br from-purple-900/20 via-slate-800/80 to-slate-900/90 border-2 ${categoryConfig.color} rounded-xl p-6 hover:border-purple-400/50 transition-all`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-3xl">🏆</span>
                          <div>
                            <h3 className="text-2xl font-racing text-white">
                              {invitation.eventName}
                            </h3>
                            <p className="text-purple-400 font-bold text-sm">{categoryConfig.name}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500">Escudería</p>
                            <p className="text-white font-bold">
                              {invitation.squadron.name}
                              {invitation.squadron.tag && ` [${invitation.squadron.tag}]`}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Kart asignado</p>
                            <p className="text-electric-blue font-bold text-xl">#{invitation.kartNumber}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Fecha del evento</p>
                            <p className="text-white">
                              {new Date(invitation.eventDate).toLocaleDateString('es-CL')} {invitation.eventTime}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Ubicación</p>
                            <p className="text-white">{invitation.location}</p>
                          </div>
                          {invitation.invitedBy && (
                            <div className="col-span-2">
                              <p className="text-gray-500">Invitado por</p>
                              <p className="text-white">
                                {invitation.invitedBy.profile?.alias ||
                                  `${invitation.invitedBy.profile?.firstName || ''} ${invitation.invitedBy.profile?.lastName || ''}`.trim() ||
                                  invitation.invitedBy.email}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 text-sm">
                          <span className="text-gray-500">Expira en:</span>{' '}
                          <CountdownTimer expiresAt={invitation.expiresAt} />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => handleRespondEventInvite(invitation.eventId, true)}
                          disabled={responding === invitation.eventId}
                          className="px-6 py-2 bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg hover:bg-green-500/30 transition-all disabled:opacity-50 font-bold"
                        >
                          {responding === invitation.eventId ? '⏳' : '✓ Aceptar'}
                        </button>
                        <button
                          onClick={() => handleRespondEventInvite(invitation.eventId, false)}
                          disabled={responding === invitation.eventId}
                          className="px-6 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 font-bold"
                        >
                          {responding === invitation.eventId ? '⏳' : '✕ Rechazar'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              } else if (invitation.type === 'class') {
                // Group Class Invitation Card
                return (
                  <div
                    key={`class-${invitation.token}`}
                    className="bg-gradient-to-br from-cyan-900/20 via-slate-800/80 to-slate-900/90 border-2 border-cyan-500/30 rounded-xl p-6 hover:border-cyan-400/50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-3xl">📚</span>
                          <div>
                            <h3 className="text-2xl font-racing text-white">
                              Invitación a Clase Grupal
                            </h3>
                            <p className="text-cyan-400 font-bold">{invitation.class.title}</p>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-400">
                          <p>
                            <span className="text-gray-500">Invitado por:</span>{' '}
                            <span className="text-white">{invitation.inviterName}</span>
                          </p>
                          <p>
                            <span className="text-gray-500">Coach:</span>{' '}
                            <span className="text-white">{invitation.class.coachName}</span>
                          </p>
                          <p>
                            <span className="text-gray-500">Fecha:</span>{' '}
                            <span className="text-white">
                              {new Date(invitation.class.date).toLocaleDateString('es-CL', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </p>
                          <p>
                            <span className="text-gray-500">Horario:</span>{' '}
                            <span className="text-white">
                              {invitation.class.startTime} - {invitation.class.endTime}
                            </span>
                          </p>
                          <p>
                            <span className="text-gray-500">Cupos:</span>{' '}
                            <span className="text-white">
                              {invitation.class.currentParticipants}/{invitation.class.maxCapacity} ocupados
                              {' '}({invitation.class.maxCapacity - invitation.class.currentParticipants} disponibles)
                            </span>
                          </p>
                          <p>
                            <span className="text-gray-500">Precio:</span>{' '}
                            <span className="text-cyan-400 font-bold">
                              ${invitation.class.groupPricePerPerson.toLocaleString('es-CL')}
                            </span>
                          </p>
                          <p>
                            <span className="text-gray-500">Expira en:</span>{' '}
                            <CountdownTimer expiresAt={invitation.expiresAt} />
                          </p>
                        </div>
                      </div>

                      <div className="ml-6 flex flex-col gap-3">
                        <button
                          onClick={() => handleRespondClassInvite(invitation.token, true)}
                          disabled={responding === invitation.token}
                          className="px-6 py-2 bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg hover:bg-green-500/30 transition-all disabled:opacity-50 font-bold"
                        >
                          {responding === invitation.token ? '⏳' : '✓ Aceptar'}
                        </button>
                        <button
                          onClick={() => handleRespondClassInvite(invitation.token, false)}
                          disabled={responding === invitation.token}
                          className="px-6 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 font-bold"
                        >
                          {responding === invitation.token ? '⏳' : '✕ Rechazar'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
            })}

            {/* Notificaciones Section */}
            {notifications.length > 0 && (
              <div className="mt-8">
                <h2 className="text-2xl font-racing text-white mb-4">📢 Notificaciones</h2>
                <div className="space-y-3">
                  {notifications.map((notification) => {
                    if (notification.type === 'race_sanction') {
                      return (
                        <div
                          key={notification._id}
                          className={`bg-gradient-to-br from-yellow-900/20 via-slate-800/80 to-slate-900/90 border-2 ${
                            notification.read ? 'border-yellow-800/20' : 'border-yellow-600/50'
                          } rounded-xl p-6 hover:border-yellow-500/50 transition-all`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-3xl">⚠️</span>
                                <div>
                                  <h3 className="text-xl font-racing text-white">
                                    {notification.title}
                                  </h3>
                                  <p className="text-yellow-400 font-bold text-sm">{notification.metadata?.eventName}</p>
                                </div>
                              </div>

                              <div className="space-y-2 text-sm">
                                <p className="text-white">{notification.message}</p>

                                <div className="grid grid-cols-2 gap-2 mt-3">
                                  <div>
                                    <span className="text-gray-500">Carrera:</span>{' '}
                                    <span className="text-gray-300">{notification.metadata?.raceSessionName}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Tipo:</span>{' '}
                                    <span className="text-yellow-400 font-bold">
                                      {notification.metadata?.sanctionType === 'position_penalty' ? `+${notification.metadata?.positionPenalty} posiciones` :
                                       notification.metadata?.sanctionType === 'point_deduction' ? `-${notification.metadata?.pointsPenalty} puntos` :
                                       notification.metadata?.sanctionType === 'disqualification' ? 'DESCALIFICADO' :
                                       'ADVERTENCIA'}
                                    </span>
                                  </div>
                                </div>

                                <div className="mt-3 p-3 bg-slate-900/50 rounded-lg">
                                  <p className="text-xs text-gray-400 mb-1">Motivo:</p>
                                  <p className="text-sm text-white">{notification.metadata?.description}</p>
                                </div>

                                <p className="text-xs text-gray-500 mt-2">
                                  {new Date(notification.createdAt).toLocaleString('es-CL')}
                                </p>
                              </div>
                            </div>

                            {!notification.read && (
                              <button
                                onClick={() => markNotificationAsRead(notification._id)}
                                className="ml-4 px-4 py-2 bg-yellow-600/20 text-yellow-400 border border-yellow-600/50 rounded-lg hover:bg-yellow-600/30 transition-all text-sm font-bold"
                              >
                                ✓ Marcar como leída
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }
                    // Otros tipos de notificaciones (friend_request, etc.)
                    return null;
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
