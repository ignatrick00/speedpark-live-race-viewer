'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

type ViewMode = 'selection' | 'championships' | 'friendly-join' | 'friendly-create';

interface Participant {
  userId: string;
  kartNumber: number;
  name: string;
  joinedAt: Date;
}

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
  participantsList?: Participant[];
}

export default function RacesPage() {
  const { user, token } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('selection');
  const [championshipRaces, setChampionshipRaces] = useState<Race[]>([]);
  const [friendlyRaces, setFriendlyRaces] = useState<Race[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🔄 ViewMode changed to:', viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (token) {
      fetchRaces();
    }
  }, [token]);

  const fetchRaces = async () => {
    try {
      setIsLoading(true);

      // Fetch friendly races
      const friendlyResponse = await fetch('/api/races/friendly', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const friendlyData = await friendlyResponse.json();

      if (friendlyData.success) {
        setFriendlyRaces(friendlyData.races || []);
      }

      // TODO: Fetch championship races
      setChampionshipRaces([]);
    } catch (error) {
      console.error('Error fetching races:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Navbar />
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
          <SelectionView
            onSelectChampionships={() => setViewMode('championships')}
            onSelectFriendlyJoin={() => setViewMode('friendly-join')}
            onSelectFriendlyCreate={() => setViewMode('friendly-create')}
          />
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
          <FriendlyCreateView
            token={token}
            onBack={() => setViewMode('selection')}
            onSuccess={() => {
              fetchRaces();
              setViewMode('friendly-join');
            }}
          />
        )}
      </div>
    </div>
    </>
  );
}

// Selection View - Two big cards
function SelectionView({
  onSelectChampionships,
  onSelectFriendlyJoin,
  onSelectFriendlyCreate,
}: {
  onSelectChampionships: () => void;
  onSelectFriendlyJoin: () => void;
  onSelectFriendlyCreate: () => void;
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
              <button
                onClick={() => {
                  console.log('🏁 Click UNIRTE A CARRERA');
                  onSelectFriendlyJoin();
                }}
                className="w-full group bg-gradient-to-r from-electric-blue/30 to-electric-blue/10 border-2 border-electric-blue/50 rounded-xl p-6 hover:bg-electric-blue/20 transition-all hover:scale-105 hover:shadow-lg hover:shadow-electric-blue/30"
              >
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

              <button
                onClick={() => {
                  console.log('⭐ Click CREAR CARRERA');
                  onSelectFriendlyCreate();
                }}
                className="w-full group bg-gradient-to-r from-gold/30 to-gold/10 border-2 border-gold/50 rounded-xl p-6 hover:bg-gold/20 transition-all hover:scale-105 hover:shadow-lg hover:shadow-gold/30"
              >
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
  const { token, user } = useAuth();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);

  const handleJoinClick = (race: Race) => {
    setSelectedRace(race);
    setShowJoinModal(true);
  };

  const handleDeleteRace = async (raceId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta carrera?')) {
      return;
    }

    try {
      const response = await fetch(`/api/races/friendly/${raceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        alert('Carrera eliminada exitosamente');
        onRefresh();
      } else {
        alert(data.error || 'Error al eliminar la carrera');
      }
    } catch (error) {
      console.error('Error deleting race:', error);
      alert('Error al eliminar la carrera');
    }
  };

  const handleConfirmRace = async (raceId: string) => {
    if (!confirm('¿Confirmar esta carrera? Los participantes no podrán unirse después.')) {
      return;
    }

    try {
      const response = await fetch(`/api/races/friendly/${raceId}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        alert('Carrera confirmada exitosamente');
        onRefresh();
      } else {
        alert(data.error || 'Error al confirmar la carrera');
      }
    } catch (error) {
      console.error('Error confirming race:', error);
      alert('Error al confirmar la carrera');
    }
  };

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
    <>
      <div className="space-y-4">
        {races.map((race) => (
          <RaceCard
            key={race._id}
            race={race}
            currentUserId={user?.id}
            onJoinClick={() => handleJoinClick(race)}
            onDeleteClick={() => handleDeleteRace(race._id)}
            onConfirmClick={() => handleConfirmRace(race._id)}
          />
        ))}
      </div>

      {/* Join Modal */}
      {showJoinModal && selectedRace && (
        <JoinRaceModal
          race={selectedRace}
          token={token}
          onClose={() => {
            setShowJoinModal(false);
            setSelectedRace(null);
          }}
          onSuccess={() => {
            setShowJoinModal(false);
            setSelectedRace(null);
            onRefresh();
          }}
        />
      )}
    </>
  );
}

// Friendly Create View
function FriendlyCreateView({
  token,
  onBack,
  onSuccess,
}: {
  token: string | null;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [raceName, setRaceName] = useState('');
  const [selectedKart, setSelectedKart] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<'form' | 'kart'>('form'); // Paso 1: formulario, Paso 2: selección de kart

  // Generar próximos 14 días
  const getNext14Days = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  // Generar bloques horarios de 12:00 a 22:00 (10 PM)
  const timeSlots = [
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00'
  ];

  const handleCreateRace = async () => {
    if (!raceName.trim() || !selectedDate || !selectedTime || !selectedKart) {
      alert('Por favor completa todos los campos y selecciona tu kart');
      return;
    }

    if (!token) {
      alert('No estás autenticado. Por favor inicia sesión.');
      return;
    }

    console.log('Creating race with token:', token ? 'Token exists' : 'No token');

    setIsCreating(true);
    try {
      const response = await fetch('/api/races/create-friendly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: raceName,
          date: selectedDate,
          time: selectedTime,
          kartNumber: selectedKart,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('¡Carrera creada exitosamente! Serás redirigido a las carreras disponibles.');
        onSuccess();
      } else {
        alert(data.error || 'Error al crear la carrera');
      }
    } catch (error) {
      console.error('Error creating race:', error);
      alert('Error al crear la carrera');
    } finally {
      setIsCreating(false);
    }
  };

  const days14 = getNext14Days();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-midnight via-gold/20 to-midnight border-2 border-gold/50 rounded-xl p-8">
        <h3 className="text-3xl font-racing text-gold mb-6 text-center">
          ✨ CREAR CARRERA AMISTOSA {step === 'kart' && '- SELECCIONA TU KART'}
        </h3>

        {/* PASO 1: Formulario */}
        {step === 'form' && (
          <>
        {/* Race Name */}
        <div className="mb-8">
          <label className="block text-electric-blue font-racing text-lg mb-2">
            NOMBRE DE LA CARRERA
          </label>
          <input
            type="text"
            value={raceName}
            onChange={(e) => setRaceName(e.target.value)}
            placeholder="Ej: Carrera del Viernes"
            maxLength={50}
            className="w-full px-4 py-3 bg-midnight/50 border-2 border-electric-blue/50 rounded-lg text-sky-blue focus:border-electric-blue focus:outline-none font-digital"
          />
        </div>

        {/* Date Selection */}
        <div className="mb-8">
          <label className="block text-electric-blue font-racing text-lg mb-3">
            📅 SELECCIONA LA FECHA
          </label>
          <div className="grid grid-cols-7 gap-2">
            {days14.map((date, index) => {
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              const dayName = date.toLocaleDateString('es-CL', { weekday: 'short' }).toUpperCase();
              const dayNumber = date.getDate();
              const monthName = date.toLocaleDateString('es-CL', { month: 'short' }).toUpperCase();

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(date)}
                  className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                    isSelected
                      ? 'bg-electric-blue/30 border-electric-blue shadow-lg shadow-electric-blue/50'
                      : 'bg-midnight/50 border-electric-blue/30 hover:border-electric-blue/60'
                  }`}
                >
                  <div className="text-center">
                    <p className={`text-xs font-racing ${isSelected ? 'text-electric-blue' : 'text-sky-blue/50'}`}>
                      {dayName}
                    </p>
                    <p className={`text-2xl font-bold font-digital ${isSelected ? 'text-electric-blue' : 'text-sky-blue'}`}>
                      {dayNumber}
                    </p>
                    <p className={`text-xs ${isSelected ? 'text-electric-blue/70' : 'text-sky-blue/50'}`}>
                      {monthName}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Selection */}
        {selectedDate && (
          <div className="mb-8">
            <label className="block text-electric-blue font-racing text-lg mb-3">
              🕐 SELECCIONA LA HORA
            </label>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
              {timeSlots.map((time) => {
                const isSelected = selectedTime === time;
                return (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`p-4 rounded-lg border-2 transition-all hover:scale-105 ${
                      isSelected
                        ? 'bg-gold/30 border-gold shadow-lg shadow-gold/50'
                        : 'bg-midnight/50 border-gold/30 hover:border-gold/60'
                    }`}
                  >
                    <p className={`text-xl font-digital ${isSelected ? 'text-gold' : 'text-sky-blue'}`}>
                      {time}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary - Solo en paso 1 */}
        {selectedDate && selectedTime && raceName && (
          <div className="mb-8 p-4 bg-electric-blue/10 border border-electric-blue/30 rounded-lg">
            <h4 className="text-electric-blue font-racing mb-2">RESUMEN</h4>
            <div className="text-sky-blue/90 space-y-1">
              <p><span className="text-sky-blue/50">Nombre:</span> {raceName}</p>
              <p>
                <span className="text-sky-blue/50">Fecha:</span>{' '}
                {selectedDate.toLocaleDateString('es-CL', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
              <p><span className="text-sky-blue/50">Hora:</span> {selectedTime}</p>
            </div>
          </div>
        )}

        {/* Botones Paso 1 */}
        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="flex-1 px-6 py-3 border-2 border-sky-blue/50 text-sky-blue rounded-lg hover:bg-sky-blue/10 transition-all"
          >
            CANCELAR
          </button>
          <button
            onClick={() => setStep('kart')}
            disabled={!raceName || !selectedDate || !selectedTime}
            style={{
              backgroundColor: raceName && selectedDate && selectedTime ? '#FFD700' : '#333',
              color: raceName && selectedDate && selectedTime ? '#0a0a15' : '#666',
              cursor: !raceName || !selectedDate || !selectedTime ? 'not-allowed' : 'pointer',
            }}
            className="flex-1 px-6 py-3 font-racing rounded-lg transition-all shadow-lg"
          >
            SIGUIENTE →
          </button>
        </div>
          </>
        )}

        {/* PASO 2: Selección de Kart */}
        {step === 'kart' && (
          <>
        {/* Kart Selection Grid */}
        <div className="mb-8">
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: 20 }, (_, i) => i + 1).map((kartNum) => {
              const isSelected = selectedKart === kartNum;
              return (
                <button
                  key={kartNum}
                  onClick={() => setSelectedKart(kartNum)}
                  type="button"
                  style={{
                    backgroundImage: isSelected
                      ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.5), rgba(255, 215, 0, 0.3)), url(/images/Friendly-races/kart.png)'
                      : 'linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(14, 165, 233, 0.2)), url(/images/Friendly-races/kart.png)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                  className={`p-3 rounded-lg border-3 transition-all relative ${
                    isSelected
                      ? 'border-gold shadow-lg shadow-gold/50 scale-105'
                      : 'border-electric-blue/30 hover:border-electric-blue hover:scale-105'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-0 left-0 right-0 bg-gold text-midnight text-xs font-bold py-1 text-center z-40">
                      ⭐ SELECCIONADO
                    </div>
                  )}
                  <div className="text-center relative z-10 mt-3">
                    <p className="text-xs mb-1 font-bold text-sky-blue/70">KART</p>
                    <p className={`text-3xl font-bold font-digital drop-shadow-lg ${
                      isSelected ? 'text-gold' : 'text-electric-blue'
                    }`}
                    style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
                    >
                      #{kartNum}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Resumen con kart seleccionado */}
        {selectedKart && (
          <div className="mb-8 p-4 bg-gold/10 border border-gold/30 rounded-lg">
            <h4 className="text-gold font-racing mb-2">✓ RESUMEN FINAL</h4>
            <div className="text-sky-blue/90 space-y-1">
              <p><span className="text-sky-blue/50">Carrera:</span> {raceName}</p>
              <p><span className="text-sky-blue/50">Fecha:</span> {selectedDate?.toLocaleDateString('es-CL')}</p>
              <p><span className="text-sky-blue/50">Hora:</span> {selectedTime}</p>
              <p><span className="text-sky-blue/50">Tu Kart:</span> <span className="text-gold font-bold text-xl">#{selectedKart}</span></p>
            </div>
          </div>
        )}

        {/* Botones Paso 2 */}
        <div className="flex gap-4">
          <button
            onClick={() => setStep('form')}
            disabled={isCreating}
            className="flex-1 px-6 py-3 border-2 border-sky-blue/50 text-sky-blue rounded-lg hover:bg-sky-blue/10 transition-all disabled:opacity-50"
          >
            ← ATRÁS
          </button>
          <button
            onClick={handleCreateRace}
            disabled={!selectedKart || isCreating}
            style={{
              backgroundColor: selectedKart && !isCreating ? '#FFD700' : '#333',
              color: selectedKart && !isCreating ? '#0a0a15' : '#666',
              cursor: !selectedKart || isCreating ? 'not-allowed' : 'pointer',
            }}
            className="flex-1 px-6 py-3 font-racing rounded-lg transition-all shadow-lg"
          >
            {isCreating ? 'CREANDO...' : '✓ CONFIRMAR Y CREAR'}
          </button>
        </div>
          </>
        )}
      </div>
    </div>
  );
}

// Join Race Modal Component
function JoinRaceModal({
  race,
  token,
  onClose,
  onSuccess,
}: {
  race: Race;
  token: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedKart, setSelectedKart] = useState<number | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [occupiedKarts, setOccupiedKarts] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOccupiedKarts();
  }, []);

  const fetchOccupiedKarts = async () => {
    try {
      console.log('🔍 Fetching participants for race:', race._id);
      console.log('🔑 Token exists:', !!token);

      const response = await fetch(`/api/races/friendly/${race._id}/participants`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      console.log('📡 Participants response status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error('❌ Participants response error:', text);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      console.log('📦 Participants data:', data);

      if (data.success) {
        const karts = data.participants.map((p: any) => p.kartNumber).filter(Boolean);
        setOccupiedKarts(karts);
      }
    } catch (error) {
      console.error('Error fetching occupied karts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!selectedKart) {
      alert('Por favor selecciona un kart');
      return;
    }

    if (!token) {
      alert('No estás autenticado');
      return;
    }

    setIsJoining(true);
    try {
      console.log('🏁 Intentando unirse a carrera:', race._id, 'con kart:', selectedKart);
      const response = await fetch(`/api/races/friendly/${race._id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ kartNumber: selectedKart }),
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const text = await response.text();
        console.error('❌ Join response error (raw):', text);
        alert(`Error al unirse: ${response.status} - ${text.substring(0, 100)}`);
        setIsJoining(false);
        return;
      }

      const data = await response.json();
      console.log('📦 Response data:', data);

      if (data.success) {
        // Actualizar lista de karts ocupados antes de cerrar
        setOccupiedKarts([...occupiedKarts, selectedKart]);
        alert('¡Te has unido a la carrera exitosamente!');
        onSuccess();
      } else {
        alert(data.error || 'Error al unirse a la carrera');
      }
    } catch (error) {
      console.error('❌ Error joining race:', error);
      alert('Error al unirse a la carrera: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsJoining(false);
    }
  };

  const karts = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl bg-gradient-to-br from-midnight via-electric-blue/20 to-midnight border-2 border-electric-blue/50 rounded-xl p-8">
        <h3 className="text-3xl font-racing text-electric-blue mb-2 text-center">
          🏎️ SELECCIONA TU KART
        </h3>
        <p className="text-sky-blue/70 text-center mb-6">
          {race.name}
        </p>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-2">⚙️</div>
            <p className="text-sky-blue/70">Cargando karts...</p>
          </div>
        ) : (
          <>
            {/* Kart Grid */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              {karts.map((kartNumber) => {
                const isOccupied = occupiedKarts.includes(kartNumber);
                const isSelected = selectedKart === kartNumber;

                return (
                  <button
                    key={kartNumber}
                    onClick={() => !isOccupied && setSelectedKart(kartNumber)}
                    disabled={isOccupied}
                    style={{
                      backgroundImage: isOccupied
                        ? 'linear-gradient(135deg, rgba(127, 29, 29, 0.7), rgba(153, 27, 27, 0.6)), url(/images/Friendly-races/kart.png)'
                        : isSelected
                        ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.5), rgba(255, 215, 0, 0.3)), url(/images/Friendly-races/kart.png)'
                        : 'linear-gradient(135deg, rgba(6, 182, 212, 0.3), rgba(14, 165, 233, 0.2)), url(/images/Friendly-races/kart.png)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                    className={`p-4 rounded-lg border-4 transition-all relative overflow-hidden ${
                      isOccupied
                        ? 'border-red-500 cursor-not-allowed'
                        : isSelected
                        ? 'border-gold shadow-lg shadow-gold/50 scale-105'
                        : 'border-electric-blue/30 hover:border-electric-blue hover:scale-105'
                    }`}
                  >
                    {/* OCUPADO - Badge grande */}
                    {isOccupied && (
                      <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-xs font-bold py-1 text-center z-40">
                        ❌ OCUPADO
                      </div>
                    )}

                    {/* DISPONIBLE - Badge grande */}
                    {!isOccupied && !isSelected && (
                      <div className="absolute top-0 left-0 right-0 bg-green-600 text-white text-xs font-bold py-1 text-center z-40">
                        ✅ DISPONIBLE
                      </div>
                    )}

                    {/* SELECCIONADO - Badge grande */}
                    {isSelected && (
                      <div className="absolute top-0 left-0 right-0 bg-gold text-midnight text-xs font-bold py-1 text-center z-40">
                        ⭐ SELECCIONADO
                      </div>
                    )}

                    {/* Número del kart */}
                    <div className="text-center relative z-10 mt-4">
                      <p className="text-xs mb-1 font-bold text-sky-blue/70">KART</p>
                      <p className={`text-5xl font-bold font-digital drop-shadow-lg ${
                        isOccupied ? 'text-red-400' : isSelected ? 'text-gold' : 'text-electric-blue'
                      }`}
                      style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
                      >
                        #{kartNumber}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 mb-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-electric-blue/30 border border-electric-blue rounded"></div>
                <span className="text-sky-blue/70">Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gold/30 border border-gold rounded"></div>
                <span className="text-sky-blue/70">Seleccionado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-900/20 border border-red-500/50 rounded"></div>
                <span className="text-sky-blue/70">Ocupado</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={onClose}
                disabled={isJoining}
                className="flex-1 px-6 py-3 border-2 border-sky-blue/50 text-sky-blue rounded-lg hover:bg-sky-blue/10 transition-all disabled:opacity-50"
              >
                CANCELAR
              </button>
              <button
                onClick={handleJoin}
                disabled={!selectedKart || isJoining}
                style={{
                  backgroundColor: selectedKart && !isJoining ? '#FFD700' : '#333',
                  color: selectedKart && !isJoining ? '#0a0a15' : '#666',
                  cursor: !selectedKart || isJoining ? 'not-allowed' : 'pointer',
                }}
                className="flex-1 px-6 py-3 font-racing rounded-lg transition-all shadow-lg"
              >
                {isJoining ? 'UNIÉNDOTE...' : 'CONFIRMAR'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Race Card Component
function RaceCard({
  race,
  currentUserId,
  onJoinClick,
  onDeleteClick,
  onConfirmClick,
}: {
  race: Race;
  currentUserId?: string;
  onJoinClick?: () => void;
  onDeleteClick?: () => void;
  onConfirmClick?: () => void;
}) {
  const isChampionship = race.type === 'championship';
  const isCreator = currentUserId && race.organizerId === currentUserId;

  console.log('🔍 RaceCard Debug:', {
    raceName: race.name,
    organizerId: race.organizerId,
    currentUserId,
    isCreator,
  });

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

      {/* Lista de participantes */}
      {race.participantsList && race.participantsList.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-midnight/50 border border-electric-blue/20">
          <p className="text-xs text-sky-blue/50 mb-2 font-racing">🏁 PILOTOS INSCRITOS</p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {race.participantsList.map((participant, idx) => (
              <div
                key={participant.userId || idx}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-sky-blue flex items-center gap-2">
                  <span className="text-gold font-digital">#{participant.kartNumber}</span>
                  <span>{participant.name}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-sky-blue/70">
          👥 {race.participants}
          {race.maxParticipants && `/${race.maxParticipants}`} participantes
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Botones del creador */}
          {isCreator && (
            <>
              <button
                onClick={onConfirmClick}
                className="px-3 py-2 rounded-lg font-racing transition-all bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-600/30 text-sm"
              >
                ✓ CONFIRMAR
              </button>
              <button
                onClick={onDeleteClick}
                className="px-3 py-2 rounded-lg font-racing transition-all bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30 text-sm"
              >
                🗑️ ELIMINAR
              </button>
              <a
                href={`https://api.whatsapp.com/send?phone=56940052596&text=${encodeURIComponent(
                  `Hola! Quiero hacer una reserva para la carrera "${race.name}" el día ${new Date(race.date).toLocaleDateString('es-CL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })} a las ${race.time}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg font-racing transition-all bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:bg-blue-600/30 text-sm whitespace-nowrap"
              >
                📱 AVISAR A SPEEDPARK
              </a>
            </>
          )}

          {/* Botón de unirse (solo si NO es el creador) */}
          {!isCreator && onJoinClick && (
            <button
              onClick={onJoinClick}
              className="px-4 py-2 rounded-lg font-racing transition-all bg-electric-blue/20 border border-electric-blue/50 text-electric-blue hover:bg-electric-blue/30"
            >
              UNIRME
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
