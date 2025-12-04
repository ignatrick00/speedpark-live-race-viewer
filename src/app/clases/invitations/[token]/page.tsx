'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';

interface InvitationDetails {
  id: string;
  inviterName: string;
  inviteeEmail: string;
  status: string;
  expiresAt: string;
  class: {
    id: string;
    coachName: string;
    date: string;
    startTime: string;
    endTime: string;
    groupPricePerPerson: number;
    currentParticipants: number;
    maxCapacity: number;
  };
}

export default function GroupInvitationPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { token: authToken, user } = useAuth();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responding, setResponding] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    fetchInvitation();
  }, [params.token]);

  const fetchInvitation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/group-invitations/${params.token}`);
      const data = await response.json();

      if (response.ok) {
        setInvitation(data.invitation);
      } else {
        setError(data.error || 'No se pudo cargar la invitación');
      }
    } catch (err) {
      console.error('Error fetching invitation:', err);
      setError('Error al cargar la invitación');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (action: 'accept' | 'reject') => {
    if (action === 'accept' && !authToken) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/clases/invitations/${params.token}`);
      return;
    }

    setResponding(true);
    try {
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/group-invitations/${params.token}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (response.ok) {
        setNotificationMessage(
          action === 'accept'
            ? '¡Invitación aceptada! Te has unido a la clase grupal'
            : 'Invitación rechazada'
        );
        setNotificationType('success');
        setShowNotification(true);

        // Redirect after showing notification
        setTimeout(() => {
          router.push('/clases');
        }, 2000);
      } else {
        setNotificationMessage(data.error || 'Error al responder la invitación');
        setNotificationType('error');
        setShowNotification(true);
      }
    } catch (err) {
      console.error('Error responding to invitation:', err);
      setNotificationMessage('Error al responder la invitación');
      setNotificationType('error');
      setShowNotification(true);
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-midnight via-racing-black to-midnight flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin text-6xl mb-4">🏁</div>
            <p className="text-sky-blue/70">Cargando invitación...</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-midnight via-racing-black to-midnight flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gradient-to-br from-midnight via-racing-black to-midnight border-2 border-red-400/50 rounded-lg p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-racing text-red-400 mb-4">Error</h1>
            <p className="text-sky-blue/90 mb-6">{error}</p>
            <button
              onClick={() => router.push('/clases')}
              className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 rounded-lg hover:from-yellow-300 hover:to-yellow-400 transition-all font-racing text-lg shadow-lg"
            >
              VER CLASES
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!invitation) {
    return null;
  }

  const expiresAt = new Date(invitation.expiresAt);
  const classDate = new Date(invitation.class.date);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-midnight via-racing-black to-midnight py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏁</div>
            <h1 className="text-4xl font-racing text-electric-blue mb-2">
              INVITACIÓN A CLASE GRUPAL
            </h1>
            <p className="text-sky-blue/70">
              {invitation.inviterName} te ha invitado a unirte
            </p>
          </div>

          {/* Invitation Card */}
          <div className="bg-gradient-to-br from-midnight via-racing-black to-midnight border-2 border-electric-blue/50 rounded-lg p-8 mb-6">
            {/* Coach Info */}
            <div className="mb-6">
              <h2 className="text-2xl font-racing text-gold mb-2">
                Coach: {invitation.class.coachName}
              </h2>
              <div className="h-1 w-20 bg-gold"></div>
            </div>

            {/* Class Details */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📅</span>
                <div>
                  <p className="text-sm text-sky-blue/70">Fecha</p>
                  <p className="text-xl text-white">
                    {classDate.toLocaleDateString('es-CL', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-3xl">⏰</span>
                <div>
                  <p className="text-sm text-sky-blue/70">Horario</p>
                  <p className="text-xl text-white">
                    {invitation.class.startTime} - {invitation.class.endTime}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-3xl">👥</span>
                <div>
                  <p className="text-sm text-sky-blue/70">Participantes</p>
                  <p className="text-xl text-white">
                    {invitation.class.currentParticipants}/{invitation.class.maxCapacity} cupos ocupados
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-3xl">💰</span>
                <div>
                  <p className="text-sm text-sky-blue/70">Precio por persona</p>
                  <p className="text-2xl font-racing text-gold">
                    ${invitation.class.groupPricePerPerson.toLocaleString('es-CL')}
                  </p>
                </div>
              </div>
            </div>

            {/* Expiration Notice */}
            <div className="bg-orange-900/20 border border-orange-400/30 rounded-lg p-4 mb-6">
              <p className="text-orange-400 text-sm">
                ⏳ Esta invitación expira el{' '}
                {expiresAt.toLocaleDateString('es-CL')} a las {expiresAt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => handleResponse('reject')}
                disabled={responding}
                className="flex-1 px-6 py-3 border-2 border-red-400/50 text-red-400 rounded-lg hover:bg-red-900/20 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                RECHAZAR
              </button>
              <button
                onClick={() => handleResponse('accept')}
                disabled={responding}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 rounded-lg hover:from-yellow-300 hover:to-yellow-400 transition-all font-racing text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {responding ? 'PROCESANDO...' : authToken ? 'ACEPTAR' : 'INICIAR SESIÓN Y ACEPTAR'}
              </button>
            </div>

            {!authToken && (
              <div className="mt-4 text-center">
                <p className="text-sky-blue/70 text-sm">
                  Debes iniciar sesión con la cuenta asociada a {invitation.inviteeEmail} para aceptar esta invitación
                </p>
              </div>
            )}
          </div>
        </div>
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
    </>
  );
}
