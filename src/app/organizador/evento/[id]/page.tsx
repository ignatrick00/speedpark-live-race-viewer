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

  // Race search states
  const [races, setRaces] = useState<any[]>([]);
  const [searchingRaces, setSearchingRaces] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    eventDate: '',
    sessionType: '',
    search: ''
  });
  const [selectedRace, setSelectedRace] = useState<any>(null);
  const [raceDetails, setRaceDetails] = useState<any>(null);
  const [loadingRaceDetails, setLoadingRaceDetails] = useState(false);
  const [calculatedResults, setCalculatedResults] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);

  // Sanctions states
  const [sanctions, setSanctions] = useState<any[]>([]);
  const [showSanctionForm, setShowSanctionForm] = useState(false);
  const [sanctionForm, setSanctionForm] = useState({
    driverName: '',
    sanctionType: 'position_penalty',
    description: '',
    positionPenalty: 0,
    pointsPenalty: 0
  });
  const [applyingSanction, setApplyingSanction] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [availablePilots, setAvailablePilots] = useState<any[]>([]);

  useEffect(() => {
    if (token && params.id) {
      fetchEvent();
    }
  }, [token, params.id]);

  // Load sanctions and results when event has a linked race
  useEffect(() => {
    if (token && event && event.linkedRaceSessionId && event.raceStatus !== 'pending') {
      fetchSanctions();
      // Load calculated results to show preview
      loadCalculatedResults();
      // Load available pilots for sanctions
      loadAvailablePilots();
    }
  }, [token, event?.linkedRaceSessionId, event?.raceStatus]);

  const loadCalculatedResults = async () => {
    if (!event?.linkedRaceSessionId) return;

    try {
      console.log('🔄 [FRONTEND] Cargando resultados calculados...');
      const response = await fetch(`/api/squadron-events/${params.id}/calculate-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ raceSessionId: event.linkedRaceSessionId })
      });

      console.log('📡 [FRONTEND] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [FRONTEND] Datos recibidos:', data);
        console.log('📊 [FRONTEND] Results object:', data.results);
        console.log('🏆 [FRONTEND] Squadrons:', data.results?.squadrons);
        setCalculatedResults(data.results);
        console.log('💾 [FRONTEND] State actualizado');
      } else {
        const errorData = await response.json();
        console.error('❌ [FRONTEND] Error response:', errorData);
      }
    } catch (error) {
      console.error('💥 [FRONTEND] Error loading calculated results:', error);
    }
  };

  const loadAvailablePilots = async () => {
    if (!event?.linkedRaceSessionId) {
      console.log('⚠️ [FRONTEND] No hay linkedRaceSessionId, no se pueden cargar pilotos');
      return;
    }

    try {
      console.log('👥 [FRONTEND] Cargando pilotos para carrera:', event.linkedRaceSessionId);
      const response = await fetch(`/api/race-sessions/${event.linkedRaceSessionId}/pilots-with-squadron`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 [FRONTEND] Pilots response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [FRONTEND] Pilotos recibidos:', data);
        console.log('👥 [FRONTEND] Cantidad de pilotos:', data.pilots?.length || 0);
        setAvailablePilots(data.pilots || []);
      } else {
        console.error('❌ [FRONTEND] Error al cargar pilotos, status:', response.status);
      }
    } catch (error) {
      console.error('💥 [FRONTEND] Error loading available pilots:', error);
    }
  };

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/squadron-events/${params.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📋 [FRONTEND] Evento cargado:', {
          id: data.event._id,
          name: data.event.name,
          linkedRaceSessionId: data.event.linkedRaceSessionId,
          raceStatus: data.event.raceStatus
        });
        setEvent(data.event);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchRaces = async (dateToSearch?: string) => {
    const searchDate = dateToSearch || searchFilters.eventDate;
    if (!searchDate) return;

    try {
      setSearchingRaces(true);
      const response = await fetch(`/api/races-v0?date=${searchDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          let filteredRaces = data.races || [];

          // Apply filters
          if (searchFilters.sessionType) {
            filteredRaces = filteredRaces.filter((race: any) =>
              race.sessionType === searchFilters.sessionType
            );
          }
          if (searchFilters.search) {
            filteredRaces = filteredRaces.filter((race: any) =>
              race.sessionName.toLowerCase().includes(searchFilters.search.toLowerCase())
            );
          }

          setRaces(filteredRaces);
        }
      }
    } catch (error) {
      console.error('Error searching races:', error);
    } finally {
      setSearchingRaces(false);
    }
  };

  // Auto-search when date changes
  useEffect(() => {
    if (showRaceSearchModal && searchFilters.eventDate) {
      searchRaces();
    }
  }, [searchFilters.eventDate, searchFilters.sessionType, searchFilters.search, showRaceSearchModal]);

  const loadRaceDetails = async (raceSessionId: string) => {
    try {
      setLoadingRaceDetails(true);
      const response = await fetch(`/api/race-results-v0?sessionId=${encodeURIComponent(raceSessionId)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRaceDetails(data.race);
        }
      }
    } catch (error) {
      console.error('Error loading race details:', error);
    } finally {
      setLoadingRaceDetails(false);
    }
  };

  const calculatePoints = async (raceSessionId: string) => {
    try {
      setCalculating(true);
      const response = await fetch(`/api/squadron-events/${params.id}/calculate-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ raceSessionId })
      });

      if (response.ok) {
        const data = await response.json();
        alert('✅ Carrera asociada exitosamente!\n\nAhora puedes aplicar sanciones y publicar los puntos finales.');
        // Close modal and reload event
        setShowRaceSearchModal(false);
        setCalculatedResults(null);
        setRaceDetails(null);
        setSelectedRace(null);
        await fetchEvent();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al asociar carrera');
      }
    } catch (error) {
      console.error('Error calculating points:', error);
      alert('Error al asociar carrera');
    } finally {
      setCalculating(false);
    }
  };

  const fetchSanctions = async () => {
    try {
      console.log('🔍 [FRONTEND] Cargando sanciones...');
      const response = await fetch(`/api/squadron-events/${params.id}/sanctions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 [FRONTEND] Sanctions response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [FRONTEND] Sanciones recibidas:', data);
        console.log('📋 [FRONTEND] Array de sanciones:', data.sanctions);
        console.log('🔢 [FRONTEND] Cantidad de sanciones:', data.sanctions?.length || 0);
        setSanctions(data.sanctions || []);
      } else {
        console.error('❌ [FRONTEND] Error al cargar sanciones, status:', response.status);
      }
    } catch (error) {
      console.error('💥 [FRONTEND] Error fetching sanctions:', error);
    }
  };

  const applySanction = async () => {
    if (!sanctionForm.driverName || !sanctionForm.description) {
      alert('Piloto y descripción son requeridos');
      return;
    }

    try {
      setApplyingSanction(true);
      const response = await fetch(`/api/squadron-events/${params.id}/sanctions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sanctionForm)
      });

      if (response.ok) {
        alert('Sanción aplicada exitosamente');
        setShowSanctionForm(false);
        setSanctionForm({
          driverName: '',
          sanctionType: 'position_penalty',
          description: '',
          positionPenalty: 0,
          pointsPenalty: 0
        });

        // Reload sanctions list and recalculate points
        await fetchSanctions();
        await loadCalculatedResults();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al aplicar sanción');
      }
    } catch (error) {
      console.error('Error applying sanction:', error);
      alert('Error al aplicar sanción');
    } finally {
      setApplyingSanction(false);
    }
  };

  const deleteSanction = async (sanctionId: string) => {
    if (!confirm('¿Eliminar esta sanción?')) return;

    try {
      const response = await fetch(`/api/squadron-events/${params.id}/sanctions?sanctionId=${sanctionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('Sanción eliminada');
        // Reload sanctions list and recalculate points
        await fetchSanctions();
        await loadCalculatedResults();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al eliminar sanción');
      }
    } catch (error) {
      console.error('Error deleting sanction:', error);
      alert('Error al eliminar sanción');
    }
  };

  const finalizeEvent = async () => {
    if (!event?.linkedRaceSessionId) {
      alert('No hay carrera asociada');
      return;
    }

    const confirmMessage = `¿Publicar puntos finales?\n\nEsto hará:\n- Recalculará los puntos con las sanciones aplicadas\n- Aplicará los puntos a las escuderías\n- Enviará ${sanctions.length} notificaciones de sanciones\n- Bloqueará los resultados (no se podrán modificar)\n\n¿Continuar?`;

    if (!confirm(confirmMessage)) return;

    try {
      setFinalizing(true);

      // First, recalculate points with current sanctions
      const calcResponse = await fetch(`/api/squadron-events/${params.id}/calculate-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ raceSessionId: event.linkedRaceSessionId })
      });

      if (!calcResponse.ok) {
        alert('Error al recalcular puntos');
        return;
      }

      const calcData = await calcResponse.json();

      // Then finalize with calculated results
      const response = await fetch(`/api/squadron-events/${params.id}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ calculatedResults: calcData.results })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Puntos finales publicados!\n\n` +
              `Puntos aplicados: ${data.appliedPoints?.length || 0} escuderías\n` +
              `Notificaciones enviadas: ${data.sanctionsNotified || 0} pilotos`);

        // Reload event to show finalized status
        await fetchEvent();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al publicar resultados');
      }
    } catch (error) {
      console.error('Error finalizing event:', error);
      alert('Error al publicar resultados');
    } finally {
      setFinalizing(false);
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

          {/* Race Results & Sanctions Section - Shown when race is associated */}
          {(event.raceStatus === 'in_review' || event.raceStatus === 'finalized') && event.linkedRaceSessionId && (
            <div className="mb-8">
              <div className="bg-gradient-to-r from-purple-500/10 to-electric-blue/10 border border-purple-500/30 rounded-2xl p-8">
                {/* Header with Status */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">🏁 Resultados de Carrera</h2>
                  <div className={`px-4 py-2 rounded-lg font-bold ${
                    event.raceStatus === 'finalized' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                    'bg-yellow-600/20 text-yellow-400 border border-yellow-600/50'
                  }`}>
                    {event.raceStatus === 'finalized' ? '✅ Resultados Finales' : '🔍 En Revisión'}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <p className="text-gray-400 text-sm">
                    Carrera ID: {event.linkedRaceSessionId}
                  </p>
                  {event.raceStatus === 'in_review' && (
                    <button
                      onClick={() => loadCalculatedResults()}
                      className="px-4 py-2 bg-electric-blue/20 text-electric-blue border border-electric-blue/50 rounded-lg text-sm font-bold hover:bg-electric-blue/30 transition-all"
                    >
                      🔄 Recargar Preview
                    </button>
                  )}
                </div>

                {/* Points Preview */}
                {calculatedResults && (
                  <div className="mb-6 space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">📊 Preview de Puntos</h3>
                      {calculatedResults.sanctionsApplied > 0 && (
                        <span className="px-3 py-1 bg-yellow-600/20 text-yellow-400 text-xs font-bold rounded-full border border-yellow-600/50">
                          ⚠️ {calculatedResults.sanctionsApplied} sanción(es) aplicada(s)
                        </span>
                      )}
                    </div>
                    {calculatedResults.squadrons.map((squadron: any, index: number) => (
                      <div
                        key={squadron.squadronId}
                        className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}°`}
                            </span>
                            <div>
                              <h4 className="text-white font-bold text-lg">{squadron.squadronName}</h4>
                              <p className="text-sm text-gray-400">{squadron.pilots.length} pilotos</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-electric-blue">
                              +{squadron.pointsAwarded.toLocaleString()} pts
                            </div>
                            <div className="text-xs text-gray-400">
                              {squadron.percentageAwarded}% • {squadron.totalPoints} pts totales
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-slate-700 pt-3 mt-3">
                          <p className="text-xs text-gray-400 mb-2">Pilotos participantes:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {squadron.pilots.map((pilot: any) => {
                              const hasSanction = sanctions.some(
                                (s: any) => s.driverName.toLowerCase() === pilot.driverName.toLowerCase()
                              );
                              const sanctionData = hasSanction
                                ? sanctions.find((s: any) => s.driverName.toLowerCase() === pilot.driverName.toLowerCase())
                                : null;

                              return (
                                <div key={pilot.webUserId} className={`text-sm p-2 rounded ${hasSanction ? 'bg-yellow-600/10 border border-yellow-600/30' : ''}`}>
                                  <span className="text-white">{pilot.driverName}</span>
                                  <span className="text-gray-400 ml-2">
                                    {pilot.finalPosition}° • {pilot.individualPoints} pts
                                  </span>
                                  {hasSanction && sanctionData && (
                                    <div className="text-xs text-yellow-400 mt-1">
                                      ⚠️ {sanctionData.sanctionType === 'position_penalty'
                                        ? `+${sanctionData.positionPenalty} pos`
                                        : sanctionData.sanctionType === 'disqualification'
                                        ? 'DSQ'
                                        : sanctionData.sanctionType}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sanctions Section */}
                {event.raceStatus === 'in_review' && (
                  <div className="mb-6 bg-slate-800/50 border border-yellow-600/30 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        ⚠️ Sanciones
                        {sanctions.length > 0 && (
                          <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs font-bold rounded-full">
                            {sanctions.length}
                          </span>
                        )}
                      </h3>
                      <button
                        onClick={() => setShowSanctionForm(!showSanctionForm)}
                        className="px-4 py-2 bg-yellow-600/20 text-yellow-400 border border-yellow-600/50 rounded-lg hover:bg-yellow-600/30 transition-all font-bold text-sm"
                      >
                        {showSanctionForm ? '✕ Cancelar' : '+ Aplicar Sanción'}
                      </button>
                    </div>

                    {/* Sanction Form */}
                    {showSanctionForm && (
                      <div className="mb-4 bg-slate-900/50 rounded-lg p-4 border border-yellow-600/20">
                        <p className="text-sm text-gray-400 mb-4">
                          Aplicar sanción a un piloto participante en la carrera
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm text-gray-400 mb-2">Piloto *</label>
                            <select
                              value={sanctionForm.driverName}
                              onChange={(e) => setSanctionForm({...sanctionForm, driverName: e.target.value})}
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            >
                              <option value="">Seleccionar piloto...</option>
                              {(() => {
                                console.log('🎨 [RENDER] availablePilots al renderizar dropdown:', availablePilots);
                                console.log('🎨 [RENDER] Cantidad:', availablePilots.length);
                                return availablePilots.map((pilot: any) => (
                                  <option key={pilot.driverName} value={pilot.driverName}>
                                    P{pilot.position} - {pilot.driverName} [{pilot.squadronTag}]
                                  </option>
                                ));
                              })()}
                            </select>
                            {availablePilots.length === 0 && (
                              <p className="text-xs text-yellow-500 mt-1">
                                ⚠️ No hay pilotos vinculados a escuderías en esta carrera
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm text-gray-400 mb-2">Tipo de Sanción *</label>
                            <select
                              value={sanctionForm.sanctionType}
                              onChange={(e) => setSanctionForm({...sanctionForm, sanctionType: e.target.value})}
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            >
                              <option value="position_penalty">Penalización de Posición</option>
                              <option value="point_deduction">Deducción de Puntos</option>
                              <option value="disqualification">Descalificación</option>
                              <option value="warning">Advertencia</option>
                            </select>
                          </div>
                        </div>

                        {sanctionForm.sanctionType === 'position_penalty' && (
                          <div className="mb-4">
                            <label className="block text-sm text-gray-400 mb-2">Posiciones a penalizar</label>
                            <input
                              type="number"
                              min="1"
                              value={sanctionForm.positionPenalty}
                              onChange={(e) => setSanctionForm({...sanctionForm, positionPenalty: parseInt(e.target.value) || 0})}
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                              placeholder="Ej: 3 (baja 3 posiciones)"
                            />
                          </div>
                        )}

                        {sanctionForm.sanctionType === 'point_deduction' && (
                          <div className="mb-4">
                            <label className="block text-sm text-gray-400 mb-2">Puntos a deducir</label>
                            <input
                              type="number"
                              min="1"
                              value={sanctionForm.pointsPenalty}
                              onChange={(e) => setSanctionForm({...sanctionForm, pointsPenalty: parseInt(e.target.value) || 0})}
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                              placeholder="Puntos a deducir de la escudería"
                            />
                          </div>
                        )}

                        <div className="mb-4">
                          <label className="block text-sm text-gray-400 mb-2">Descripción *</label>
                          <textarea
                            value={sanctionForm.description}
                            onChange={(e) => setSanctionForm({...sanctionForm, description: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                            placeholder="Razón de la sanción (ej: Adelantó con bandera amarilla)"
                            rows={3}
                            maxLength={500}
                          />
                        </div>

                        <button
                          onClick={applySanction}
                          disabled={applyingSanction}
                          className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg font-bold hover:bg-yellow-700 transition-all disabled:opacity-50"
                        >
                          {applyingSanction ? 'Aplicando...' : '⚠️ Aplicar Sanción'}
                        </button>
                      </div>
                    )}

                    {/* Applied Sanctions List */}
                    {sanctions.length > 0 ? (
                      <div className="space-y-2">
                        {sanctions.map((sanction: any) => (
                          <div
                            key={sanction._id}
                            className="bg-slate-900/70 border border-yellow-600/20 rounded-lg p-4"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-bold text-white">{sanction.driverName}</span>
                                  <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs font-bold rounded-full">
                                    {sanction.sanctionType === 'position_penalty' ? `+${sanction.positionPenalty} pos` :
                                     sanction.sanctionType === 'point_deduction' ? `-${sanction.pointsPenalty} pts` :
                                     sanction.sanctionType === 'disqualification' ? 'DSQ' :
                                     'WARNING'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-300 mb-1">{sanction.description}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(sanction.appliedAt).toLocaleString('es-CL')}
                                </p>
                              </div>
                              <button
                                onClick={() => deleteSanction(sanction._id)}
                                className="ml-4 px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/50 rounded hover:bg-red-500/30 transition-all text-sm"
                              >
                                ✕ Eliminar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 py-4">
                        No hay sanciones aplicadas a esta carrera
                      </p>
                    )}
                  </div>
                )}

                {/* Finalize Button */}
                {event.raceStatus === 'in_review' && (
                  <button
                    onClick={finalizeEvent}
                    disabled={finalizing}
                    className="w-full px-6 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-all disabled:opacity-50"
                  >
                    {finalizing ? '⏳ Publicando...' : '✅ Aplicar Sanciones y Publicar Puntos Finales'}
                  </button>
                )}

                {event.raceStatus === 'finalized' && event.finalizedAt && (
                  <div className="text-center py-6 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-green-400 font-bold text-lg mb-2">✅ Resultados Publicados</p>
                    <p className="text-gray-400 text-sm">
                      Finalizado: {new Date(event.finalizedAt).toLocaleString('es-CL')}
                    </p>
                  </div>
                )}
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
                {!selectedRace && !raceDetails && !calculatedResults && (
                  <>
                    {/* Search Filters */}
                    <div className="mb-6">
                      <label className="block text-sm text-gray-400 mb-2">📅 Fecha del Evento</label>
                      <input
                        type="date"
                        value={searchFilters.eventDate}
                        onChange={(e) => setSearchFilters({...searchFilters, eventDate: e.target.value})}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                      />
                    </div>

                    {/* Optional Filters */}
                    {searchFilters.eventDate && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Tipo de Sesión (opcional)</label>
                          <select
                            value={searchFilters.sessionType}
                            onChange={(e) => setSearchFilters({...searchFilters, sessionType: e.target.value})}
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                          >
                            <option value="">Todos</option>
                            <option value="carrera">Carrera</option>
                            <option value="clasificacion">Clasificación</option>
                            <option value="practica">Práctica</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Buscar por nombre (opcional)</label>
                          <input
                            type="text"
                            value={searchFilters.search}
                            onChange={(e) => setSearchFilters({...searchFilters, search: e.target.value})}
                            placeholder="Nombre de sesión..."
                            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* Race Results */}
                    {searchingRaces && (
                      <div className="text-center py-12">
                        <div className="w-12 h-12 border-4 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-400">Cargando carreras...</p>
                      </div>
                    )}

                    {!searchingRaces && searchFilters.eventDate && races.length > 0 && (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {races.map((race) => (
                          <div
                            key={race.sessionId}
                            className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-electric-blue/50 transition-all cursor-pointer"
                            onClick={() => {
                              setSelectedRace(race);
                              loadRaceDetails(race.sessionId);
                            }}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-white font-bold">{race.sessionName}</h3>
                                <p className="text-sm text-gray-400">
                                  {new Date(race.sessionDate).toLocaleDateString('es-CL', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                              <span className="px-3 py-1 bg-electric-blue/20 text-electric-blue text-xs font-bold rounded-full">
                                {race.sessionType}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <span className="text-gray-400">Pilotos:</span>
                                <span className="text-white ml-2 font-bold">{race.totalDrivers}</span>
                              </div>
                              <div>
                                <span className="text-gray-400">Vueltas:</span>
                                <span className="text-white ml-2 font-bold">{race.totalLaps}</span>
                              </div>
                              <div className="text-right">
                                <button className="text-electric-blue hover:text-cyan-300 font-bold">
                                  Seleccionar →
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!searchingRaces && !searchFilters.eventDate && (
                      <div className="text-center py-12 text-gray-400">
                        Selecciona una fecha para ver las carreras disponibles
                      </div>
                    )}

                    {!searchingRaces && races.length === 0 && searchFilters.eventDate && (
                      <div className="text-center py-12 text-gray-400">
                        No se encontraron carreras para el {(() => {
                          const [year, month, day] = searchFilters.eventDate.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
                        })()}
                      </div>
                    )}
                  </>
                )}

                {/* Loading race details */}
                {loadingRaceDetails && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Cargando resultados de la carrera...</p>
                  </div>
                )}

                {/* Race Details Preview */}
                {raceDetails && !calculatedResults && !loadingRaceDetails && (
                  <div>
                    <div className="mb-4">
                      <button
                        onClick={() => {
                          setRaceDetails(null);
                          setSelectedRace(null);
                        }}
                        className="text-electric-blue hover:text-cyan-300 mb-4"
                      >
                        ← Volver a búsqueda
                      </button>
                      <h3 className="text-xl font-bold text-white mb-2">{selectedRace?.sessionName}</h3>
                      <p className="text-gray-400 text-sm">
                        {new Date(selectedRace?.sessionDate).toLocaleDateString('es-CL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })} • {raceDetails.drivers?.length || 0} pilotos
                      </p>
                    </div>

                    <div className="bg-slate-800 rounded-lg p-4 mb-6 max-h-96 overflow-y-auto">
                      <h4 className="text-sm font-bold text-gray-400 mb-3">Resultados de la Carrera</h4>
                      <div className="space-y-2">
                        {raceDetails.drivers?.map((driver: any, index: number) => (
                          <div
                            key={driver.webUserId || index}
                            className="grid grid-cols-[60px_1fr_180px_140px] gap-3 items-center bg-slate-900/50 rounded p-3"
                          >
                            {/* Posición */}
                            <div className="flex justify-center">
                              <span className={`text-2xl font-bold ${
                                driver.finalPosition === 1 ? 'text-yellow-400' :
                                driver.finalPosition === 2 ? 'text-gray-300' :
                                driver.finalPosition === 3 ? 'text-orange-400' :
                                'text-gray-500'
                              }`}>
                                {driver.finalPosition === 1 ? '🥇' :
                                 driver.finalPosition === 2 ? '🥈' :
                                 driver.finalPosition === 3 ? '🥉' :
                                 `${driver.finalPosition}°`}
                              </span>
                            </div>

                            {/* Nombre y Tiempo */}
                            <div>
                              <p className="text-white font-bold">{driver.driverName}</p>
                              <p className="text-xs text-gray-400">
                                Mejor tiempo: {driver.bestTime ? `${(driver.bestTime / 1000).toFixed(3)}s` : 'N/A'}
                              </p>
                            </div>

                            {/* Escudería */}
                            <div>
                              {driver.squadronName ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-purple-400">🏁</span>
                                  <span className="text-purple-300 font-semibold">{driver.squadronName}</span>
                                </div>
                              ) : (
                                <span className="text-gray-500 text-sm italic">Sin escudería</span>
                              )}
                            </div>

                            {/* Vueltas y Kart */}
                            <div className="text-right">
                              <p className="text-sm text-gray-400">{driver.totalLaps} vueltas</p>
                              <p className="text-xs text-gray-500">Kart #{driver.kartNumber}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => calculatePoints(selectedRace.sessionId)}
                      className="w-full px-6 py-3 bg-electric-blue text-black rounded-lg font-bold hover:bg-cyan-300 transition-all"
                    >
                      🔗 Asociar Carrera
                    </button>
                  </div>
                )}

                {/* Calculating state */}
                {calculating && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 border-4 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white text-xl font-bold mb-2">Calculando puntos...</p>
                    <p className="text-gray-400">Identificando escuderías y calculando resultados</p>
                  </div>
                )}

                {/* Results preview */}
                {calculatedResults && !calculating && (
                  <div>
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-white">Resultados Calculados</h3>
                        <div className={`px-4 py-2 rounded-lg font-bold ${
                          event?.raceStatus === 'finalized' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                          event?.raceStatus === 'in_review' ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/50' :
                          'bg-slate-700/50 text-gray-400'
                        }`}>
                          {event?.raceStatus === 'finalized' ? '✅ Resultados Finales' :
                           event?.raceStatus === 'in_review' ? '🔍 En Revisión' :
                           '⏳ Pendiente'}
                        </div>
                      </div>
                      <p className="text-gray-400 text-sm">Carrera: {selectedRace?.sessionName}</p>
                      <p className="text-gray-400 text-sm">Categoría: {event.category} - {EventCategoryConfig[event.category]?.points} pts base</p>
                      {event?.raceStatus === 'finalized' && event?.finalizedAt && (
                        <p className="text-green-400 text-sm mt-2">
                          Finalizado: {new Date(event.finalizedAt).toLocaleString('es-CL')}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3 mb-6">
                      {calculatedResults.squadrons.map((squadron: any, index: number) => (
                        <div
                          key={squadron.squadronId}
                          className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}°`}
                              </span>
                              <div>
                                <h4 className="text-white font-bold text-lg">{squadron.squadronName}</h4>
                                <p className="text-sm text-gray-400">{squadron.pilots.length} pilotos</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-electric-blue">
                                +{squadron.pointsAwarded.toLocaleString()} pts
                              </div>
                              <div className="text-xs text-gray-400">
                                {squadron.percentageAwarded}% • {squadron.totalPoints} pts totales
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-slate-700 pt-3 mt-3">
                            <p className="text-xs text-gray-400 mb-2">Pilotos participantes:</p>
                            <div className="grid grid-cols-2 gap-2">
                              {squadron.pilots.map((pilot: any) => (
                                <div key={pilot.webUserId} className="text-sm">
                                  <span className="text-white">{pilot.driverName}</span>
                                  <span className="text-gray-400 ml-2">
                                    {pilot.finalPosition}° • {pilot.individualPoints} pts
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Seccián de Sanciones */}
                    {event?.raceStatus !== 'finalized' && (
                      <div className="mb-6 bg-slate-800/50 border border-yellow-600/30 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            ⚠️ Sanciones
                            {sanctions.length > 0 && (
                              <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs font-bold rounded-full">
                                {sanctions.length}
                              </span>
                            )}
                          </h3>
                          <button
                            onClick={() => setShowSanctionForm(!showSanctionForm)}
                            className="px-4 py-2 bg-yellow-600/20 text-yellow-400 border border-yellow-600/50 rounded-lg hover:bg-yellow-600/30 transition-all font-bold text-sm"
                          >
                            {showSanctionForm ? '✕ Cancelar' : '+ Aplicar Sanción'}
                          </button>
                        </div>

                      {/* Sanction Form */}
                      {showSanctionForm && (
                        <div className="mb-4 bg-slate-900/50 rounded-lg p-4 border border-yellow-600/20">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm text-gray-400 mb-2">Piloto *</label>
                              <select
                                value={sanctionForm.driverName}
                                onChange={(e) => setSanctionForm({...sanctionForm, driverName: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                              >
                                <option value="">Seleccionar piloto...</option>
                                {raceDetails?.drivers?.map((driver: any) => (
                                  <option key={driver.driverName} value={driver.driverName}>
                                    {driver.driverName} ({driver.finalPosition}°)
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm text-gray-400 mb-2">Tipo de Sanción *</label>
                              <select
                                value={sanctionForm.sanctionType}
                                onChange={(e) => setSanctionForm({...sanctionForm, sanctionType: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                              >
                                <option value="position_penalty">Penalización de Posición</option>
                                <option value="point_deduction">Deducción de Puntos</option>
                                <option value="disqualification">Descalificación</option>
                                <option value="warning">Advertencia</option>
                              </select>
                            </div>
                          </div>

                          {sanctionForm.sanctionType === 'position_penalty' && (
                            <div className="mb-4">
                              <label className="block text-sm text-gray-400 mb-2">Posiciones a penalizar</label>
                              <input
                                type="number"
                                min="1"
                                value={sanctionForm.positionPenalty}
                                onChange={(e) => setSanctionForm({...sanctionForm, positionPenalty: parseInt(e.target.value) || 0})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                placeholder="Ej: 3 (baja 3 posiciones)"
                              />
                            </div>
                          )}

                          {sanctionForm.sanctionType === 'point_deduction' && (
                            <div className="mb-4">
                              <label className="block text-sm text-gray-400 mb-2">Puntos a deducir</label>
                              <input
                                type="number"
                                min="1"
                                value={sanctionForm.pointsPenalty}
                                onChange={(e) => setSanctionForm({...sanctionForm, pointsPenalty: parseInt(e.target.value) || 0})}
                                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                                placeholder="Puntos a deducir de la escudería"
                              />
                            </div>
                          )}

                          <div className="mb-4">
                            <label className="block text-sm text-gray-400 mb-2">Descripción *</label>
                            <textarea
                              value={sanctionForm.description}
                              onChange={(e) => setSanctionForm({...sanctionForm, description: e.target.value})}
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                              placeholder="Razón de la sanción (ej: Adelantó con bandera amarilla)"
                              rows={3}
                              maxLength={500}
                            />
                          </div>

                          <button
                            onClick={applySanction}
                            disabled={applyingSanction}
                            className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg font-bold hover:bg-yellow-700 transition-all disabled:opacity-50"
                          >
                            {applyingSanction ? 'Aplicando...' : '⚠️ Aplicar Sanción'}
                          </button>
                        </div>
                      )}

                      {/* Sanctions List */}
                      {sanctions.length > 0 ? (
                        <div className="space-y-2">
                          {sanctions.map((sanction: any) => (
                            <div
                              key={sanction._id}
                              className="bg-slate-900/50 border border-yellow-600/20 rounded-lg p-4"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-white font-bold">{sanction.driverName}</span>
                                    <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs font-bold rounded">
                                      {sanction.sanctionType === 'position_penalty' ? `+${sanction.positionPenalty} pos` :
                                       sanction.sanctionType === 'point_deduction' ? `-${sanction.pointsPenalty} pts` :
                                       sanction.sanctionType === 'disqualification' ? 'DESCALIFICADO' :
                                       'ADVERTENCIA'}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-400">{sanction.description}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(sanction.appliedAt).toLocaleString('es-CL')}
                                  </p>
                                </div>
                                <button
                                  onClick={() => deleteSanction(sanction._id)}
                                  className="ml-4 px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/50 rounded hover:bg-red-500/30 transition-all text-sm"
                                >
                                  ✕ Eliminar
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-gray-500 py-4">
                          No hay sanciones aplicadas a esta carrera
                        </p>
                      )}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setCalculatedResults(null);
                          setRaceDetails(null);
                          setSelectedRace(null);
                          setSanctions([]);
                        }}
                        className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-lg font-bold hover:bg-slate-600 transition-all"
                      >
                        ← Buscar Otra Carrera
                      </button>
                      <button
                        onClick={finalizeEvent}
                        disabled={finalizing || event?.raceStatus === 'finalized'}
                        className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {finalizing ? '⏳ Finalizando...' :
                         event?.raceStatus === 'finalized' ? '✅ Resultados Finalizados' :
                         '✅ Finalizar y Aplicar Puntos'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </OrganizerGuard>
  );
}
