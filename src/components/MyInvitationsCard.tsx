'use client';

import { useState, useEffect } from 'react';

interface MyInvitationsCardProps {
  token: string;
  onAccept: () => void;
}

interface Invitation {
  _id: string;
  squadronId: {
    _id: string;
    name: string;
    description: string;
    colors: {
      primary: string;
      secondary: string;
    };
    division: string;
    fairRacingAverage: number;
    totalPoints: number;
  };
  invitedBy: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  createdAt: string;
}

export default function MyInvitationsCard({ token, onAccept }: MyInvitationsCardProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/squadron/my-invitations', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        setInvitations(data.invitations || []);
      } else {
        setError(data.error || 'Error al cargar invitaciones');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId: string, squadronName: string) => {
    if (!confirm(`¿Aceptar invitación de ${squadronName}?`)) return;

    setProcessingId(invitationId);
    setError('');
    try {
      const response = await fetch('/api/squadron/accept-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ invitationId }),
      });
      const data = await response.json();

      if (data.success) {
        onAccept();
      } else {
        setError(data.error || 'Error al aceptar invitación');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (invitationId: string) => {
    if (!confirm('¿Rechazar esta invitación?')) return;

    setProcessingId(invitationId);
    setError('');
    try {
      const response = await fetch('/api/squadron/reject-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ invitationId }),
      });
      const data = await response.json();

      if (data.success) {
        await fetchInvitations();
      } else {
        setError(data.error || 'Error al rechazar invitación');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-midnight via-purple-900/20 to-midnight border-2 border-purple-500/50 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="bg-gradient-to-br from-midnight via-purple-900/20 to-midnight border-2 border-purple-500/50 rounded-xl p-6">
        <h2 className="text-2xl font-racing text-purple-400 mb-4">📨 INVITACIONES RECIBIDAS</h2>
        <div className="text-center py-8">
          <p className="text-sky-blue/70">No tienes invitaciones pendientes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-midnight via-purple-900/20 to-midnight border-2 border-purple-500/50 rounded-xl p-6">
      <h2 className="text-2xl font-racing text-purple-400 mb-4">📨 INVITACIONES RECIBIDAS</h2>
      <p className="text-sky-blue/70 text-sm mb-4">
        Tienes {invitations.length} {invitations.length === 1 ? 'invitación' : 'invitaciones'} pendiente{invitations.length === 1 ? '' : 's'}
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {invitations.map((invitation) => (
          <div
            key={invitation._id}
            className="bg-midnight/50 border border-purple-500/30 rounded-lg p-4 hover:border-purple-500/60 transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Squadron info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex gap-1">
                    <div
                      className="w-6 h-6 rounded border border-white/20"
                      style={{ backgroundColor: invitation.squadronId.colors.primary }}
                    />
                    <div
                      className="w-6 h-6 rounded border border-white/20"
                      style={{ backgroundColor: invitation.squadronId.colors.secondary }}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-racing text-electric-blue">
                      {invitation.squadronId.name}
                    </h3>
                    <p className="text-xs text-sky-blue/70">
                      Invitado por {invitation.invitedBy.profile.firstName} {invitation.invitedBy.profile.lastName}
                    </p>
                  </div>
                </div>

                {invitation.squadronId.description && (
                  <p className="text-sm text-sky-blue/70 mb-2 line-clamp-2">
                    {invitation.squadronId.description}
                  </p>
                )}

                <div className="flex gap-4 text-xs">
                  <span className="text-sky-blue/60">
                    📊 {invitation.squadronId.division}
                  </span>
                  <span className="text-sky-blue/60">
                    ⚡ Fair Racing: {invitation.squadronId.fairRacingAverage}
                  </span>
                  <span className="text-sky-blue/60">
                    🏆 {invitation.squadronId.totalPoints} pts
                  </span>
                </div>

                <p className="text-xs text-sky-blue/50 mt-2">
                  Recibida: {new Date(invitation.createdAt).toLocaleString('es-CL')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleAccept(invitation._id, invitation.squadronId.name)}
                  disabled={processingId === invitation._id}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-400 text-white font-racing rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all disabled:opacity-50 text-sm whitespace-nowrap"
                >
                  {processingId === invitation._id ? '...' : '✓ ACEPTAR'}
                </button>
                <button
                  onClick={() => handleReject(invitation._id)}
                  disabled={processingId === invitation._id}
                  className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 text-sm whitespace-nowrap"
                >
                  {processingId === invitation._id ? '...' : '✕ RECHAZAR'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
