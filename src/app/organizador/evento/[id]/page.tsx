'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import OrganizerGuard from '@/components/OrganizerGuard';
import Navbar from '@/components/Navbar';
import { EventCategoryConfig } from '@/types/squadron-events';

export default function EventoDetallePage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRaceSearchModal, setShowRaceSearchModal] = useState(false);

  useEffect(() => {
    if (token && params.id) {
      fetchEvent();
    }
  }, [token, params.id]);

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
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <OrganizerGuard>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-purple-400">Cargando evento...</p>
          </div>
        </div>
      </OrganizerGuard>
    );
  }

  if (!event) {
    return (
      <OrganizerGuard>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-400 text-xl mb-4">Evento no encontrado</p>
            <button
              onClick={() => router.push('/organizador')}
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              Volver
            </button>
          </div>
        </div>
      </OrganizerGuard>
    );
  }

  const config = EventCategoryConfig[event.category];

  return (
    <OrganizerGuard>
      <div className="min-h-screen bg-black text-white">
        <Navbar />

        <div className="max-w-6xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/organizador')}
              className="text-purple-400 hover:text-purple-300 mb-4 flex items-center gap-2"
            >
              ← Volver a eventos
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
                <span className="px-4 py-2 bg-gray-700 text-white rounded-full text-sm font-bold">
                  {event.status}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-black/30 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Puntos Ganador</p>
                  <p className="text-2xl font-bold text-purple-400">{config.points}</p>
                </div>
                <div className="bg-black/30 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Fecha</p>
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
                  <p className="text-xs text-gray-500 mb-1">Ubicación</p>
                  <p className="text-lg font-bold">{event.location}</p>
                </div>
                <div className="bg-black/30 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Escuderías</p>
                  <p className="text-lg font-bold">{event.participants?.length || 0}/{event.maxSquadrons}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-6">
              <h3 className="text-xl font-bold text-purple-400 mb-4">Configuración</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Máximo Escuderías:</span>
                  <span className="font-bold">{event.maxSquadrons}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pilotos por Escudería:</span>
                  <span className="font-bold">{event.minPilotsPerSquadron} - {event.maxPilotsPerSquadron}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Cierre Inscripciones:</span>
                  <span className="font-bold">{new Date(event.registrationDeadline).toLocaleDateString('es-CL')}</span>
                </div>
              </div>
            </div>

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
          </div>

          {/* Participants */}
          {event.participants && event.participants.length > 0 && (
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-6 mb-8">
              <h3 className="text-xl font-bold text-purple-400 mb-4">Escuderías Inscritas</h3>
              <div className="space-y-2">
                {event.participants.map((participant: any, index: number) => (
                  <div key={index} className="flex items-center justify-between bg-black/30 p-4 rounded-lg">
                    <span className="font-bold">{participant.squadronId?.name || 'Escudería'}</span>
                    <span className="text-sm text-gray-400">{participant.confirmedPilots?.length || 0} pilotos</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 flex-wrap">
            {event.status === 'draft' && (
              <button
                onClick={async () => {
                  if (!confirm('¿Publicar este evento? Los corredores podrán verlo y registrarse.')) return;

                  try {
                    const response = await fetch(`/api/squadron-events/${event._id}/publish`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` },
                    });

                    if (response.ok) {
                      alert('Evento publicado exitosamente');
                      fetchEvent();
                    } else {
                      const data = await response.json();
                      alert(data.error || 'Error al publicar evento');
                    }
                  } catch (error) {
                    alert('Error al publicar evento');
                  }
                }}
                className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-all"
              >
                📢 Publicar Evento
              </button>
            )}

            <button
              onClick={() => setShowRaceSearchModal(true)}
              className="px-6 py-3 bg-electric-blue text-black rounded-xl font-bold hover:bg-cyan-300 transition-all"
            >
              🔍 Buscar Carrera
            </button>

            <button
              onClick={() => router.push(`/organizador/evento/${event._id}/editar`)}
              className="px-6 py-3 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 transition-all"
            >
              Editar Evento
            </button>
            <button
              onClick={async () => {
                if (!confirm('¿Estás seguro de eliminar este evento? Esta acción no se puede deshacer.')) return;

                try {
                  const response = await fetch(`/api/squadron-events/${event._id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                  });

                  if (response.ok) {
                    alert('Evento eliminado exitosamente');
                    router.push('/organizador');
                  } else {
                    const data = await response.json();
                    alert(data.error || 'Error al eliminar evento');
                  }
                } catch (error) {
                  console.error('Error deleting event:', error);
                  alert('Error al eliminar evento');
                }
              }}
              className="px-6 py-3 bg-red-500/20 text-red-400 border border-red-500/50 rounded-xl font-bold hover:bg-red-500/30 transition-all"
            >
              🗑️ Eliminar Evento
            </button>
          </div>
        </div>

        {/* Race Search Modal - Placeholder */}
        {showRaceSearchModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-electric-blue/30 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-racing text-electric-blue">🔍 Buscar Carrera</h2>
                  <button
                    onClick={() => setShowRaceSearchModal(false)}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6">
                <p className="text-gray-400 text-center py-12">
                  Modal de búsqueda de carreras en desarrollo...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </OrganizerGuard>
  );
}
