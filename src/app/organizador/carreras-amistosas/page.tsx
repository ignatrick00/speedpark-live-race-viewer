'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import OrganizerGuard from '@/components/OrganizerGuard';
import Navbar from '@/components/Navbar';

interface FriendlyRace {
  _id: string;
  name: string;
  date: string;
  time: string;
  participants: number;
  maxParticipants: number;
  status: string;
  raceStatus: 'pending' | 'linked' | 'finalized';
  linkedRaceSessionId?: string;
  participantsList: Array<{
    userId: string;
    kartNumber: number;
    name: string;
  }>;
}

interface RaceSession {
  sessionId: string;
  sessionName: string;
  sessionDate: string;
  sessionType: string;
  totalDrivers: number;
  displayDate: string;
  displayTime: string;
}

interface RaceDetails {
  sessionId: string;
  sessionName: string;
  sessionDate: string;
  sessionType: string;
  totalDrivers: number;
  totalLaps: number;
  drivers: Array<{
    driverName: string;
    finalPosition: number;
    kartNumber: number;
    totalLaps: number;
    bestTime: number;
    squadronName?: string;
  }>;
}

export default function CarrerasAmistosasOrgPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [races, setRaces] = useState<FriendlyRace[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  // Modal states
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedFriendlyRace, setSelectedFriendlyRace] = useState<FriendlyRace | null>(null);
  const [searchingSessions, setSearchingSessions] = useState(false);
  const [raceSessions, setRaceSessions] = useState<RaceSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<RaceSession | null>(null);
  const [raceDetails, setRaceDetails] = useState<RaceDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [linking, setLinking] = useState(false);

  // Search filters
  const [searchFilters, setSearchFilters] = useState({
    date: '',
    sessionType: '',
    search: ''
  });

  const fetchRaces = async () => {
    try {
      setLoading(true);
      console.log('🔍 [FETCH] Obteniendo carreras del usuario:', user?.id);
      const response = await fetch('/api/races/friendly?filter=my-races', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        console.log('📋 [FETCH] Carreras obtenidas:', data.races);
        console.log('📊 [FETCH] Total de carreras:', data.races?.length);
        setRaces(data.races || []);
      } else {
        console.error('❌ [FETCH] Error en respuesta:', data.error);
      }
    } catch (error) {
      console.error('💥 [FETCH] Error fetching races:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔍 [useEffect] token:', token ? 'exists' : 'null');
    console.log('🔍 [useEffect] user:', user);
    console.log('🔍 [useEffect] user.id:', user?.id);

    if (token && user) {
      console.log('✅ [useEffect] Llamando fetchRaces()');
      fetchRaces();
    } else {
      console.log('⚠️ [useEffect] No se llama fetchRaces - falta token o user');
      setLoading(false);
    }
  }, [token, user]);

  const filteredRaces = races.filter(race => {
    const raceDate = new Date(race.date);
    const now = new Date();
    const isLinked = race.raceStatus === 'linked' || race.raceStatus === 'finalized';

    console.log(`🔍 [FILTER] ${race.name}:`, {
      date: raceDate.toISOString(),
      raceStatus: race.raceStatus,
      isLinked,
      isFuture: raceDate >= now,
      filter
    });

    if (filter === 'all') return true;
    // Upcoming: future races that are NOT linked
    if (filter === 'upcoming') return raceDate >= now && !isLinked;
    // Past: past races that are NOT linked (linked races are considered "finished" not "past")
    if (filter === 'past') return raceDate < now && !isLinked;
    return true;
  });

  const openSearchModal = (race: FriendlyRace) => {
    setSelectedFriendlyRace(race);
    setShowSearchModal(true);

    // Auto-set search date to race date
    const raceDate = new Date(race.date);
    const dateStr = raceDate.toISOString().split('T')[0];
    setSearchFilters(prev => ({ ...prev, date: dateStr }));

    // Auto-search
    searchRaceSessions(dateStr);
  };

  const openResultsModal = async (race: FriendlyRace) => {
    if (!race.linkedRaceSessionId) return;

    setSelectedFriendlyRace(race);
    setShowResultsModal(true);

    // Load race results
    await loadSessionDetails(race.linkedRaceSessionId);
  };

  const searchRaceSessions = async (dateToSearch?: string) => {
    const searchDate = dateToSearch || searchFilters.date;
    if (!searchDate) return;

    try {
      setSearchingSessions(true);
      const response = await fetch(`/api/races-v0?date=${searchDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          let filtered = data.races || [];

          // Apply filters
          if (searchFilters.sessionType) {
            filtered = filtered.filter((r: RaceSession) =>
              r.sessionType === searchFilters.sessionType
            );
          }
          if (searchFilters.search) {
            filtered = filtered.filter((r: RaceSession) =>
              r.sessionName.toLowerCase().includes(searchFilters.search.toLowerCase())
            );
          }

          setRaceSessions(filtered);
        }
      }
    } catch (error) {
      console.error('Error searching race sessions:', error);
    } finally {
      setSearchingSessions(false);
    }
  };

  const loadSessionDetails = async (sessionId: string) => {
    try {
      setLoadingDetails(true);
      const response = await fetch(`/api/race-results-v0?sessionId=${encodeURIComponent(sessionId)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRaceDetails(data.race);
        }
      }
    } catch (error) {
      console.error('Error loading session details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const linkRaceSession = async () => {
    if (!selectedFriendlyRace || !selectedSession) return;

    try {
      setLinking(true);
      console.log('🔗 [LINK] Vinculando carrera:', {
        raceId: selectedFriendlyRace._id,
        sessionId: selectedSession.sessionId
      });

      const response = await fetch(`/api/races/friendly/${selectedFriendlyRace._id}/link-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ raceSessionId: selectedSession.sessionId })
      });

      console.log('📡 [LINK] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [LINK] Success:', data);
        alert('✅ Carrera vinculada exitosamente!');
        setShowSearchModal(false);
        setSelectedFriendlyRace(null);
        setSelectedSession(null);
        setRaceDetails(null);
        await fetchRaces();
      } else {
        const error = await response.json();
        console.error('❌ [LINK] Error response:', error);
        alert(error.error || 'Error al vincular carrera');
      }
    } catch (error) {
      console.error('💥 [LINK] Error linking race:', error);
      alert('Error al vincular carrera');
    } finally {
      setLinking(false);
    }
  };

  // Auto-search when filters change
  useEffect(() => {
    if (showSearchModal && searchFilters.date) {
      searchRaceSessions();
    }
  }, [searchFilters.date, searchFilters.sessionType, searchFilters.search, showSearchModal]);

  // Calculate participant name matches
  const getMatchScore = (session: RaceSession) => {
    if (!selectedFriendlyRace || !raceDetails) return 0;

    const participantNames = selectedFriendlyRace.participantsList.map(p =>
      p.name.toLowerCase()
    );

    const driverNames = raceDetails.drivers.map(d =>
      d.driverName.toLowerCase()
    );

    const matches = participantNames.filter(name =>
      driverNames.some(driver => driver.includes(name) || name.includes(driver))
    );

    return matches.length;
  };

  const getStatusBadge = (raceStatus: string) => {
    const badges: Record<string, { text: string; color: string }> = {
      pending: { text: 'Sin Vincular', color: 'bg-gray-500' },
      linked: { text: 'Vinculada', color: 'bg-blue-500' },
      finalized: { text: 'Finalizada', color: 'bg-green-500' },
    };

    const badge = badges[raceStatus] || { text: raceStatus, color: 'bg-gray-500' };
    return (
      <span className={`px-3 py-1 ${badge.color} text-white text-xs font-bold rounded-full`}>
        {badge.text}
      </span>
    );
  };

  return (
    <OrganizerGuard>
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
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
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-cyan-600/15 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-400/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto p-8">
          {/* Header */}
          <header className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">🏁</span>
                  </div>
                  <h1 className="font-bold text-5xl md:text-6xl tracking-wider bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    CARRERAS AMISTOSAS
                  </h1>
                </div>
                <p className="text-gray-400 text-lg ml-16">Gestión de Carreras Informales</p>
                <p className="text-cyan-400 text-sm ml-16">🛡️ {user?.email}</p>
              </div>

              <button
                onClick={() => router.push('/organizador')}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-purple-500/50"
              >
                ← Volver a Organizador
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === 'all'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setFilter('upcoming')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === 'upcoming'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                }`}
              >
                Próximas
              </button>
              <button
                onClick={() => setFilter('past')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === 'past'
                    ? 'bg-cyan-500 text-white'
                    : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                }`}
              >
                Pasadas
              </button>
            </div>
          </header>

          {/* Races List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-cyan-400">Cargando carreras...</p>
            </div>
          ) : filteredRaces.length === 0 ? (
            <div className="text-center py-12 bg-cyan-500/5 rounded-2xl border border-cyan-500/20">
              <p className="text-gray-400 mb-4">No hay carreras {filter !== 'all' ? filter === 'upcoming' ? 'próximas' : 'pasadas' : ''}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRaces.map((race) => (
                <div
                  key={race._id}
                  className="group relative bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-2 border-cyan-500/20 hover:border-cyan-400/40 rounded-2xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20"
                >
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-xl text-white mb-2">
                          {race.name}
                        </h3>
                        {getStatusBadge(race.raceStatus)}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <span>📅</span>
                        <span>{new Date(race.date).toLocaleDateString('es-CL')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <span>🕐</span>
                        <span>{race.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400">
                        <span>👥</span>
                        <span>{race.participants}/{race.maxParticipants} Participantes</span>
                      </div>
                    </div>

                    {/* Show "Identificar Carrera" button only for pending races that already happened */}
                    {race.raceStatus === 'pending' && new Date(race.date) < new Date() && (
                      <button
                        onClick={() => openSearchModal(race)}
                        className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg font-bold hover:from-cyan-600 hover:to-blue-600 transition-all"
                      >
                        🔍 Identificar Carrera
                      </button>
                    )}

                    {/* Show "Ver Resultados" button for linked races */}
                    {race.linkedRaceSessionId && (
                      <button
                        onClick={() => openResultsModal(race)}
                        className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg font-bold hover:from-green-600 hover:to-emerald-600 transition-all"
                      >
                        📊 Ver Resultados
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search Modal */}
        {showSearchModal && selectedFriendlyRace && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-black border-2 border-cyan-500/30 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-cyan-400">Identificar Carrera Corrida</h2>
                    <p className="text-gray-400 text-sm mt-1">{selectedFriendlyRace.name}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowSearchModal(false);
                      setSelectedFriendlyRace(null);
                      setSelectedSession(null);
                      setRaceDetails(null);
                    }}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    ✕
                  </button>
                </div>

                {/* Search Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Fecha</label>
                    <input
                      type="date"
                      value={searchFilters.date}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Tipo de Sesión</label>
                    <select
                      value={searchFilters.sessionType}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, sessionType: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="">Todos</option>
                      <option value="carrera">Carrera</option>
                      <option value="clasificacion">Clasificación</option>
                      <option value="practica">Práctica</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Buscar</label>
                    <input
                      type="text"
                      placeholder="Nombre de sesión..."
                      value={searchFilters.search}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Participants Preview */}
                <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-sm text-blue-400 font-bold mb-2">👥 Participantes de la carrera amistosa:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedFriendlyRace.participantsList.map((p, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-xs text-blue-300">
                        {p.name} (Kart #{p.kartNumber})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Race Sessions Results */}
                {searchingSessions ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-400 text-sm">Buscando carreras...</p>
                  </div>
                ) : raceSessions.length === 0 ? (
                  <div className="text-center py-8 bg-gray-800/50 rounded-lg">
                    <p className="text-gray-400">No se encontraron carreras para esta fecha</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {raceSessions.map((session) => {
                      const isSelected = selectedSession?.sessionId === session.sessionId;
                      const matchScore = isSelected && raceDetails ? getMatchScore(session) : 0;

                      return (
                        <div
                          key={session.sessionId}
                          onClick={() => {
                            setSelectedSession(session);
                            loadSessionDetails(session.sessionId);
                          }}
                          className={`p-4 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-cyan-500/20 border-2 border-cyan-400'
                              : 'bg-gray-800/50 border border-gray-700 hover:border-cyan-500/50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-bold text-white mb-1">{session.sessionName}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-400">
                                <span>📅 {session.displayDate}</span>
                                <span>🕐 {session.displayTime}</span>
                                <span>👥 {session.totalDrivers} pilotos</span>
                                <span className="px-2 py-0.5 bg-purple-500/20 rounded text-purple-300 text-xs">
                                  {session.sessionType}
                                </span>
                              </div>
                              {isSelected && matchScore > 0 && (
                                <div className="mt-2">
                                  <span className="px-3 py-1 bg-green-500/20 border border-green-400/30 rounded-full text-xs text-green-300">
                                    ✓ {matchScore} participante{matchScore > 1 ? 's' : ''} coincide{matchScore === 1 ? '' : 'n'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Race Details */}
                          {isSelected && loadingDetails && (
                            <div className="mt-4 text-center">
                              <div className="w-6 h-6 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                            </div>
                          )}

                          {isSelected && raceDetails && (
                            <div className="mt-4 space-y-2">
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-700">
                                      <th className="text-left py-2 text-gray-400">Pos</th>
                                      <th className="text-left py-2 text-gray-400">Piloto</th>
                                      <th className="text-left py-2 text-gray-400">Kart</th>
                                      <th className="text-left py-2 text-gray-400">Vueltas</th>
                                      <th className="text-left py-2 text-gray-400">Mejor Tiempo</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {raceDetails.drivers.slice(0, 10).map((driver) => {
                                      const isParticipant = selectedFriendlyRace.participantsList.some(p =>
                                        p.name.toLowerCase().includes(driver.driverName.toLowerCase()) ||
                                        driver.driverName.toLowerCase().includes(p.name.toLowerCase())
                                      );

                                      return (
                                        <tr
                                          key={driver.finalPosition}
                                          className={`border-b border-gray-800 ${isParticipant ? 'bg-green-500/10' : ''}`}
                                        >
                                          <td className="py-2 text-gray-300">{driver.finalPosition}</td>
                                          <td className="py-2 text-white">
                                            {driver.driverName}
                                            {isParticipant && <span className="ml-2 text-green-400">✓</span>}
                                          </td>
                                          <td className="py-2 text-gray-300">{driver.kartNumber}</td>
                                          <td className="py-2 text-gray-300">{driver.totalLaps}</td>
                                          <td className="py-2 text-cyan-400 font-mono">
                                            {(driver.bestTime / 1000).toFixed(3)}s
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  linkRaceSession();
                                }}
                                disabled={linking}
                                className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg font-bold hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {linking ? '⏳ Vinculando...' : '✅ Vincular Esta Carrera'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results Modal */}
        {showResultsModal && selectedFriendlyRace && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-black border-2 border-green-500/30 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-green-400">📊 Resultados de Carrera</h2>
                    <p className="text-gray-400 text-sm mt-1">{selectedFriendlyRace.name}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowResultsModal(false);
                      setSelectedFriendlyRace(null);
                      setRaceDetails(null);
                    }}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    ✕
                  </button>
                </div>

                {loadingDetails ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Cargando resultados...</p>
                  </div>
                ) : raceDetails ? (
                  <div className="space-y-6">
                    {/* Session Info */}
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <h3 className="text-lg font-bold text-green-400 mb-2">{raceDetails.sessionName}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-400">📅 Fecha</p>
                          <p className="text-white font-medium">
                            {new Date(raceDetails.sessionDate).toLocaleDateString('es-CL')}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">🕐 Hora</p>
                          <p className="text-white font-medium">
                            {new Date(raceDetails.sessionDate).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">👥 Pilotos</p>
                          <p className="text-white font-medium">{raceDetails.totalDrivers}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">🏁 Vueltas</p>
                          <p className="text-white font-medium">{raceDetails.totalLaps}</p>
                        </div>
                      </div>
                    </div>

                    {/* Participants Preview */}
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-sm text-blue-400 font-bold mb-2">👥 Participantes de tu carrera amistosa:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedFriendlyRace.participantsList.map((p, idx) => (
                          <span key={idx} className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 rounded-full text-xs text-blue-300">
                            {p.name} (Kart #{p.kartNumber})
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Results Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-green-500/30">
                            <th className="text-left py-3 px-2 text-green-400 font-bold">Pos</th>
                            <th className="text-left py-3 px-2 text-green-400 font-bold">Piloto</th>
                            <th className="text-left py-3 px-2 text-green-400 font-bold">Kart</th>
                            <th className="text-left py-3 px-2 text-green-400 font-bold">Vueltas</th>
                            <th className="text-left py-3 px-2 text-green-400 font-bold">Mejor Tiempo</th>
                            <th className="text-left py-3 px-2 text-green-400 font-bold">Promedio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {raceDetails.drivers.map((driver) => {
                            const isParticipant = selectedFriendlyRace.participantsList.some(p =>
                              p.name.toLowerCase().includes(driver.driverName.toLowerCase()) ||
                              driver.driverName.toLowerCase().includes(p.name.toLowerCase())
                            );

                            return (
                              <tr
                                key={driver.finalPosition}
                                className={`border-b border-gray-800 ${
                                  isParticipant ? 'bg-green-500/10 border-green-500/30' : ''
                                }`}
                              >
                                <td className="py-3 px-2">
                                  <span className={`font-bold ${
                                    driver.finalPosition === 1 ? 'text-yellow-400' :
                                    driver.finalPosition === 2 ? 'text-gray-300' :
                                    driver.finalPosition === 3 ? 'text-orange-400' :
                                    'text-gray-400'
                                  }`}>
                                    {driver.finalPosition}
                                  </span>
                                </td>
                                <td className="py-3 px-2">
                                  <span className={`${isParticipant ? 'text-green-400 font-bold' : 'text-white'}`}>
                                    {driver.driverName}
                                    {isParticipant && <span className="ml-2">✓</span>}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-gray-300">#{driver.kartNumber}</td>
                                <td className="py-3 px-2 text-gray-300">{driver.totalLaps}</td>
                                <td className="py-3 px-2 text-cyan-400 font-mono font-bold">
                                  {(driver.bestTime / 1000).toFixed(3)}s
                                </td>
                                <td className="py-3 px-2 text-gray-400 font-mono">
                                  {(driver.totalLaps > 0 ? (driver.bestTime / 1000) : 0).toFixed(3)}s
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Close Button */}
                    <button
                      onClick={() => {
                        setShowResultsModal(false);
                        setSelectedFriendlyRace(null);
                        setRaceDetails(null);
                      }}
                      className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg font-bold hover:from-gray-700 hover:to-gray-800 transition-all"
                    >
                      Cerrar
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-400">No se pudieron cargar los resultados</p>
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
