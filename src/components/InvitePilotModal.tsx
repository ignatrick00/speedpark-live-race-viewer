'use client';

import { useState, useEffect } from 'react';

interface Pilot {
  _id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  alias: string;
  memberSince: string;
}

interface InvitePilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
}

export default function InvitePilotModal({ isOpen, onClose, onSuccess, token }: InvitePilotModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const debounceTimer = setTimeout(() => {
        searchPilots();
      }, 500); // Debounce 500ms

      return () => clearTimeout(debounceTimer);
    } else {
      setPilots([]);
    }
  }, [searchQuery]);

  const searchPilots = async () => {
    setIsSearching(true);
    setError('');

    try {
      const response = await fetch(`/api/squadron/search-pilots?q=${encodeURIComponent(searchQuery)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        setPilots(data.pilots);
        console.log(`🔍 Found ${data.pilots.length} pilots`);
      } else {
        setError(data.error || 'Error al buscar pilotos');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsSearching(false);
    }
  };

  const handleInvite = async (pilotId: string, pilotName: string) => {
    if (!confirm(`¿Invitar a ${pilotName} a tu escudería?`)) return;

    setIsInviting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/squadron/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pilotId })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 1500);
      } else {
        setError(data.error || 'Error al invitar piloto');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsInviting(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setPilots([]);
    setError('');
    setSuccess('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={handleClose}>
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-gradient-to-br from-midnight via-rb-blue/20 to-midnight border-2 border-electric-blue/50 rounded-xl shadow-2xl overflow-hidden flex flex-col"
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

        <div className="relative z-10 p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-racing text-electric-blue tracking-wider mb-2">
                INVITAR PILOTO
              </h2>
              <p className="text-sky-blue/80 text-sm">
                Busca y agrega nuevos miembros a tu escudería
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isInviting}
              className="text-sky-blue/60 hover:text-electric-blue transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-400/40 rounded-md">
              <p className="text-red-300 text-sm font-digital">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-400/40 rounded-md">
              <p className="text-green-300 text-sm font-digital">{success}</p>
            </div>
          )}

          {/* Search Input */}
          <div className="mb-6">
            <label className="block text-sm font-digital text-sky-blue mb-2">
              BUSCAR PILOTO
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nombre, apellido, alias o email..."
                className="w-full px-4 py-3 pr-10 bg-midnight/80 border border-electric-blue/30 rounded-lg text-white placeholder-sky-blue/50 font-digital focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-electric-blue transition-all"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-electric-blue"></div>
                </div>
              )}
            </div>
            <p className="text-xs text-sky-blue/60 mt-1 font-digital">
              Escribe al menos 2 caracteres para buscar
            </p>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {searchQuery.length >= 2 && pilots.length === 0 && !isSearching && (
              <div className="text-center text-sky-blue/60 py-8 font-digital">
                No se encontraron pilotos disponibles
              </div>
            )}

            {pilots.length > 0 && (
              <div className="space-y-2">
                {pilots.map((pilot) => (
                  <div
                    key={pilot._id}
                    className="flex items-center justify-between p-4 bg-midnight/50 border border-electric-blue/20 rounded-lg hover:border-electric-blue/40 transition-all"
                  >
                    <div className="flex-1">
                      <p className="font-bold text-white text-lg">
                        {pilot.displayName}
                      </p>
                      <p className="text-sm text-sky-blue/70 font-digital">
                        {pilot.email}
                      </p>
                      <p className="text-xs text-sky-blue/50 mt-1">
                        Miembro desde {new Date(pilot.memberSince).toLocaleDateString('es-CL')}
                      </p>
                    </div>

                    <button
                      onClick={() => handleInvite(pilot._id, pilot.displayName)}
                      disabled={isInviting}
                      className="px-6 py-2 bg-gradient-to-r from-electric-blue to-cyan-400 text-midnight font-bold rounded-lg hover:shadow-lg hover:shadow-electric-blue/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isInviting ? 'Invitando...' : 'Invitar'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
