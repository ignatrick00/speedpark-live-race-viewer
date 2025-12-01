'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import Link from 'next/link';

interface Squadron {
  _id: string;
  squadronId: string;
  name: string;
  logo?: string;
  colors: {
    primary: string;
    secondary: string;
  };
  captainId: {
    _id: string;
    profile: {
      alias?: string;
      firstName: string;
      lastName: string;
    };
  };
  members: Array<{
    _id: string;
    profile: {
      alias?: string;
      firstName: string;
      lastName: string;
    };
  }>;
  totalPoints: number;
  ranking: number;
  division: 'Elite' | 'Masters' | 'Pro' | 'Open';
  fairRacingAverage: number;
  recruitmentMode: 'open' | 'invite-only';
  description?: string;
  totalRaces: number;
  totalVictories: number;
}

export default function SquadronsPage() {
  const { user, isLoading, isAuthenticated, token } = useAuth();
  const router = useRouter();
  const [squadrons, setSquadrons] = useState<Squadron[]>([]);
  const [userSquadron, setUserSquadron] = useState<Squadron | null>(null);
  const [loading, setLoading] = useState(true);
  const [division, setDivision] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user?.id) {
      loadSquadrons();
    }
  }, [user, division, search]);

  const loadSquadrons = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        userId: user?.id || '',
        division,
        limit: '50'
      });

      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/squadrons?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setSquadrons(data.squadrons);
        setUserSquadron(data.userSquadron);
      }
    } catch (error) {
      console.error('Error loading squadrons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSquadron = async (squadronId: string) => {
    if (!token) {
      alert('Debes iniciar sesión');
      return;
    }

    if (userSquadron) {
      alert('Ya perteneces a una escudería. Debes abandonarla primero.');
      return;
    }

    const confirmed = confirm('¿Quieres unirte a esta escudería?');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/squadrons/${squadronId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'join'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('¡Te has unido a la escudería exitosamente!');
        loadSquadrons();
      } else {
        alert(data.error || 'Error al unirse a la escudería');
      }
    } catch (error) {
      console.error('Error joining squadron:', error);
      alert('Error al unirse a la escudería');
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-electric-blue text-lg font-medium">CARGANDO ESCUDERÍAS...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-midnight text-white">
      <DashboardHeader />

      {/* Background Effects */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(0, 212, 255, 0.15) 2px, transparent 2px)',
            backgroundSize: '80px 80px'
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="font-bold text-4xl md:text-6xl mb-3 tracking-wider bg-gradient-to-r from-electric-blue via-sky-blue to-karting-gold bg-clip-text text-transparent">
            ⚡ ESCUDERÍAS
          </h1>
          <p className="text-sky-blue/80">
            Únete a una escudería o crea la tuya propia
          </p>
        </header>

        {/* User Squadron Status */}
        {userSquadron && (
          <div className="max-w-4xl mx-auto mb-8">
            <div
              className="border-2 rounded-lg p-6"
              style={{
                borderColor: userSquadron.colors.primary,
                backgroundColor: userSquadron.colors.primary + '15'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-sky-blue/60 mb-1">TU ESCUDERÍA</div>
                  <h2 className="text-2xl font-bold text-white mb-2">{userSquadron.name}</h2>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-sky-blue">
                      Ranking: <strong className="text-electric-blue">#{userSquadron.ranking || '—'}</strong>
                    </span>
                    <span className="text-sky-blue">
                      División: <strong className="text-karting-gold">{userSquadron.division}</strong>
                    </span>
                    <span className="text-sky-blue">
                      Miembros: <strong className="text-white">{userSquadron.members.length}/4</strong>
                    </span>
                  </div>
                </div>
                <Link
                  href={`/squadrons/${userSquadron._id}`}
                  className="px-6 py-3 bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-bold rounded-lg transition-all"
                >
                  Ver Equipo →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {!userSquadron && (
          <div className="max-w-4xl mx-auto mb-8 flex justify-center gap-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-karting-gold to-yellow-500 hover:from-karting-gold/80 hover:to-yellow-500/80 text-dark-bg font-bold rounded-lg transition-all"
            >
              ➕ Crear Escudería
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="max-w-4xl mx-auto mb-6 flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="🔍 Buscar escudería..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-3 bg-midnight/60 border border-electric-blue/30 rounded-lg text-white placeholder-sky-blue/50 focus:outline-none focus:border-electric-blue"
          />
          <select
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            className="px-4 py-3 bg-midnight/60 border border-electric-blue/30 rounded-lg text-white focus:outline-none focus:border-electric-blue"
          >
            <option value="all">Todas las Divisiones</option>
            <option value="Elite">Elite</option>
            <option value="Masters">Masters</option>
            <option value="Pro">Pro</option>
            <option value="Open">Open</option>
          </select>
        </div>

        {/* Squadrons Grid */}
        {squadrons.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏁</div>
            <p className="text-sky-blue/60">No se encontraron escuderías</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {squadrons.map((squadron) => (
              <div
                key={squadron._id}
                className="border-2 rounded-lg p-5 hover:scale-105 transition-all"
                style={{
                  borderColor: squadron.colors.primary + '40',
                  backgroundColor: squadron.colors.primary + '10'
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-xl text-white mb-1">{squadron.name}</h3>
                    <div className="text-xs text-sky-blue/60">
                      por {squadron.captainId.profile.alias || squadron.captainId.profile.firstName}
                    </div>
                  </div>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                    style={{ backgroundColor: squadron.colors.primary + '30' }}
                  >
                    ⚡
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  <div className="bg-midnight/40 rounded p-2">
                    <div className="text-sky-blue/60 text-xs">Ranking</div>
                    <div className="text-electric-blue font-bold">#{squadron.ranking || '—'}</div>
                  </div>
                  <div className="bg-midnight/40 rounded p-2">
                    <div className="text-sky-blue/60 text-xs">División</div>
                    <div className="text-karting-gold font-bold">{squadron.division}</div>
                  </div>
                  <div className="bg-midnight/40 rounded p-2">
                    <div className="text-sky-blue/60 text-xs">Puntos</div>
                    <div className="text-white font-bold">{squadron.totalPoints}</div>
                  </div>
                  <div className="bg-midnight/40 rounded p-2">
                    <div className="text-sky-blue/60 text-xs">Miembros</div>
                    <div className="text-white font-bold">{squadron.members.length}/4</div>
                  </div>
                </div>

                {/* Description */}
                {squadron.description && (
                  <p className="text-sky-blue/70 text-sm mb-4 line-clamp-2">
                    {squadron.description}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/squadrons/${squadron._id}`}
                    className="flex-1 px-4 py-2 bg-electric-blue/20 hover:bg-electric-blue/30 text-electric-blue text-center rounded-lg transition-all text-sm font-medium"
                  >
                    Ver Detalles
                  </Link>
                  {!userSquadron && squadron.recruitmentMode === 'open' && squadron.members.length < 4 && (
                    <button
                      onClick={() => handleJoinSquadron(squadron._id)}
                      className="px-4 py-2 bg-karting-gold hover:bg-karting-gold/80 text-dark-bg rounded-lg transition-all text-sm font-bold"
                    >
                      Unirse
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Squadron Modal - TODO: Create separate component */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-midnight border border-electric-blue/30 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-electric-blue mb-4">Crear Escudería</h3>
            <p className="text-sky-blue/70 mb-4">
              Funcionalidad próximamente. Necesitas al menos 2 miembros para crear una escudería.
            </p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="w-full px-4 py-2 bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-bold rounded-lg transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
