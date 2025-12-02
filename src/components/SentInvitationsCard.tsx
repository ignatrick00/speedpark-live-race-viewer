'use client';

import { useState, useEffect } from 'react';

interface SentInvitationsCardProps {
  token: string;
  isCaptain: boolean;
}

interface SentInvitation {
  _id: string;
  pilotId: string;
  pilotEmail: string;
  pilotName: string;
  pilotAlias?: string;
  createdAt: string;
  status: string;
}

export default function SentInvitationsCard({ token, isCaptain }: SentInvitationsCardProps) {
  const [invitations, setInvitations] = useState<SentInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isCaptain) {
      fetchInvitations();
      // Refrescar cada 10 segundos
      const interval = setInterval(fetchInvitations, 10000);
      return () => clearInterval(interval);
    }
  }, [isCaptain]);

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/squadron/sent-invitations', {
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

  if (!isCaptain) return null;
  if (loading) return null;
  if (invitations.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-midnight via-purple-900/20 to-midnight border-2 border-purple-500/50 rounded-xl p-6">
      <h3 className="text-2xl font-racing text-purple-400 mb-4">📤 INVITACIONES ENVIADAS</h3>
      <p className="text-sky-blue/70 text-sm mb-4">
        {invitations.length} {invitations.length === 1 ? 'invitación pendiente' : 'invitaciones pendientes'}
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
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-racing text-lg">
                    {invitation.pilotName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sky-blue font-digital">
                      {invitation.pilotName}
                      {invitation.pilotAlias && (
                        <span className="text-sky-blue/50 text-sm ml-2">@{invitation.pilotAlias}</span>
                      )}
                    </p>
                    <p className="text-xs text-sky-blue/50">{invitation.pilotEmail}</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 rounded text-xs font-digital">
                  ⏳ PENDIENTE
                </div>
                <p className="text-xs text-sky-blue/50 mt-1">
                  {new Date(invitation.createdAt).toLocaleDateString('es-CL')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
