'use client';

import { useState, useEffect } from 'react';

interface JoinRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
}

interface JoinRequest {
  _id: string;
  pilotId: {
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      alias?: string;
    };
  };
  message?: string;
  createdAt: string;
  status: string;
}

export default function JoinRequestsModal({ isOpen, onClose, onSuccess, token }: JoinRequestsModalProps) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchRequests();
    }
  }, [isOpen]);

  const fetchRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/squadron/pending-requests', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        setRequests(data.requests || []);
      } else {
        setError(data.error || 'Error al cargar solicitudes');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessingId(requestId);
    setError('');
    try {
      const response = await fetch('/api/squadron/resolve-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await response.json();

      if (data.success) {
        // Refrescar lista
        await fetchRequests();
        onSuccess();
      } else {
        setError(data.error || 'Error al procesar solicitud');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setProcessingId(null);
    }
  };

  const handleClose = () => {
    if (!processingId) {
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={handleClose}>
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-gradient-to-br from-midnight via-rb-blue/20 to-midnight border-2 border-electric-blue/50 rounded-xl shadow-2xl animate-glow overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(0, 212, 255, 0.3) 2px, transparent 2px)',
            backgroundSize: '50px 50px',
          }}
        />

        {/* Header */}
        <div className="relative z-10 p-6 border-b border-electric-blue/30">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-racing text-electric-blue tracking-wider mb-2">
                SOLICITUDES PENDIENTES
              </h2>
              <p className="text-sky-blue/70 text-sm">
                {requests.length} {requests.length === 1 ? 'piloto quiere' : 'pilotos quieren'} unirse
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={!!processingId}
              className="text-sky-blue hover:text-electric-blue transition-colors text-2xl disabled:opacity-50"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-electric-blue"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sky-blue/70 text-lg">No hay solicitudes pendientes</p>
              <p className="text-sky-blue/50 text-sm mt-2">Las nuevas solicitudes aparecerán aquí</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request._id}
                  className="bg-gradient-to-br from-midnight/90 via-rb-blue/10 to-midnight/90 border border-electric-blue/30 rounded-lg p-5 hover:border-electric-blue/60 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Pilot info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-electric-blue to-cyan-400 flex items-center justify-center text-midnight font-racing text-xl">
                          {request.pilotId.profile.firstName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-xl font-racing text-electric-blue">
                            {request.pilotId.profile.firstName} {request.pilotId.profile.lastName}
                          </h3>
                          {request.pilotId.profile.alias && (
                            <p className="text-sm text-sky-blue/70">@{request.pilotId.profile.alias}</p>
                          )}
                        </div>
                      </div>

                      {request.message && (
                        <div className="mt-3 p-3 bg-midnight/50 rounded border border-electric-blue/20">
                          <p className="text-sm text-sky-blue/80 italic">"{request.message}"</p>
                        </div>
                      )}

                      <p className="text-xs text-sky-blue/50 mt-3">
                        Solicitó: {new Date(request.createdAt).toLocaleString('es-CL')}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleResolve(request._id, 'approve')}
                        disabled={processingId === request._id}
                        className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-400 text-white font-racing rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === request._id ? '...' : '✓ ACEPTAR'}
                      </button>
                      <button
                        onClick={() => handleResolve(request._id, 'reject')}
                        disabled={processingId === request._id}
                        className="px-6 py-2 bg-gradient-to-r from-red-500 to-orange-400 text-white font-racing rounded-lg hover:shadow-lg hover:shadow-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === request._id ? '...' : '✕ RECHAZAR'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
