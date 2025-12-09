'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface RaceEvent {
  _id: string;
  eventId: string;
  eventName: string;
  eventCategory: string;
  basePoints: number;
  eventDate: string;
  raceSessionName: string;
  status: 'pending' | 'calculated' | 'finalized';
  results: any[];
  createdAt: string;
}

export default function EventosRacingPage() {
  const { token, user, isOrganizer } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<RaceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'finalized'>('all');

  useEffect(() => {
    if (!token) {
      router.push('/');
      return;
    }

    if (!isOrganizer) {
      router.push('/');
      return;
    }

    fetchEvents();
  }, [token, isOrganizer, router]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/squadron-race-events', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Grand Prix Élite': return 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30';
      case 'Racing Masters': return 'from-gray-400/20 to-gray-500/10 border-gray-400/30';
      case 'Pro Championship': return 'from-orange-500/20 to-orange-600/10 border-orange-500/30';
      case 'Open Series': return 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30';
      default: return 'from-slate-500/20 to-slate-600/10 border-slate-500/30';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full text-xs font-bold">⏳ Pendiente</span>;
      case 'calculated':
        return <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-xs font-bold">🧮 Calculado</span>;
      case 'finalized':
        return <span className="px-3 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full text-xs font-bold">✅ Finalizado</span>;
      default:
        return null;
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    return event.status === filter;
  });

  if (!isOrganizer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-racing text-electric-blue mb-2">🏁 Eventos de Puntuación</h1>
            <p className="text-gray-400">Asignar puntos a escuderías basado en resultados de carreras</p>
          </div>
          <button
            onClick={() => router.push('/eventos-racing/crear')}
            className="px-6 py-3 bg-electric-blue text-black rounded-lg hover:bg-cyan-300 transition-all font-bold"
          >
            ➕ Crear Evento
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-electric-blue text-black'
                : 'bg-slate-800 text-gray-400 hover:text-white'
            }`}
          >
            Todos ({events.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'pending'
                ? 'bg-yellow-500 text-black'
                : 'bg-slate-800 text-gray-400 hover:text-white'
            }`}
          >
            Pendientes ({events.filter(e => e.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('finalized')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filter === 'finalized'
                ? 'bg-green-500 text-black'
                : 'bg-slate-800 text-gray-400 hover:text-white'
            }`}
          >
            Finalizados ({events.filter(e => e.status === 'finalized').length})
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Events List */}
        {!loading && filteredEvents.length === 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-white mb-2">No hay eventos</h3>
            <p className="text-gray-400 mb-6">
              {filter === 'all'
                ? 'Crea tu primer evento de puntuación'
                : `No hay eventos ${filter === 'pending' ? 'pendientes' : 'finalizados'}`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => router.push('/eventos-racing/crear')}
                className="px-6 py-3 bg-electric-blue text-black rounded-lg hover:bg-cyan-300 transition-all font-bold"
              >
                ➕ Crear Evento
              </button>
            )}
          </div>
        )}

        {!loading && filteredEvents.length > 0 && (
          <div className="grid gap-6">
            {filteredEvents.map((event) => (
              <div
                key={event._id}
                className={`bg-gradient-to-r ${getCategoryColor(event.eventCategory)} border rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer`}
                onClick={() => router.push(`/eventos-racing/${event._id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-racing text-white">{event.eventName}</h3>
                      {getStatusBadge(event.status)}
                    </div>
                    <p className="text-gray-400 text-sm">{event.eventCategory}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-electric-blue">{event.basePoints.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">puntos base</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">📅 Fecha del evento</div>
                    <div className="text-white font-medium">
                      {new Date(event.eventDate).toLocaleDateString('es-CL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">🏁 Carrera seleccionada</div>
                    <div className="text-white font-medium">{event.raceSessionName}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">🏆 Escuderías participantes</div>
                    <div className="text-white font-medium">{event.results?.length || 0} escuderías</div>
                  </div>
                </div>

                {event.status === 'finalized' && event.results?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="text-xs text-gray-400 mb-2">🥇 Ganador</div>
                    <div className="text-white font-bold">
                      {event.results[0]?.squadronName || 'N/A'} - {event.results[0]?.pointsAwarded?.toLocaleString() || 0} pts
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
