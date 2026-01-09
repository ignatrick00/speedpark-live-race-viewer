'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface Race {
  _id: string;
  name: string;
  date: string;
  time: string;
  participants: any[];
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
        // Filter races where:
        // 1. Status is 'open'
        // 2. Has available spots
        // 3. Date is in the future
        // 4. Challenged user is NOT already in the race
        const now = new Date();
        const availableRaces = (data.races || []).filter((race: Race) => {
          const raceDate = new Date(race.date);
          const hasSpace = race.participants.length < race.maxParticipants;
          const isFuture = raceDate >= now;
          const isOpen = race.status === 'open';

          // Check if challenged user is already in this race
          const challengedUserAlreadyInRace = race.participants?.some(
            (p: any) => p.userId === challengedUserId
          );

          return isOpen && hasSpace && isFuture && !challengedUserAlreadyInRace;
        });

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

      const response = await fetch(`/api/races/friendly/${selectedRaceId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          friendIds: [challengedUserId],
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`¡Reto enviado a ${challengedDriverName}!`);
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-racing-black/95 to-midnight/95 border-2 border-electric-blue/30 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-electric-blue/20 to-cyan-500/20 border-b border-electric-blue/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-racing text-electric-blue mb-2">
                🏁 Retar a Duelo
              </h2>
              <p className="text-sky-blue/70">
                Invita a <span className="text-karting-gold font-bold">{challengedDriverName}</span> a una carrera amistosa
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-sky-blue hover:text-electric-blue transition-colors text-2xl"
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
              <div className="text-6xl mb-4">🏎️</div>
              <h3 className="text-xl font-racing text-white mb-3">
                No hay carreras disponibles
              </h3>
              <p className="text-sky-blue/70 mb-6 max-w-md mx-auto">
                No hay carreras amistosas abiertas en este momento. Crea una nueva carrera para retar a {challengedDriverName}.
              </p>
              <button
                onClick={handleCreateRace}
                className="px-6 py-3 bg-gradient-to-r from-electric-blue to-cyan-500 text-white font-racing rounded-lg hover:shadow-lg hover:shadow-electric-blue/50 transition-all"
              >
                Crear Carrera Amistosa
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sky-blue/70 mb-4">
                Selecciona una carrera amistosa disponible para invitar a {challengedDriverName}:
              </p>

              {/* Race List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {races.map((race) => {
                  const raceDate = new Date(race.date);
                  const availableSpots = race.maxParticipants - race.participants.length;
                  const isSelected = selectedRaceId === race._id;

                  return (
                    <button
                      key={race._id}
                      onClick={() => setSelectedRaceId(race._id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'bg-electric-blue/20 border-electric-blue'
                          : 'bg-racing-black/40 border-sky-blue/20 hover:border-electric-blue/50'
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
                              👥 {race.participants.length}/{race.maxParticipants}
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
                  className="flex-1 px-6 py-3 bg-racing-black border border-sky-blue/30 text-sky-blue rounded-lg hover:bg-sky-blue/10 transition-all font-racing"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendChallenge}
                  disabled={!selectedRaceId || sending}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-electric-blue to-cyan-500 text-white font-racing rounded-lg hover:shadow-lg hover:shadow-electric-blue/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? 'Enviando...' : '🏁 Enviar Reto'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
