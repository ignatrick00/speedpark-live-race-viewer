'use client';

import { useState, useEffect } from 'react';

interface SquadronSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinSuccess: () => void;
  token: string;
}

interface Squadron {
  _id: string;
  squadronId: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
  };
  division: 'Elite' | 'Masters' | 'Pro' | 'Open';
  fairRacingAverage: number;
  totalPoints: number;
  recruitmentMode: 'open' | 'invite-only';
  stats: {
    memberCount: number;
    availableSpots: number;
    isFull: boolean;
  };
}

export default function SquadronSearchModal({ isOpen, onClose, onJoinSuccess, token }: SquadronSearchModalProps) {
  const [squadrons, setSquadrons] = useState<Squadron[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [onlyOpenFilter, setOnlyOpenFilter] = useState(true);
  const [hasSpaceFilter, setHasSpaceFilter] = useState(true);
  const [error, setError] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSquadrons();
    }
  }, [isOpen, searchQuery, divisionFilter, onlyOpenFilter, hasSpaceFilter]);

  const fetchSquadrons = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (divisionFilter !== 'all') params.append('division', divisionFilter);
      if (onlyOpenFilter) params.append('recruitmentMode', 'open');
      if (hasSpaceFilter) params.append('hasSpace', 'true');

      const response = await fetch(`/api/squadron/search?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        setSquadrons(data.squadrons || []);
      } else {
        setError(data.error || 'Error al buscar escuderías');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (squadronId: string, recruitmentMode: string) => {
    setJoiningId(squadronId);
    setError('');
    try {
      // Si es "open", unirse directamente. Si es "invite-only", enviar solicitud
      const endpoint = recruitmentMode === 'open' ? '/api/squadron/join' : '/api/squadron/join-request';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ squadronId }),
      });
      const data = await response.json();

      if (data.success) {
        onJoinSuccess();
        onClose();
      } else {
        setError(data.error || 'Error al procesar la solicitud');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setJoiningId(null);
    }
  };

  const handleClose = () => {
    if (!joiningId) {
      setSearchQuery('');
      setDivisionFilter('all');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={handleClose}>
      <div
        className="relative w-full max-w-6xl max-h-[90vh] bg-gradient-to-br from-midnight via-rb-blue/20 to-midnight border-2 border-electric-blue/50 rounded-xl shadow-2xl animate-glow overflow-hidden flex flex-col"
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
                BUSCAR ESCUDERÍAS
              </h2>
              <p className="text-sky-blue/70 text-sm">Encuentra tu equipo perfecto</p>
            </div>
            <button
              onClick={handleClose}
              disabled={!!joiningId}
              className="text-sky-blue hover:text-electric-blue transition-colors text-2xl disabled:opacity-50"
            >
              ×
            </button>
          </div>

          {/* Filters */}
          <div className="mt-6 space-y-4">
            {/* Search bar */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Buscar por nombre..."
              className="w-full px-4 py-3 bg-midnight/80 border border-electric-blue/30 rounded-lg text-sky-blue placeholder-sky-blue/40 focus:outline-none focus:border-electric-blue font-digital"
            />

            {/* Filter chips */}
            <div className="flex flex-wrap gap-3">
              {/* Division filter */}
              <select
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
                className="px-4 py-2 bg-midnight/80 border border-electric-blue/30 rounded-lg text-sky-blue font-digital text-sm focus:outline-none focus:border-electric-blue"
              >
                <option value="all">📊 Todas las divisiones</option>
                <option value="Elite">👑 Elite</option>
                <option value="Masters">⭐ Masters</option>
                <option value="Pro">🔥 Pro</option>
                <option value="Open">🚀 Open</option>
              </select>

              {/* Only open */}
              <button
                onClick={() => setOnlyOpenFilter(!onlyOpenFilter)}
                className={`px-4 py-2 rounded-lg font-digital text-sm transition-all ${
                  onlyOpenFilter
                    ? 'bg-electric-blue text-midnight'
                    : 'bg-midnight/80 border border-electric-blue/30 text-sky-blue'
                }`}
              >
                🔓 Solo abiertas
              </button>

              {/* Has space */}
              <button
                onClick={() => setHasSpaceFilter(!hasSpaceFilter)}
                className={`px-4 py-2 rounded-lg font-digital text-sm transition-all ${
                  hasSpaceFilter
                    ? 'bg-electric-blue text-midnight'
                    : 'bg-midnight/80 border border-electric-blue/30 text-sky-blue'
                }`}
              >
                👥 Con espacio
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
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
          ) : squadrons.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sky-blue/70 text-lg">No se encontraron escuderías</p>
              <p className="text-sky-blue/50 text-sm mt-2">Intenta ajustar los filtros</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {squadrons.map((squadron) => (
                <div
                  key={squadron._id}
                  className="bg-gradient-to-br from-midnight/90 via-rb-blue/10 to-midnight/90 border border-electric-blue/30 rounded-lg p-5 hover:border-electric-blue/60 transition-all group"
                >
                  {/* Squadron colors preview */}
                  <div className="flex gap-2 mb-3">
                    <div
                      className="w-8 h-8 rounded border-2 border-white/20"
                      style={{ backgroundColor: squadron.colors.primary }}
                    />
                    <div
                      className="w-8 h-8 rounded border-2 border-white/20"
                      style={{ backgroundColor: squadron.colors.secondary }}
                    />
                  </div>

                  {/* Name & Division */}
                  <h3 className="text-xl font-racing text-electric-blue mb-1 group-hover:text-cyan-300 transition-colors">
                    {squadron.name}
                  </h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-digital px-2 py-1 bg-electric-blue/20 text-electric-blue rounded">
                      {squadron.division}
                    </span>
                    <span className="text-xs font-digital text-sky-blue/70">
                      {squadron.stats.memberCount}/4 pilotos
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sky-blue/70 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">
                    {squadron.description || 'Sin descripción'}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-midnight/50 rounded p-2">
                      <p className="text-xs text-sky-blue/50">Fair Racing</p>
                      <p className="text-lg font-digital text-electric-blue">
                        {squadron.fairRacingAverage.toFixed(0)}
                      </p>
                    </div>
                    <div className="bg-midnight/50 rounded p-2">
                      <p className="text-xs text-sky-blue/50">Puntos</p>
                      <p className="text-lg font-digital text-gold">
                        {squadron.totalPoints}
                      </p>
                    </div>
                  </div>

                  {/* Join button */}
                  <button
                    onClick={() => handleJoin(squadron._id, squadron.recruitmentMode)}
                    disabled={
                      squadron.stats.isFull ||
                      joiningId === squadron._id
                    }
                    className="w-full px-4 py-2 bg-gradient-to-r from-electric-blue to-cyan-400 text-midnight font-racing rounded-lg hover:shadow-lg hover:shadow-electric-blue/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-600 disabled:to-gray-700"
                  >
                    {joiningId === squadron._id ? (
                      squadron.recruitmentMode === 'open' ? 'UNIÉNDOSE...' : 'ENVIANDO...'
                    ) : squadron.stats.isFull ? (
                      '🔒 LLENA'
                    ) : squadron.recruitmentMode === 'invite-only' ? (
                      '📨 SOLICITAR'
                    ) : (
                      '✓ UNIRSE'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
