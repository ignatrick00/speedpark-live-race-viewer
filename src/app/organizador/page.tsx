'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import OrganizerGuard from '@/components/OrganizerGuard';
import Navbar from '@/components/Navbar';
import { EventCategory, EventCategoryConfig } from '@/types/squadron-events';

interface SquadronEvent {
  _id: string;
  name: string;
  description?: string;
  category: EventCategory;
  eventDate: string;
  registrationDeadline: string;
  status: string;
  participants: any[];
  maxSquadrons: number;
}

export default function OrganizerPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [events, setEvents] = useState<SquadronEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');

  useEffect(() => {
    if (token) {
      fetchEvents();
    }
  }, [token]);

  // Refresh when page becomes visible
  useEffect(() => {
    const handleFocus = () => {
      if (token) fetchEvents();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [token]);

  const fetchEvents = async () => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/squadron-events', { headers });
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      } else {
        console.error('Error response:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') {
      return ['draft', 'published', 'registration_open', 'registration_closed'].includes(event.status);
    }
    if (filter === 'completed') {
      return ['completed', 'cancelled'].includes(event.status);
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; color: string }> = {
      draft: { text: 'Borrador', color: 'bg-gray-500' },
      published: { text: 'Publicado', color: 'bg-blue-500' },
      registration_open: { text: 'Inscripciones Abiertas', color: 'bg-green-500' },
      registration_closed: { text: 'Inscripciones Cerradas', color: 'bg-orange-500' },
      in_progress: { text: 'En Progreso', color: 'bg-yellow-500' },
      completed: { text: 'Completado', color: 'bg-purple-500' },
      cancelled: { text: 'Cancelado', color: 'bg-red-500' },
    };

    const badge = badges[status] || { text: status, color: 'bg-gray-500' };
    return (
      <span className={`px-3 py-1 ${badge.color} text-white text-xs font-bold rounded-full`}>
        {badge.text}
      </span>
    );
  };

  return (
    <OrganizerGuard>
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        {/* Navbar */}
        <Navbar />

        {/* Background Effects */}
        <div className="fixed inset-0 z-0">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(168, 85, 247, 0.1) 2px, transparent 2px)',
              backgroundSize: '100px 100px'
            }}
          />
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-400/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto p-8">
          {/* Header */}
          <header className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">🎯</span>
                  </div>
                  <h1 className="font-bold text-5xl md:text-6xl tracking-wider bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                    ORGANIZADOR
                  </h1>
                </div>
                <p className="text-gray-400 text-lg ml-16">Eventos de Escuderías</p>
                <p className="text-purple-400 text-sm ml-16">🛡️ {user?.email}</p>
              </div>

              <button
                onClick={() => router.push('/organizador/crear-evento')}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-purple-500/50 flex items-center gap-2"
              >
                <span className="text-2xl">+</span>
                Crear Evento
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === 'all'
                    ? 'bg-purple-500 text-white'
                    : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter('upcoming')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === 'upcoming'
                    ? 'bg-purple-500 text-white'
                    : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
                }`}
              >
                Próximos
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === 'completed'
                    ? 'bg-purple-500 text-white'
                    : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
                }`}
              >
                Completados
              </button>
            </div>

            {/* Category Legend */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {Object.entries(EventCategoryConfig).map(([key, config]) => (
                <div
                  key={key}
                  className={`p-4 rounded-xl bg-gradient-to-br ${config.color}/10 border border-white/10`}
                >
                  <h3 className="font-bold text-white mb-1">{config.name}</h3>
                  <p className="text-xs text-gray-400 mb-2">{config.description}</p>
                  <p className="text-sm text-purple-400 font-bold">{config.points} pts</p>
                  {config.requiredRank && (
                    <p className="text-xs text-gray-500">Top {config.requiredRank}</p>
                  )}
                  {!config.requiredRank && (
                    <p className="text-xs text-green-400">Sin restricciones</p>
                  )}
                </div>
              ))}
            </div>
          </header>

          {/* Events List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-purple-400">Cargando eventos...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12 bg-purple-500/5 rounded-2xl border border-purple-500/20">
              <p className="text-gray-400 mb-4">No hay eventos {filter !== 'all' ? filter === 'upcoming' ? 'próximos' : 'completados' : ''}</p>
              <button
                onClick={() => router.push('/organizador/crear-evento')}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                Crear Primer Evento
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => {
                const config = EventCategoryConfig[event.category];
                const participantCount = event.participants.filter((p: any) => p.status !== 'cancelled').length;

                return (
                  <div
                    key={event._id}
                    onClick={() => router.push(`/organizador/evento/${event._id}`)}
                    className={`group relative bg-gradient-to-br ${config.color}/10 border-2 border-transparent hover:border-white/20 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl`}
                  >
                    {/* Card Content */}
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="text-xs text-purple-400 font-bold mb-1">
                            {config.name}
                          </div>
                          <h3 className="font-bold text-xl text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-purple-400 transition-all">
                            {event.name}
                          </h3>
                        </div>
                        {getStatusBadge(event.status)}
                      </div>

                      {event.description && (
                        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <span>📅</span>
                          <span>{new Date(event.eventDate).toLocaleDateString('es-CL')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <span>🏁</span>
                          <span>{participantCount}/{event.maxSquadrons} Escuderías</span>
                        </div>
                        <div className="flex items-center gap-2 text-purple-400 font-bold">
                          <span>🏆</span>
                          <span>{config.points} puntos</span>
                        </div>
                      </div>

                      {/* Action Indicator */}
                      <div className="mt-6 flex items-center justify-center gap-2 text-purple-400 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <span className="text-sm font-medium">VER DETALLES</span>
                        <span className="text-lg">→</span>
                      </div>
                    </div>

                    {/* Hover Glow Effect */}
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${config.color}/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl -z-10`}></div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-12">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 rounded-lg hover:from-cyan-500/30 hover:to-blue-500/30 hover:border-cyan-400/50 transition-all duration-300 text-cyan-400 hover:text-white font-medium"
            >
              🏠 Mi Dashboard
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-lg hover:from-green-500/30 hover:to-emerald-500/30 hover:border-green-400/50 transition-all duration-300 text-green-400 hover:text-white font-medium"
            >
              🏁 Live Race
            </button>
          </div>

          {/* Footer */}
          <footer className="mt-16 text-center text-gray-500 text-sm">
            <p>⚡ Panel de Organizador v1.0 | Gestión de Eventos de Escuderías</p>
          </footer>
        </div>
      </div>
    </OrganizerGuard>
  );
}
