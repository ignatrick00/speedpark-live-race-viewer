'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

type ViewMode = 'selection' | 'championships' | 'friendly-join' | 'friendly-create';

interface Race {
  _id: string;
  name: string;
  date: Date;
  time: string;
  type: 'championship' | 'friendly';
  participants: number;
  maxParticipants?: number;
  organizerId?: string;
  organizerName?: string;
}

export default function RacesPage() {
  const { user, token } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('selection');
  const [championshipRaces, setChampionshipRaces] = useState<Race[]>([]);
  const [friendlyRaces, setFriendlyRaces] = useState<Race[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchRaces();
    }
  }, [token]);

  const fetchRaces = async () => {
    try {
      setIsLoading(true);
      // TODO: Implementar endpoints reales
      setChampionshipRaces([]);
      setFriendlyRaces([]);
    } catch (error) {
      console.error('Error fetching races:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-midnight via-racing-black to-midnight p-4 md:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-racing text-gold mb-2">
              🏁 CARRERAS
            </h1>
            <p className="text-sky-blue/70">
              Campeonatos y carreras amistosas
            </p>
          </div>
          <button
            onClick={() => setViewMode('selection')}
            className="px-4 py-2 border border-electric-blue/50 text-electric-blue rounded-lg hover:bg-electric-blue/10 transition-all"
          >
            ← VOLVER
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto">
        {viewMode === 'selection' && (
          <SelectionView onSelectChampionships={() => setViewMode('championships')} />
        )}

        {viewMode === 'championships' && (
          <ChampionshipsView
            races={championshipRaces}
            isLoading={isLoading}
            onRefresh={fetchRaces}
          />
        )}

        {viewMode === 'friendly-join' && (
          <FriendlyJoinView
            races={friendlyRaces}
            isLoading={isLoading}
            onRefresh={fetchRaces}
          />
        )}

        {viewMode === 'friendly-create' && (
          <FriendlyCreateView token={token} onBack={() => setViewMode('selection')} />
        )}
      </div>
    </div>
  );
}

// Selection View - Two big cards
function SelectionView({
  onSelectChampionships,
}: {
  onSelectChampionships: () => void;
}) {
  const [showFriendlyOptions, setShowFriendlyOptions] = useState(false);

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Championships Card */}
      <button
        onClick={onSelectChampionships}
        className="group relative bg-gradient-to-br from-midnight via-cyan-500/20 to-midnight border-2 border-cyan-400 rounded-2xl p-12 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-400/50"
      >
        <div className="text-center">
          <div className="text-8xl mb-6 group-hover:scale-110 transition-transform">
            🏆
          </div>
          <h2 className="text-4xl font-racing text-cyan-400 mb-4">
            CAMPEONATOS
          </h2>
          <p className="text-sky-blue/70 text-lg mb-6">
            Competencias oficiales organizadas
          </p>
          <div className="inline-block px-6 py-3 bg-cyan-400/20 border border-cyan-400/50 text-cyan-300 rounded-lg font-racing">
            VER CAMPEONATOS
          </div>
        </div>
      </button>

      {/* Friendly Races Card */}
      <div className="relative">
        {!showFriendlyOptions ? (
          <button
            onClick={() => setShowFriendlyOptions(true)}
            className="group w-full h-full bg-gradient-to-br from-midnight via-electric-blue/20 to-midnight border-2 border-electric-blue rounded-2xl p-12 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-electric-blue/50"
          >
            <div className="text-center">
              <div className="text-8xl mb-6 group-hover:scale-110 transition-transform">
                🤝
              </div>
              <h2 className="text-4xl font-racing text-electric-blue mb-4">
                CARRERAS AMISTOSAS
              </h2>
              <p className="text-sky-blue/70 text-lg mb-6">
                Crea o únete a carreras casuales
              </p>
              <div className="inline-block px-6 py-3 bg-electric-blue/20 border border-electric-blue/50 text-electric-blue rounded-lg font-racing">
                SELECCIONAR
              </div>
            </div>
          </button>
        ) : (
          <div className="bg-gradient-to-br from-midnight via-electric-blue/20 to-midnight border-2 border-electric-blue rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🤝</div>
              <h2 className="text-3xl font-racing text-electric-blue mb-2">
                CARRERAS AMISTOSAS
              </h2>
              <p className="text-sky-blue/70">¿Qué deseas hacer?</p>
            </div>

            <div className="space-y-4">
              <Link href="/races?mode=friendly-join">
                <button className="w-full group bg-gradient-to-r from-electric-blue/30 to-electric-blue/10 border-2 border-electric-blue/50 rounded-xl p-6 hover:bg-electric-blue/20 transition-all hover:scale-105 hover:shadow-lg hover:shadow-electric-blue/30">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h3 className="text-2xl font-racing text-electric-blue mb-1">
                        UNIRTE A CARRERA
                      </h3>
                      <p className="text-sky-blue/60 text-sm">
                        Ve carreras disponibles y únete
                      </p>
                    </div>
                    <div className="text-4xl group-hover:scale-110 transition-transform">
                      🏁
                    </div>
                  </div>
                </button>
              </Link>

              <Link href="/races?mode=friendly-create">
                <button className="w-full group bg-gradient-to-r from-gold/30 to-gold/10 border-2 border-gold/50 rounded-xl p-6 hover:bg-gold/20 transition-all hover:scale-105 hover:shadow-lg hover:shadow-gold/30">
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h3 className="text-2xl font-racing text-gold mb-1">
                        CREAR CARRERA
                      </h3>
                      <p className="text-sky-blue/60 text-sm">
                        Organiza tu propia carrera amistosa
                      </p>
                    </div>
                    <div className="text-4xl group-hover:scale-110 transition-transform">
                      ➕
                    </div>
                  </div>
                </button>
              </Link>

              <button
                onClick={() => setShowFriendlyOptions(false)}
                className="w-full px-4 py-3 border border-sky-blue/30 text-sky-blue/70 rounded-lg hover:bg-sky-blue/10 transition-all"
              >
                CANCELAR
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Championships View
function ChampionshipsView({
  races,
  isLoading,
  onRefresh,
}: {
  races: Race[];
  isLoading: boolean;
  onRefresh: () => void;
}) {
  if (isLoading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin text-6xl mb-4">🏁</div>
        <p className="text-sky-blue/70">Cargando campeonatos...</p>
      </div>
    );
  }

  if (races.length === 0) {
    return (
      <div className="bg-gradient-to-br from-midnight via-cyan-500/10 to-midnight border-2 border-cyan-400/50 rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h3 className="text-2xl font-racing text-cyan-400 mb-2">
          NO HAY CAMPEONATOS ACTIVOS
        </h3>
        <p className="text-sky-blue/70 mb-6">
          Los campeonatos son creados por organizadores
        </p>
        <p className="text-sm text-sky-blue/50">
          Mantente atento para futuras competencias
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {races.map((race) => (
        <RaceCard key={race._id} race={race} />
      ))}
    </div>
  );
}

// Friendly Join View
function FriendlyJoinView({
  races,
  isLoading,
  onRefresh,
}: {
  races: Race[];
  isLoading: boolean;
  onRefresh: () => void;
}) {
  if (isLoading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin text-6xl mb-4">🏁</div>
        <p className="text-sky-blue/70">Cargando carreras amistosas...</p>
      </div>
    );
  }

  if (races.length === 0) {
    return (
      <div className="bg-gradient-to-br from-midnight via-electric-blue/10 to-midnight border-2 border-electric-blue/50 rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">🤝</div>
        <h3 className="text-2xl font-racing text-electric-blue mb-2">
          NO HAY CARRERAS AMISTOSAS DISPONIBLES
        </h3>
        <p className="text-sky-blue/70 mb-6">
          Sé el primero en crear una carrera amistosa
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {races.map((race) => (
        <RaceCard key={race._id} race={race} />
      ))}
    </div>
  );
}

// Friendly Create View
function FriendlyCreateView({
  token,
  onBack,
}: {
  token: string | null;
  onBack: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-midnight via-gold/20 to-midnight border-2 border-gold/50 rounded-xl p-8">
        <h3 className="text-3xl font-racing text-gold mb-6 text-center">
          ✨ CREAR CARRERA AMISTOSA
        </h3>
        <div className="text-center text-sky-blue/70 py-12">
          <div className="text-6xl mb-4">🚧</div>
          <p className="text-xl mb-2">Funcionalidad en desarrollo</p>
          <p className="text-sm text-sky-blue/50">
            Pronto podrás crear tus propias carreras amistosas
          </p>
        </div>
      </div>
    </div>
  );
}

// Race Card Component
function RaceCard({ race }: { race: Race }) {
  const isChampionship = race.type === 'championship';

  return (
    <div
      className={`bg-gradient-to-br from-midnight to-midnight border-2 rounded-xl p-6 hover:scale-[1.02] transition-all ${
        isChampionship
          ? 'via-cyan-400/10 border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-400/30'
          : 'via-electric-blue/10 border-electric-blue/50 hover:shadow-lg hover:shadow-electric-blue/30'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3
            className={`text-xl font-racing mb-1 ${
              isChampionship ? 'text-cyan-400' : 'text-electric-blue'
            }`}
          >
            {race.name}
          </h3>
          {race.organizerName && (
            <p className="text-sm text-sky-blue/50">
              Organizador: {race.organizerName}
            </p>
          )}
        </div>
        <div
          className={`px-3 py-1 rounded-lg text-xs font-racing ${
            isChampionship
              ? 'bg-cyan-400/20 text-cyan-400'
              : 'bg-electric-blue/20 text-electric-blue'
          }`}
        >
          {isChampionship ? '🏆 CAMPEONATO' : '🤝 AMISTOSA'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-sky-blue/50 mb-1">📅 Fecha</p>
          <p className="text-sky-blue font-digital">
            {new Date(race.date).toLocaleDateString('es-CL', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </p>
        </div>
        <div>
          <p className="text-xs text-sky-blue/50 mb-1">🕐 Hora</p>
          <p className="text-sky-blue font-digital">{race.time}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-sky-blue/70">
          👥 {race.participants}
          {race.maxParticipants && `/${race.maxParticipants}`} participantes
        </div>
        <button
          className={`px-4 py-2 rounded-lg font-racing transition-all ${
            isChampionship
              ? 'bg-cyan-400/20 border border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/30'
              : 'bg-electric-blue/20 border border-electric-blue/50 text-electric-blue hover:bg-electric-blue/30'
          }`}
        >
          VER DETALLES
        </button>
      </div>
    </div>
  );
}
