'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

type TabType = 'championships' | 'friendly';

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
  const [activeTab, setActiveTab] = useState<TabType>('championships');
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
      // const response = await fetch('/api/races/list', {
      //   headers: { 'Authorization': `Bearer ${token}` },
      // });
      // const data = await response.json();

      // Mock data por ahora
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
          <Link
            href="/dashboard"
            className="px-4 py-2 border border-electric-blue/50 text-electric-blue rounded-lg hover:bg-electric-blue/10 transition-all"
          >
            ← VOLVER
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-electric-blue/30">
          <button
            onClick={() => setActiveTab('championships')}
            className={`px-6 py-3 font-racing transition-all ${
              activeTab === 'championships'
                ? 'text-gold border-b-2 border-gold'
                : 'text-sky-blue/50 hover:text-sky-blue'
            }`}
          >
            🏆 CAMPEONATOS
          </button>
          <button
            onClick={() => setActiveTab('friendly')}
            className={`px-6 py-3 font-racing transition-all ${
              activeTab === 'friendly'
                ? 'text-gold border-b-2 border-gold'
                : 'text-sky-blue/50 hover:text-sky-blue'
            }`}
          >
            🤝 AMISTOSAS
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto">
        {activeTab === 'championships' ? (
          <ChampionshipsTab
            races={championshipRaces}
            isLoading={isLoading}
            onRefresh={fetchRaces}
          />
        ) : (
          <FriendlyRacesTab
            races={friendlyRaces}
            isLoading={isLoading}
            onRefresh={fetchRaces}
            token={token}
          />
        )}
      </div>
    </div>
  );
}

// Championships Tab Component
function ChampionshipsTab({
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
      <div className="bg-gradient-to-br from-midnight via-gold/5 to-midnight border-2 border-gold/30 rounded-xl p-12 text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h3 className="text-2xl font-racing text-gold mb-2">
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

// Friendly Races Tab Component
function FriendlyRacesTab({
  races,
  isLoading,
  onRefresh,
  token,
}: {
  races: Race[];
  isLoading: boolean;
  onRefresh: () => void;
  token: string | null;
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin text-6xl mb-4">🏁</div>
        <p className="text-sky-blue/70">Cargando carreras amistosas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-gold text-midnight font-racing rounded-lg hover:bg-gold/90 transition-all shadow-lg shadow-gold/30"
        >
          + CREAR CARRERA AMISTOSA
        </button>
      </div>

      {/* Races List */}
      {races.length === 0 ? (
        <div className="bg-gradient-to-br from-midnight via-electric-blue/5 to-midnight border-2 border-electric-blue/30 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">🤝</div>
          <h3 className="text-2xl font-racing text-electric-blue mb-2">
            NO HAY CARRERAS AMISTOSAS
          </h3>
          <p className="text-sky-blue/70 mb-6">
            Sé el primero en crear una carrera amistosa
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-electric-blue/20 border border-electric-blue/50 text-electric-blue font-racing rounded-lg hover:bg-electric-blue/30 transition-all"
          >
            CREAR AHORA
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {races.map((race) => (
            <RaceCard key={race._id} race={race} />
          ))}
        </div>
      )}

      {/* Create Modal - TODO: Implementar */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-gradient-to-br from-midnight via-gold/20 to-midnight border-2 border-gold/50 rounded-xl p-6">
            <h3 className="text-2xl font-racing text-gold mb-4">
              CREAR CARRERA AMISTOSA
            </h3>
            <p className="text-sky-blue/70 mb-6">
              Funcionalidad en desarrollo...
            </p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="w-full px-4 py-2 bg-electric-blue/20 border border-electric-blue/50 text-electric-blue rounded-lg hover:bg-electric-blue/30 transition-all"
            >
              CERRAR
            </button>
          </div>
        </div>
      )}
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
          ? 'via-gold/10 border-gold/50'
          : 'via-electric-blue/10 border-electric-blue/50'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3
            className={`text-xl font-racing mb-1 ${
              isChampionship ? 'text-gold' : 'text-electric-blue'
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
              ? 'bg-gold/20 text-gold'
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
              ? 'bg-gold/20 border border-gold/50 text-gold hover:bg-gold/30'
              : 'bg-electric-blue/20 border border-electric-blue/50 text-electric-blue hover:bg-electric-blue/30'
          }`}
        >
          VER DETALLES
        </button>
      </div>
    </div>
  );
}
