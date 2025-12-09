'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';

interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  alias?: string;
  friendshipStatus?: string;
  friendshipId?: string;
  canSendRequest?: boolean;
}

interface Friend {
  friendshipId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  alias?: string;
  since?: Date;
  stats?: {
    totalRaces: number;
    bestTime: number | null;
    averageTime: number | null;
    podiumFinishes: number;
    firstPlaces: number;
    secondPlaces: number;
    thirdPlaces: number;
    lastRaceAt: Date | null;
  } | null;
}

interface FriendRequest {
  friendshipId: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  alias?: string;
  createdAt: Date;
}

export default function AmigosPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requestsReceived, setRequestsReceived] = useState<FriendRequest[]>([]);
  const [requestsSent, setRequestsSent] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Notification modal state
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    if (token) {
      fetchFriends();
    }
  }, [token]);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const timer = setTimeout(() => {
        searchUsers();
      }, 300); // Debounce 300ms
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchFriends = async () => {
    try {
      const response = await fetch('/api/friends', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
        setRequestsReceived(data.requestsReceived || []);
        setRequestsSent(data.requestsSent || []);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (searchQuery.trim().length < 2) return;

    setSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (friendId: string) => {
    setActionInProgress(friendId);
    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ friendId }),
      });

      const data = await response.json();
      if (response.ok) {
        setNotificationMessage('Solicitud de amistad enviada');
        setNotificationType('success');
        setShowNotification(true);
        fetchFriends();
        searchUsers(); // Refresh search results
      } else {
        setNotificationMessage(data.error || 'Error al enviar solicitud');
        setNotificationType('error');
        setShowNotification(true);
      }
    } catch (error) {
      console.error('Error sending request:', error);
      setNotificationMessage('Error al enviar solicitud');
      setNotificationType('error');
      setShowNotification(true);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRespondRequest = async (friendshipId: string, accept: boolean) => {
    setActionInProgress(friendshipId);
    try {
      const response = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ friendshipId, accept }),
      });

      const data = await response.json();
      if (response.ok) {
        setNotificationMessage(accept ? 'Solicitud aceptada' : 'Solicitud rechazada');
        setNotificationType('success');
        setShowNotification(true);
        fetchFriends();
      } else {
        setNotificationMessage(data.error || 'Error al responder solicitud');
        setNotificationType('error');
        setShowNotification(true);
      }
    } catch (error) {
      console.error('Error responding to request:', error);
      setNotificationMessage('Error al responder solicitud');
      setNotificationType('error');
      setShowNotification(true);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta amistad?')) return;

    setActionInProgress(friendshipId);
    try {
      const response = await fetch(`/api/friends/${friendshipId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setNotificationMessage('Amistad eliminada');
        setNotificationType('success');
        setShowNotification(true);
        fetchFriends();
      } else {
        setNotificationMessage(data.error || 'Error al eliminar amistad');
        setNotificationType('error');
        setShowNotification(true);
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      setNotificationMessage('Error al eliminar amistad');
      setNotificationType('error');
      setShowNotification(true);
    } finally {
      setActionInProgress(null);
    }
  };

  const getDisplayName = (person: { firstName: string; lastName: string; alias?: string }) => {
    return person.alias || `${person.firstName} ${person.lastName}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-gray-400 text-xl mb-4">Debes iniciar sesión para ver tus amigos</p>
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
          <h1 className="text-4xl font-racing text-electric-blue mb-2">👥 Amigos</h1>
          <p className="text-gray-400">Gestiona tus amigos y solicitudes de amistad</p>
        </div>

        {/* Search Section */}
        <div className="mb-8 bg-blue-900/20 border border-blue-400/30 rounded-xl p-6">
          <h2 className="text-2xl font-racing text-cyan-400 mb-4">🔍 Buscar Corredores</h2>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Busca por nombre, alias o email..."
            className="w-full px-4 py-3 bg-midnight/50 border-2 border-electric-blue/50 rounded-lg text-white focus:border-electric-blue focus:outline-none"
          />

          {searching && (
            <div className="mt-4 text-center text-cyan-400">Buscando...</div>
          )}

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((result) => (
                <div
                  key={result.userId}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-white font-bold">{getDisplayName(result)}</p>
                    <p className="text-gray-400 text-sm">{result.email}</p>
                  </div>
                  <div>
                    {result.friendshipStatus === 'friends' && (
                      <span className="text-green-400 text-sm">✓ Amigos</span>
                    )}
                    {result.friendshipStatus === 'request_sent' && (
                      <span className="text-yellow-400 text-sm">⏳ Solicitud enviada</span>
                    )}
                    {result.friendshipStatus === 'request_received' && (
                      <span className="text-orange-400 text-sm">📬 Solicitud recibida</span>
                    )}
                    {result.canSendRequest && (
                      <button
                        onClick={() => handleSendRequest(result.userId)}
                        disabled={actionInProgress === result.userId}
                        className="px-4 py-2 bg-cyan-400/20 border border-cyan-400/50 text-cyan-400 rounded-lg hover:bg-cyan-400/30 transition-all disabled:opacity-50"
                      >
                        {actionInProgress === result.userId ? '⏳' : '➕ Agregar'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
            <div className="mt-4 text-center text-gray-400">No se encontraron usuarios</div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-cyan-400">Cargando...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Pending Requests Received */}
            {requestsReceived.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-racing text-yellow-400 mb-4">📬 Solicitudes Recibidas ({requestsReceived.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requestsReceived.map((request) => (
                    <div
                      key={request.friendshipId}
                      className="bg-gradient-to-br from-yellow-900/20 via-slate-800/80 to-slate-900/90 border-2 border-yellow-500/30 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-white font-bold text-lg">{getDisplayName(request)}</p>
                          <p className="text-gray-400 text-sm">{request.email}</p>
                          <p className="text-yellow-400 text-xs mt-2">
                            {new Date(request.createdAt).toLocaleDateString('es-CL')}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <button
                            onClick={() => handleRespondRequest(request.friendshipId, true)}
                            disabled={actionInProgress === request.friendshipId}
                            className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg hover:bg-green-500/30 transition-all disabled:opacity-50 font-bold text-sm"
                          >
                            {actionInProgress === request.friendshipId ? '⏳' : '✓ Aceptar'}
                          </button>
                          <button
                            onClick={() => handleRespondRequest(request.friendshipId, false)}
                            disabled={actionInProgress === request.friendshipId}
                            className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 font-bold text-sm"
                          >
                            {actionInProgress === request.friendshipId ? '⏳' : '✕ Rechazar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Requests Sent */}
            {requestsSent.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-racing text-orange-400 mb-4">📤 Solicitudes Enviadas ({requestsSent.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requestsSent.map((request) => (
                    <div
                      key={request.friendshipId}
                      className="bg-gradient-to-br from-orange-900/20 via-slate-800/80 to-slate-900/90 border-2 border-orange-500/30 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-white font-bold text-lg">{getDisplayName(request)}</p>
                          <p className="text-gray-400 text-sm">{request.email}</p>
                          <p className="text-orange-400 text-xs mt-2">
                            Enviada: {new Date(request.createdAt).toLocaleDateString('es-CL')}
                          </p>
                        </div>
                        <div className="text-orange-400 text-sm">
                          ⏳ Pendiente
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends List */}
            <div className="mb-8">
              <h2 className="text-2xl font-racing text-green-400 mb-4">
                ✓ Mis Amigos ({friends.length})
              </h2>
              {friends.length === 0 ? (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
                  <div className="text-6xl mb-4">👥</div>
                  <h3 className="text-2xl font-racing text-white mb-2">No tienes amigos todavía</h3>
                  <p className="text-gray-400">Usa el buscador de arriba para encontrar y agregar amigos</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {friends.map((friend) => (
                    <div
                      key={friend.friendshipId}
                      className="bg-gradient-to-br from-green-900/20 via-slate-800/80 to-slate-900/90 border-2 border-green-500/30 rounded-xl p-5"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4 pb-3 border-b border-green-500/20">
                        <div className="flex-1">
                          <p className="text-white font-bold text-xl mb-1">{getDisplayName(friend)}</p>
                          <p className="text-gray-400 text-sm">{friend.email}</p>
                        </div>
                        <div className="text-green-400 text-2xl">🏁</div>
                      </div>

                      {/* Stats Section */}
                      {friend.stats ? (
                        <div className="mb-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            {/* Total Races */}
                            <div className="bg-slate-900/50 rounded-lg p-3 border border-cyan-400/20">
                              <div className="text-cyan-400 text-xs font-medium mb-1">CARRERAS</div>
                              <div className="text-white text-2xl font-racing">{friend.stats.totalRaces}</div>
                            </div>

                            {/* Podiums */}
                            <div className="bg-slate-900/50 rounded-lg p-3 border border-yellow-400/20">
                              <div className="text-yellow-400 text-xs font-medium mb-1">PODIOS</div>
                              <div className="text-white text-2xl font-racing">{friend.stats.podiumFinishes}</div>
                            </div>
                          </div>

                          {/* Best Time */}
                          {friend.stats.bestTime && (
                            <div className="bg-slate-900/50 rounded-lg p-3 border border-electric-blue/20">
                              <div className="text-electric-blue text-xs font-medium mb-1">MEJOR TIEMPO</div>
                              <div className="text-white text-xl font-racing">
                                {(friend.stats.bestTime / 1000).toFixed(3)}s
                              </div>
                            </div>
                          )}

                          {/* Positions */}
                          <div className="flex gap-2 text-center">
                            <div className="flex-1 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 rounded-lg p-2 border border-yellow-400/30">
                              <div className="text-yellow-400 text-lg font-bold">🥇</div>
                              <div className="text-white text-sm font-medium">{friend.stats.firstPlaces}</div>
                            </div>
                            <div className="flex-1 bg-gradient-to-br from-gray-400/20 to-gray-500/10 rounded-lg p-2 border border-gray-400/30">
                              <div className="text-gray-300 text-lg font-bold">🥈</div>
                              <div className="text-white text-sm font-medium">{friend.stats.secondPlaces}</div>
                            </div>
                            <div className="flex-1 bg-gradient-to-br from-orange-600/20 to-orange-700/10 rounded-lg p-2 border border-orange-500/30">
                              <div className="text-orange-400 text-lg font-bold">🥉</div>
                              <div className="text-white text-sm font-medium">{friend.stats.thirdPlaces}</div>
                            </div>
                          </div>

                          {/* Last Race */}
                          {friend.stats.lastRaceAt && (
                            <div className="text-gray-400 text-xs text-center">
                              Última carrera: {new Date(friend.stats.lastRaceAt).toLocaleDateString('es-CL')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mb-4 text-center py-6 text-gray-500 text-sm">
                          Sin estadísticas disponibles
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <button
                          onClick={() => router.push(`/perfil/${friend.userId}`)}
                          className="w-full px-4 py-2 bg-cyan-400/20 text-cyan-400 border border-cyan-400/50 rounded-lg hover:bg-cyan-400/30 transition-all font-medium text-sm"
                        >
                          📊 Ver Estadísticas Completas
                        </button>
                        <button
                          onClick={() => handleRemoveFriend(friend.friendshipId)}
                          disabled={actionInProgress === friend.friendshipId}
                          className="w-full px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 text-sm"
                        >
                          {actionInProgress === friend.friendshipId ? '⏳' : '🗑️ Eliminar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Notification Modal */}
      {showNotification && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-midnight via-racing-black to-midnight border-2 border-electric-blue/50 rounded-lg p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              {notificationType === 'success' ? (
                <div className="text-6xl mb-4">✅</div>
              ) : (
                <div className="text-6xl mb-4">❌</div>
              )}
              <h3 className={`text-2xl font-racing mb-4 ${notificationType === 'success' ? 'text-electric-blue' : 'text-red-400'}`}>
                {notificationType === 'success' ? 'ÉXITO' : 'ERROR'}
              </h3>
              <p className="text-sky-blue/90 mb-6">{notificationMessage}</p>
              <button
                onClick={() => setShowNotification(false)}
                className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 rounded-lg hover:from-yellow-300 hover:to-yellow-400 transition-all font-racing text-lg shadow-lg"
              >
                CERRAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
