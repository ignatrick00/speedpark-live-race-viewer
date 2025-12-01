'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import Link from 'next/link';

interface SquadronMember {
  _id: string;
  profile: {
    alias?: string;
    firstName: string;
    lastName: string;
  };
  email: string;
  stats?: {
    totalRaces?: number;
    allTimeBestLap?: number;
    bestPosition?: number;
  };
}

interface Squadron {
  _id: string;
  squadronId: string;
  name: string;
  logo?: string;
  colors: {
    primary: string;
    secondary: string;
  };
  captainId: SquadronMember;
  members: SquadronMember[];
  totalPoints: number;
  ranking: number;
  division: 'Elite' | 'Masters' | 'Pro' | 'Open';
  fairRacingAverage: number;
  recruitmentMode: 'open' | 'invite-only';
  description?: string;
  totalRaces: number;
  totalVictories: number;
  createdAt: string;
}

export default function SquadronDetailPage() {
  const { user, isLoading, isAuthenticated, token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [squadron, setSquadron] = useState<Squadron | null>(null);
  const [loading, setLoading] = useState(true);

  const squadronId = params.id as string;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (squadronId) {
      loadSquadron();
    }
  }, [squadronId]);

  const loadSquadron = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/squadrons/${squadronId}`);
      const data = await response.json();

      if (data.success) {
        setSquadron(data.squadron);
      } else {
        alert('Escudería no encontrada');
        router.push('/squadrons');
      }
    } catch (error) {
      console.error('Error loading squadron:', error);
      alert('Error al cargar escudería');
      router.push('/squadrons');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveSquadron = async () => {
    if (!token || !squadron) return;

    const confirmed = confirm('¿Estás seguro de que quieres abandonar esta escudería?');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/squadrons/${squadron._id}/members?memberId=${user?.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        alert('Has abandonado la escudería');
        router.push('/squadrons');
      } else {
        alert(data.error || 'Error al abandonar escudería');
      }
    } catch (error) {
      console.error('Error leaving squadron:', error);
      alert('Error al abandonar escudería');
    }
  };

  const formatTime = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = ((milliseconds % 60000) / 1000).toFixed(3);
    return `${minutes}:${seconds.padStart(6, '0')}`;
  };

  const isMember = squadron?.members.some(m => m._id === user?.id);
  const isCaptain = squadron?.captainId._id === user?.id;

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-electric-blue text-lg font-medium">CARGANDO ESCUDERÍA...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !squadron) {
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
        <div
          className="absolute top-0 left-0 w-full h-96 opacity-20"
          style={{
            background: `radial-gradient(circle at top, ${squadron.colors.primary}40, transparent 70%)`
          }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-6">
        {/* Back Button */}
        <Link
          href="/squadrons"
          className="inline-flex items-center gap-2 text-sky-blue hover:text-electric-blue mb-6 transition-colors"
        >
          ← Volver a Escuderías
        </Link>

        {/* Squadron Header */}
        <div
          className="border-2 rounded-lg p-8 mb-6"
          style={{
            borderColor: squadron.colors.primary,
            backgroundColor: squadron.colors.primary + '15'
          }}
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                style={{ backgroundColor: squadron.colors.primary + '40' }}
              >
                ⚡
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">{squadron.name}</h1>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-sky-blue">
                    Capitán: <strong className="text-white">{squadron.captainId.profile.alias || squadron.captainId.profile.firstName}</strong>
                  </span>
                  {isCaptain && (
                    <span className="px-2 py-1 bg-karting-gold/20 text-karting-gold rounded text-xs font-bold">
                      TÚ ERES EL CAPITÁN
                    </span>
                  )}
                  {isMember && !isCaptain && (
                    <span className="px-2 py-1 bg-electric-blue/20 text-electric-blue rounded text-xs font-bold">
                      MIEMBRO
                    </span>
                  )}
                </div>
              </div>
            </div>

            {isMember && !isCaptain && (
              <button
                onClick={handleLeaveSquadron}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all text-sm font-medium"
              >
                Abandonar Equipo
              </button>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-midnight/40 rounded-lg p-4">
              <div className="text-sky-blue/60 text-xs mb-1">Ranking Global</div>
              <div className="text-2xl font-bold text-electric-blue">#{squadron.ranking || '—'}</div>
            </div>
            <div className="bg-midnight/40 rounded-lg p-4">
              <div className="text-sky-blue/60 text-xs mb-1">División</div>
              <div className="text-2xl font-bold text-karting-gold">{squadron.division}</div>
            </div>
            <div className="bg-midnight/40 rounded-lg p-4">
              <div className="text-sky-blue/60 text-xs mb-1">Puntos Totales</div>
              <div className="text-2xl font-bold text-white">{squadron.totalPoints}</div>
            </div>
            <div className="bg-midnight/40 rounded-lg p-4">
              <div className="text-sky-blue/60 text-xs mb-1">Carreras</div>
              <div className="text-2xl font-bold text-white">{squadron.totalRaces}</div>
            </div>
            <div className="bg-midnight/40 rounded-lg p-4">
              <div className="text-sky-blue/60 text-xs mb-1">Victorias</div>
              <div className="text-2xl font-bold text-green-400">{squadron.totalVictories}</div>
            </div>
          </div>

          {/* Description */}
          {squadron.description && (
            <div className="mt-6 p-4 bg-midnight/40 rounded-lg">
              <div className="text-sky-blue/60 text-sm mb-2">Descripción:</div>
              <p className="text-white">{squadron.description}</p>
            </div>
          )}
        </div>

        {/* Members Section */}
        <div className="bg-midnight/60 border border-electric-blue/20 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-electric-blue">
              👥 Miembros ({squadron.members.length}/4)
            </h2>
            <div className="text-sm text-sky-blue/60">
              Reclutamiento: <strong className={squadron.recruitmentMode === 'open' ? 'text-green-400' : 'text-yellow-400'}>
                {squadron.recruitmentMode === 'open' ? '🟢 Abierto' : '🟡 Solo Invitaciones'}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {squadron.members.map((member) => (
              <div
                key={member._id}
                className="bg-midnight/60 border border-electric-blue/10 rounded-lg p-4 hover:border-electric-blue/30 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-white">
                      {member.profile.alias || `${member.profile.firstName} ${member.profile.lastName}`}
                    </h3>
                    <div className="text-xs text-sky-blue/60">
                      {member._id === squadron.captainId._id && '👑 Capitán'}
                      {member._id === user?.id && member._id !== squadron.captainId._id && '✨ Tú'}
                    </div>
                  </div>
                  <div className="text-3xl">🏎️</div>
                </div>

                {member.stats && (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-sky-blue/60">Carreras</div>
                      <div className="text-white font-bold">{member.stats.totalRaces || 0}</div>
                    </div>
                    <div>
                      <div className="text-sky-blue/60">Mejor Tiempo</div>
                      <div className="text-electric-blue font-bold">
                        {member.stats.allTimeBestLap ? formatTime(member.stats.allTimeBestLap) : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sky-blue/60">Mejor Pos.</div>
                      <div className="text-karting-gold font-bold">
                        #{member.stats.bestPosition !== 999 ? member.stats.bestPosition : '—'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Empty Slots */}
            {[...Array(4 - squadron.members.length)].map((_, index) => (
              <div
                key={`empty-${index}`}
                className="bg-midnight/30 border-2 border-dashed border-electric-blue/20 rounded-lg p-4 flex items-center justify-center"
              >
                <div className="text-center text-sky-blue/40">
                  <div className="text-4xl mb-2">➕</div>
                  <div className="text-sm">Slot Disponible</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity - TODO: Implement when race system is ready */}
        <div className="bg-midnight/60 border border-electric-blue/20 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-electric-blue mb-4">
            🏁 Actividad Reciente
          </h2>
          <div className="text-center py-12 text-sky-blue/60">
            <div className="text-6xl mb-4">🏆</div>
            <p>Las carreras de escudería estarán disponibles próximamente</p>
          </div>
        </div>
      </div>
    </div>
  );
}
