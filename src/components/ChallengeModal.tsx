'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface Race {
  _id: string;
  name: string;
  date: string;
  time: string;
  participants: number; // Number of participants
  participantsList: any[]; // Array of participant objects
  maxParticipants: number;
  status: string;
}

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  challengedDriverName: string;
  challengedUserId: string;
}

export default function ChallengeModal({
  isOpen,
  onClose,
  challengedDriverName,
  challengedUserId,
}: ChallengeModalProps) {
  const router = useRouter();
  const { token } = useAuth();
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRaceId, setSelectedRaceId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && token) {
      fetchAvailableRaces();
    }
  }, [isOpen, token]);

  const fetchAvailableRaces = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/races/friendly?filter=upcoming', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        console.log('🏁 [CHALLENGE] Total races from API:', data.races?.length || 0);

        // Filter races where:
        // 1. Status is 'open', 'full', or 'confirmed' (not started/finished/cancelled)
        // 2. Has available spots
        // 3. Date is today or in the future (not past)
        // 4. Challenged user is NOT already in the race
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today

        const availableRaces = (data.races || []).filter((race: Race) => {
          const raceDate = new Date(race.date);
          const raceDateOnly = new Date(raceDate.getFullYear(), raceDate.getMonth(), raceDate.getDate());
          const isFuture = raceDateOnly >= today; // Compare only dates, not times
          const isValidStatus = ['open', 'full', 'confirmed'].includes(race.status);

          // Check if challenged user is already in this race
          const challengedUserAlreadyInRace = Array.isArray(race.participantsList) && race.participantsList.some(
            (p: any) => p.userId === challengedUserId
          );

          console.log(`🏁 [CHALLENGE] Race "${race.name}":`, {
            status: race.status,
            isValidStatus,
            isFuture,
            participants: race.participants.length,
            maxParticipants: race.maxParticipants,
            challengedUserInRace: challengedUserAlreadyInRace,
            passes: isValidStatus && isFuture && !challengedUserAlreadyInRace
          });

          // Allow challenge even if race is full - challenged user can join when they accept
          return isValidStatus && isFuture && !challengedUserAlreadyInRace;
        });

        console.log('🏁 [CHALLENGE] Available races after filtering:', availableRaces.length);
        setRaces(availableRaces);
      } else {
        setError('Error al cargar carreras');
      }
    } catch (error) {
      console.error('Error fetching races:', error);
      setError('Error al cargar carreras');
    } finally {
      setLoading(false);
    }
  };

  const handleSendChallenge = async () => {
    if (!selectedRaceId) {
      setError('Debes seleccionar una carrera');
      return;
    }

    try {
      setSending(true);
      setError(null);

      const response = await fetch(`/api/races/friendly/${selectedRaceId}/challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          challengedUserId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`⚔️ ¡Reto enviado a ${challengedDriverName}! El desafío llegará a su inbox.`);
        onClose();
      } else {
        setError(data.error || 'Error al enviar reto');
      }
    } catch (error) {
      console.error('Error sending challenge:', error);
      setError('Error al enviar reto');
    } finally {
      setSending(false);
    }
  };

  const handleCreateRace = () => {
    onClose();
    router.push('/races?mode=friendly-create');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative bg-gradient-to-br from-red-950/95 via-racing-black/95 to-orange-950/95 border-4 border-red-500/50 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl shadow-red-500/30">
        {/* Fuego en esquinas */}
        <div className="absolute top-0 left-0 text-6xl animate-pulse pointer-events-none">🔥</div>
        <div className="absolute top-0 right-0 text-6xl animate-pulse pointer-events-none" style={{ animationDelay: '0.3s' }}>🔥</div>
        <div className="absolute bottom-0 left-0 text-6xl animate-pulse pointer-events-none" style={{ animationDelay: '0.6s' }}>🔥</div>
        <div className="absolute bottom-0 right-0 text-6xl animate-pulse pointer-events-none" style={{ animationDelay: '0.9s' }}>🔥</div>

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-red-600/30 via-orange-600/30 to-red-600/30 border-b-2 border-red-500/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-4xl font-racing text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-red-400 mb-2 animate-pulse">
                ⚔️ RETO DE BATALLA
              </h2>
              <p className="text-orange-200/90 text-lg">
                🔥 Desafía a <span className="text-red-400 font-bold text-xl">{challengedDriverName}</span> a una batalla en pista
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-red-400 hover:text-red-300 transition-colors text-3xl hover:scale-110 transform"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sky-blue">Cargando carreras...</p>
              </div>
            </div>
          ) : races.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🔥</div>
              <h3 className="text-2xl font-racing text-red-400 mb-3">
                No hay carreras disponibles
              </h3>
              <p className="text-orange-200/80 mb-6 max-w-md mx-auto">
                🔥 Crea una nueva carrera amistosa para lanzar tu reto a {challengedDriverName}.
              </p>
              <button
                onClick={handleCreateRace}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-racing rounded-lg hover:scale-105 hover:shadow-lg hover:shadow-red-500/50 transition-all"
              >
                ➕ Crear Carrera Amistosa
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-orange-200/80 mb-4 text-lg font-bold">
                🏁 Selecciona el campo de batalla para enfrentar a {challengedDriverName}:
              </p>

              {/* Info Card - Create New Race */}
              <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4 mb-4">
                <p className="text-orange-200/80 text-sm mb-3">
                  💡 ¿No encuentras la fecha que buscas? Crea una nueva carrera amistosa y luego vuelve para retar.
                </p>
                <button
                  onClick={handleCreateRace}
                  className="w-full px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white font-racing rounded-lg hover:scale-102 transition-all"
                >
                  ➕ Crear Nueva Carrera
                </button>
              </div>

              {/* Race List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {races.map((race) => {
                  const raceDate = new Date(race.date);
                  const participantCount = typeof race.participants === 'number' ? race.participants : 0;
                  const availableSpots = race.maxParticipants - participantCount;
                  const isSelected = selectedRaceId === race._id;

                  return (
                    <button
                      key={race._id}
                      onClick={() => setSelectedRaceId(race._id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all transform hover:scale-102 ${
                        isSelected
                          ? 'bg-red-600/30 border-red-500 shadow-lg shadow-red-500/30'
                          : 'bg-racing-black/40 border-orange-800/30 hover:border-red-500/50 hover:bg-red-950/20'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-white mb-1">
                            {race.name}
                          </h4>
                          <div className="flex flex-wrap gap-3 text-sm">
                            <span className="text-sky-blue">
                              📅 {raceDate.toLocaleDateString('es-CL')}
                            </span>
                            <span className="text-sky-blue">
                              🕐 {race.time}
                            </span>
                            <span className="text-cyan-400">
                              👥 {participantCount}/{race.maxParticipants}
                            </span>
                            <span className="text-green-400">
                              ✓ {availableSpots} espacios disponibles
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="text-electric-blue text-2xl ml-4">
                            ✓
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-racing-black border-2 border-gray-600/50 text-gray-400 rounded-lg hover:bg-gray-900/50 hover:border-gray-500 transition-all font-racing"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendChallenge}
                  disabled={!selectedRaceId || sending}
                  className="flex-1 px-8 py-4 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 text-white font-racing text-xl rounded-lg hover:scale-105 hover:shadow-2xl hover:shadow-red-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed border-2 border-red-400/50"
                >
                  {sending ? '⚔️ Enviando...' : '⚔️ LANZAR RETO'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
