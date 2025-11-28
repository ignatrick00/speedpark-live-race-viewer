'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AdminGuard from '@/components/AdminGuard';

interface LinkageRequest {
  _id: string;
  webUserId: string;
  searchedName: string;
  selectedDriverName: string;
  selectedSessionId: string;
  driverRaceDataId: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  userSnapshot: {
    email: string;
    firstName: string;
    lastName: string;
  };
  driverSnapshot: {
    driverName: string;
    totalRaces: number;
    lastRaceDate?: string;
    currentLinkStatus: string;
  };
}

export default function LinkageRequestsPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [requests, setRequests] = useState<LinkageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (token) {
      loadRequests();
    }
  }, [filter, token]);

  const loadRequests = async () => {
    if (!token) {
      setError('No autorizado');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(`/api/admin/linkage-requests?status=${filter}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRequests(data.requests);
        setPendingCount(data.pendingCount);
      } else {
        setError(data.error || 'Error al cargar solicitudes');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    requestId: string,
    action: 'approve' | 'reject',
    reason?: string
  ) => {
    if (!token) {
      setError('No autorizado');
      return;
    }

    if (action === 'reject' && !reason) {
      reason = prompt('Razón del rechazo (opcional):') || 'Rechazado por el administrador';
    }

    if (!confirm(`¿Confirmar ${action === 'approve' ? 'APROBAR' : 'RECHAZAR'} esta solicitud?`)) {
      return;
    }

    try {
      setProcessingId(requestId);
      setError('');

      const response = await fetch(`/api/admin/linkage-requests?id=${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          rejectionReason: reason,
        }),
      });

      if (!response.ok) {
        // Try to parse error message from response
        let errorMessage = `Error al procesar solicitud (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use default message
          errorMessage = `Error del servidor: ${response.status} ${response.statusText}`;
        }
        console.error('Error al procesar solicitud:', response.status, errorMessage);
        setError(errorMessage);
        return;
      }

      const data = await response.json();

      if (data.success) {
        alert(`✅ Solicitud ${action === 'approve' ? 'aprobada' : 'rechazada'} exitosamente`);
        loadRequests(); // Reload list
      } else {
        console.error('Error al procesar solicitud:', data);
        setError(data.error || 'Error desconocido');
      }
    } catch (err: any) {
      console.error('Error de conexión:', err);
      setError(`Error de conexión: ${err.message || 'Unknown error'}`);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-dark-bg via-gray-900 to-dark-bg text-white p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/admin')}
              className="text-sky-blue hover:text-electric-blue mb-4 flex items-center gap-2"
            >
              ← Volver al Panel Admin
            </button>
            <h1 className="text-4xl font-bold text-electric-blue mb-2">
              🔗 Solicitudes de Vinculación
            </h1>
            <p className="text-sky-blue/60">
              Aprobar o rechazar solicitudes de usuarios para vincular sus perfiles
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800/50 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Pendientes</p>
              <p className="text-yellow-400 text-3xl font-bold">{pendingCount}</p>
            </div>
            <div className="bg-gray-800/50 border border-green-500/30 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Total Mostrado</p>
              <p className="text-green-400 text-3xl font-bold">{requests.length}</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === tab
                    ? 'bg-electric-blue text-dark-bg'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {tab === 'pending' && '⏳ Pendientes'}
                {tab === 'approved' && '✅ Aprobadas'}
                {tab === 'rejected' && '❌ Rechazadas'}
                {tab === 'all' && '📋 Todas'}
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <p className="text-gray-400">Cargando solicitudes...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && requests.length === 0 && (
            <div className="text-center py-12 bg-gray-800/30 rounded-lg">
              <p className="text-gray-400 text-lg">
                {filter === 'pending'
                  ? '✅ No hay solicitudes pendientes'
                  : `No hay solicitudes ${filter === 'all' ? '' : filter === 'approved' ? 'aprobadas' : 'rechazadas'}`}
              </p>
            </div>
          )}

          {/* Requests List */}
          {!loading && requests.length > 0 && (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request._id}
                  className={`bg-gray-800/50 border rounded-lg p-6 ${
                    request.status === 'pending'
                      ? 'border-yellow-500/30'
                      : request.status === 'approved'
                      ? 'border-green-500/30'
                      : 'border-red-500/30'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-white">
                          {request.userSnapshot.firstName} {request.userSnapshot.lastName}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            request.status === 'pending'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : request.status === 'approved'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {request.status === 'pending' && '⏳ Pendiente'}
                          {request.status === 'approved' && '✅ Aprobada'}
                          {request.status === 'rejected' && '❌ Rechazada'}
                        </span>
                      </div>
                      <p className="text-sky-blue/60 text-sm">{request.userSnapshot.email}</p>
                    </div>
                    <p className="text-gray-400 text-sm">{formatDate(request.createdAt)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <p className="text-gray-400 text-xs mb-1">Nombre buscado</p>
                      <p className="text-white font-medium">{request.searchedName}</p>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-4">
                      <p className="text-gray-400 text-xs mb-1">Perfil seleccionado</p>
                      <p className="text-electric-blue font-medium">
                        {request.selectedDriverName}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {request.driverSnapshot.totalRaces} carreras •{' '}
                        {request.driverSnapshot.currentLinkStatus}
                      </p>
                    </div>
                  </div>

                  {request.rejectionReason && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                      <p className="text-red-400 text-sm">
                        <strong>Razón del rechazo:</strong> {request.rejectionReason}
                      </p>
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAction(request._id, 'approve')}
                        disabled={processingId === request._id}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === request._id ? 'Procesando...' : '✅ Aprobar'}
                      </button>
                      <button
                        onClick={() => handleAction(request._id, 'reject')}
                        disabled={processingId === request._id}
                        className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === request._id ? 'Procesando...' : '❌ Rechazar'}
                      </button>
                    </div>
                  )}

                  {request.status !== 'pending' && request.reviewedAt && (
                    <p className="text-gray-400 text-sm mt-4">
                      Revisado el {formatDate(request.reviewedAt)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
