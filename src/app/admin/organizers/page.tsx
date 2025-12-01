'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AdminGuard from '@/components/AdminGuard';

interface OrganizerRequest {
  _id: string;
  email: string;
  profile: {
    firstName?: string;
    lastName?: string;
  };
  organizerProfile?: {
    organizationName?: string;
    notes?: string;
    approvedAt?: string;
    approvedBy?: any;
    permissions: {
      canCreateChampionships: boolean;
      canApproveSquadrons: boolean;
      canLinkRaces: boolean;
      canModifyStandings: boolean;
    };
  };
  createdAt: string;
}

export default function OrganizersPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [pendingRequests, setPendingRequests] = useState<OrganizerRequest[]>([]);
  const [currentOrganizers, setCurrentOrganizers] = useState<OrganizerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<OrganizerRequest | null>(null);
  const [permissions, setPermissions] = useState({
    canCreateChampionships: false,
    canApproveSquadrons: false,
    canLinkRaces: false,
    canModifyStandings: false,
  });
  const [organizationName, setOrganizationName] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const fetchRequests = async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/admin/organizers/approve', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data.pendingRequests || []);
        setCurrentOrganizers(data.currentOrganizers || []);
      }
    } catch (error) {
      console.error('Error fetching organizer requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user: OrganizerRequest) => {
    setSelectedUser(user);
    setOrganizationName(user.organizerProfile?.organizationName || '');
    setNotes(user.organizerProfile?.notes?.replace('SOLICITUD PENDIENTE: ', '') || '');
    setPermissions({
      canCreateChampionships: false,
      canApproveSquadrons: false,
      canLinkRaces: false,
      canModifyStandings: false,
    });
  };

  const handleApprove = async () => {
    if (!selectedUser || !token) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/organizers/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: selectedUser._id,
          permissions,
          organizationName: organizationName.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      if (response.ok) {
        alert('✅ Organizador aprobado exitosamente');
        setSelectedUser(null);
        fetchRequests();
      } else {
        const data = await response.json();
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error approving organizer:', error);
      alert('❌ Error al aprobar organizador');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-cyan-400">Cargando solicitudes...</p>
          </div>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-black text-white p-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="mb-6 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            ← Volver al Panel
          </button>

          <div className="flex items-center gap-4 mb-4">
            <span className="text-6xl">🎯</span>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
                Gestión de Organizadores
              </h1>
              <p className="text-gray-400">Aprobar solicitudes y gestionar permisos</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Solicitudes Pendientes */}
          <div>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
              📋 Solicitudes Pendientes
              <span className="text-sm bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">
                {pendingRequests.length}
              </span>
            </h2>

            {pendingRequests.length === 0 ? (
              <div className="bg-gray-900 rounded-lg p-8 text-center border border-gray-800">
                <div className="text-4xl mb-2">✅</div>
                <p className="text-gray-400">No hay solicitudes pendientes</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div
                    key={request._id}
                    className={`bg-gray-900 rounded-lg p-6 border-2 cursor-pointer transition-all ${
                      selectedUser?._id === request._id
                        ? 'border-yellow-400 shadow-lg shadow-yellow-400/20'
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                    onClick={() => handleSelectUser(request)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-white">
                          {request.profile?.firstName} {request.profile?.lastName}
                        </h3>
                        <p className="text-cyan-400 text-sm">{request.email}</p>
                      </div>
                      <span className="text-2xl">👤</span>
                    </div>

                    {request.organizerProfile?.organizationName && (
                      <p className="text-sm text-gray-400 mb-2">
                        🏢 <strong>{request.organizerProfile.organizationName}</strong>
                      </p>
                    )}

                    <div className="bg-gray-800 rounded p-3 text-sm text-gray-300">
                      <strong className="text-yellow-400">Razón:</strong>
                      <p className="mt-1">
                        {request.organizerProfile?.notes?.replace('SOLICITUD PENDIENTE: ', '')}
                      </p>
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      Solicitado: {new Date(request.createdAt).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Panel de Aprobación */}
          <div>
            <h2 className="text-2xl font-bold text-green-400 mb-4">✅ Aprobar Organizador</h2>

            {selectedUser ? (
              <div className="bg-gray-900 rounded-lg p-6 border-2 border-green-400/30">
                <div className="mb-6">
                  <h3 className="font-bold text-xl text-white mb-2">
                    {selectedUser.profile?.firstName} {selectedUser.profile?.lastName}
                  </h3>
                  <p className="text-cyan-400">{selectedUser.email}</p>
                </div>

                {/* Organization Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre de Organización (opcional)
                  </label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="Ej: Speed Demons Chile"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-cyan-400 focus:outline-none text-white"
                  />
                </div>

                {/* Permissions */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    Permisos
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={permissions.canCreateChampionships}
                        onChange={(e) =>
                          setPermissions({ ...permissions, canCreateChampionships: e.target.checked })
                        }
                        className="w-5 h-5 text-green-500"
                      />
                      <div>
                        <p className="text-white font-medium">🏆 Crear Campeonatos</p>
                        <p className="text-xs text-gray-400">Puede crear y configurar nuevos campeonatos</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={permissions.canApproveSquadrons}
                        onChange={(e) =>
                          setPermissions({ ...permissions, canApproveSquadrons: e.target.checked })
                        }
                        className="w-5 h-5 text-green-500"
                      />
                      <div>
                        <p className="text-white font-medium">✅ Aprobar Equipos</p>
                        <p className="text-xs text-gray-400">Puede aprobar inscripciones de equipos</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={permissions.canLinkRaces}
                        onChange={(e) =>
                          setPermissions({ ...permissions, canLinkRaces: e.target.checked })
                        }
                        className="w-5 h-5 text-green-500"
                      />
                      <div>
                        <p className="text-white font-medium">🔗 Vincular Carreras</p>
                        <p className="text-xs text-gray-400">Puede vincular sesiones de SMS-Timing</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={permissions.canModifyStandings}
                        onChange={(e) =>
                          setPermissions({ ...permissions, canModifyStandings: e.target.checked })
                        }
                        className="w-5 h-5 text-green-500"
                      />
                      <div>
                        <p className="text-white font-medium">📊 Modificar Clasificaciones</p>
                        <p className="text-xs text-gray-400">Puede ajustar resultados manualmente</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notas sobre este organizador..."
                    rows={3}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-cyan-400 focus:outline-none text-white resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={processing}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all"
                  >
                    {processing ? '⏳ Procesando...' : '✅ Aprobar Organizador'}
                  </button>
                  <button
                    onClick={() => setSelectedUser(null)}
                    disabled={processing}
                    className="px-6 py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 rounded-lg transition-colors"
                  >
                    ❌
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-lg p-8 text-center border border-gray-800">
                <div className="text-4xl mb-2">👈</div>
                <p className="text-gray-400">Selecciona una solicitud para aprobar</p>
              </div>
            )}

            {/* Current Organizers */}
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                👥 Organizadores Actuales
                <span className="text-sm bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded-full">
                  {currentOrganizers.length}
                </span>
              </h2>

              {currentOrganizers.length === 0 ? (
                <div className="bg-gray-900 rounded-lg p-8 text-center border border-gray-800">
                  <p className="text-gray-400">No hay organizadores aprobados aún</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {currentOrganizers.map((organizer) => (
                    <div
                      key={organizer._id}
                      className="bg-gray-900 rounded-lg p-4 border border-gray-800"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-white">
                            {organizer.profile?.firstName} {organizer.profile?.lastName}
                          </h3>
                          <p className="text-cyan-400 text-sm">{organizer.email}</p>
                          {organizer.organizerProfile?.organizationName && (
                            <p className="text-xs text-gray-400 mt-1">
                              🏢 {organizer.organizerProfile.organizationName}
                            </p>
                          )}
                        </div>
                        <span className="text-2xl">✅</span>
                      </div>

                      {/* Permissions Badge */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {organizer.organizerProfile?.permissions.canCreateChampionships && (
                          <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                            🏆 Campeonatos
                          </span>
                        )}
                        {organizer.organizerProfile?.permissions.canApproveSquadrons && (
                          <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                            ✅ Equipos
                          </span>
                        )}
                        {organizer.organizerProfile?.permissions.canLinkRaces && (
                          <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                            🔗 Carreras
                          </span>
                        )}
                        {organizer.organizerProfile?.permissions.canModifyStandings && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
                            📊 Resultados
                          </span>
                        )}
                      </div>

                      {organizer.organizerProfile?.approvedAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          Aprobado: {new Date(organizer.organizerProfile.approvedAt).toLocaleDateString('es-CL')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
