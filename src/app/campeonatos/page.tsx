'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import OrganizerGuard from '@/components/OrganizerGuard';
import Navbar from '@/components/Navbar';
import { EventCategoryConfig } from '@/types/squadron-events';

export default function CampeonatosPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'activos' | 'pasados'>('activos');

  useEffect(() => {
    if (token) {
      fetchEvents();
    }
  }, [token]);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/squadron-events', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeEvents = events.filter(e => e.raceStatus === 'in_review' || (e.linkedRaceSessionId && e.raceStatus !== 'finalized'));
  const pastEvents = events.filter(e => e.raceStatus === 'finalized');

  return (
    <OrganizerGuard>
      <div className="min-h-screen bg-black text-white">
        <Navbar />

        <div className="max-w-6xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-racing text-electric-blue mb-2">🏆 Campeonatos</h1>
            <p className="text-gray-400">
              Gestiona eventos y resultados de carreras
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setActiveTab('activos')}
              className={`px-6 py-3 rounded-lg font-bold transition-all ${
                activeTab === 'activos'
                  ? 'bg-electric-blue text-black'
                  : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
              }`}
            >
              🔍 Activos ({activeEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('pasados')}
              className={`px-6 py-3 rounded-lg font-bold transition-all ${
                activeTab === 'pasados'
                  ? 'bg-electric-blue text-black'
                  : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
              }`}
            >
              ✅ Finalizados ({pastEvents.length})
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-purple-400">Cargando eventos...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTab === 'activos' && activeEvents.length === 0 && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-2xl font-racing text-white mb-2">No hay eventos en revisión</h3>
                  <p className="text-gray-400 mb-6">
                    Los eventos con carreras vinculadas aparecerán aquí para aplicar sanciones
                  </p>
                </div>
              )}

              {activeTab === 'pasados' && pastEvents.length === 0 && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
                  <div className="text-6xl mb-4">✅</div>
                  <h3 className="text-2xl font-racing text-white mb-2">No hay eventos finalizados</h3>
                  <p className="text-gray-400 mb-6">
                    Los eventos con resultados finalizados aparecerán aquí
                  </p>
                </div>
              )}

              {activeTab === 'activos' && activeEvents.map((event) => (
                <div
                  key={event._id}
                  className="bg-gradient-to-br from-yellow-900/20 via-slate-800/80 to-slate-900/90 border-2 border-yellow-600/50 rounded-xl p-6 hover:border-yellow-500/70 transition-all cursor-pointer"
                  onClick={() => router.push(`/organizador/evento/${event._id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">🔍</span>
                        <div>
                          <h3 className="text-2xl font-racing text-white">{event.name}</h3>
                          <p className="text-yellow-400 font-bold text-sm">{EventCategoryConfig[event.category]?.name}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">Fecha:</span>{' '}
                          <span className="text-white">{new Date(event.eventDate).toLocaleDateString('es-CL')}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Ubicación:</span>{' '}
                          <span className="text-white">{event.location}</span>
                        </div>
                        {event.linkedRaceSessionId && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Carrera vinculada:</span>{' '}
                            <span className="text-electric-blue font-bold">{event.linkedRaceSessionId}</span>
                          </div>
                        )}
                        {event.sanctions && event.sanctions.length > 0 && (
                          <div>
                            <span className="text-gray-500">Sanciones:</span>{' '}
                            <span className="text-yellow-400 font-bold">{event.sanctions.length}</span>
                          </div>
                        )}
                      </div>

                      <div className="px-4 py-2 bg-yellow-600/20 text-yellow-400 border border-yellow-600/50 rounded-lg inline-block font-bold text-sm">
                        🔍 En Revisión - Aplicar Sanciones
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {activeTab === 'pasados' && pastEvents.map((event) => (
                <div
                  key={event._id}
                  className="bg-gradient-to-br from-green-900/20 via-slate-800/80 to-slate-900/90 border-2 border-green-600/30 rounded-xl p-6 hover:border-green-500/50 transition-all cursor-pointer"
                  onClick={() => router.push(`/organizador/evento/${event._id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">✅</span>
                        <div>
                          <h3 className="text-2xl font-racing text-white">{event.name}</h3>
                          <p className="text-green-400 font-bold text-sm">{EventCategoryConfig[event.category]?.name}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <span className="text-gray-500">Fecha:</span>{' '}
                          <span className="text-white">{new Date(event.eventDate).toLocaleDateString('es-CL')}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Finalizado:</span>{' '}
                          <span className="text-green-400">{new Date(event.finalizedAt).toLocaleDateString('es-CL')}</span>
                        </div>
                        {event.results && event.results.length > 0 && (
                          <div>
                            <span className="text-gray-500">Escuderías:</span>{' '}
                            <span className="text-white font-bold">{event.results.length}</span>
                          </div>
                        )}
                        {event.sanctions && event.sanctions.length > 0 && (
                          <div>
                            <span className="text-gray-500">Sanciones aplicadas:</span>{' '}
                            <span className="text-yellow-400 font-bold">{event.sanctions.length}</span>
                          </div>
                        )}
                      </div>

                      <div className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/50 rounded-lg inline-block font-bold text-sm">
                        ✅ Resultados Finales
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </OrganizerGuard>
  );
}
