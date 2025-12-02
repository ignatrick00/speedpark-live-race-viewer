'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface JoinEventModalProps {
  event: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function JoinEventModal({ event, onClose, onSuccess }: JoinEventModalProps) {
  const { token, user } = useAuth();
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [squadron, setSquadron] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedKart, setSelectedKart] = useState<number | null>(null);
  const [occupiedKarts, setOccupiedKarts] = useState<number[]>([]);

  useEffect(() => {
    fetchSquadronAndKarts();
  }, []);

  const fetchSquadronAndKarts = async () => {
    try {
      // Fetch squadron
      const squadronResponse = await fetch('/api/squadron/my-squadron', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (squadronResponse.ok) {
        const squadronData = await squadronResponse.json();
        if (squadronData.squadron) {
          setSquadron(squadronData.squadron);
        }
      }

      // Fetch occupied karts for this event
      const kartsResponse = await fetch(`/api/squadron-events/${event._id}/occupied-karts`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (kartsResponse.ok) {
        const kartsData = await kartsResponse.json();
        setOccupiedKarts(kartsData.occupiedKarts || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!squadron) {
      alert('Debes pertenecer a una escudería');
      return;
    }

    if (!selectedKart) {
      alert('Por favor selecciona un kart');
      return;
    }

    setIsJoining(true);
    try {
      const response = await fetch(`/api/squadron-events/${event._id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ kartNumber: selectedKart }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('¡Registrado exitosamente! Redirigiendo a tu evento...');
        router.push(`/evento/${event._id}`);
      } else {
        alert(data.error || 'Error al registrarse');
      }
    } catch (error) {
      console.error('Error joining event:', error);
      alert('Error al registrarse en el evento');
    } finally {
      setIsJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-4xl bg-gradient-to-br from-midnight via-purple-500/20 to-midnight border-2 border-purple-500/50 rounded-xl p-8">
          <div className="text-center py-12">
            <div className="animate-spin text-4xl mb-2">⚙️</div>
            <p className="text-purple-300/70">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  const karts = Array.from({ length: 20 }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl bg-gradient-to-br from-midnight via-purple-500/20 to-midnight border-2 border-purple-500/50 rounded-xl p-8 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-purple-400 hover:text-white transition-colors text-2xl z-10"
        >
          ✕
        </button>

        <h3 className="text-3xl font-racing text-purple-400 mb-2 text-center">
          🏎️ SELECCIONA TU KART
        </h3>
        <p className="text-sky-blue/70 text-center mb-6">
          {event.name} - {squadron?.name || 'Tu Escudería'}
        </p>

        {!squadron ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">⚠️</div>
            <p className="text-xl text-orange-400 mb-2">
              Debes pertenecer a una escudería
            </p>
            <p className="text-sky-blue/70 mb-6">
              Los campeonatos son por escuderías. Únete o crea una primero.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={onClose}
                className="px-6 py-3 border border-sky-blue/30 text-sky-blue/70 rounded-lg hover:bg-sky-blue/10"
              >
                Cerrar
              </button>
              <a
                href="/squadron"
                className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                Ver Escuderías
              </a>
            </div>
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
                        ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.5), rgba(147, 51, 234, 0.3)), url(/images/Friendly-races/kart.png)'
                        : 'linear-gradient(135deg, rgba(109, 40, 217, 0.3), rgba(126, 34, 206, 0.2)), url(/images/Friendly-races/kart.png)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                    className={`p-4 rounded-lg border-4 transition-all relative overflow-hidden ${
                      isOccupied
                        ? 'border-red-500 cursor-not-allowed'
                        : isSelected
                        ? 'border-purple-400 shadow-lg shadow-purple-400/50 scale-105'
                        : 'border-purple-500/30 hover:border-purple-400 hover:scale-105'
                    }`}
                  >
                    <div className="relative z-10">
                      <div className="text-3xl font-racing text-white drop-shadow-lg">
                        {kartNumber}
                      </div>
                      {isOccupied && (
                        <div className="text-xs text-red-300 font-bold mt-1">
                          OCUPADO
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 justify-center mb-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500/30 border-2 border-purple-500/50 rounded"></div>
                <span className="text-sky-blue/70">Disponible</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-400 border-2 border-purple-400 rounded"></div>
                <span className="text-sky-blue/70">Seleccionado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600/50 border-2 border-red-500 rounded"></div>
                <span className="text-sky-blue/70">Ocupado</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={onClose}
                disabled={isJoining}
                className="flex-1 px-6 py-3 border border-sky-blue/30 text-sky-blue/70 rounded-lg hover:bg-sky-blue/10 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleJoin}
                disabled={isJoining || !selectedKart}
                className="flex-1 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all disabled:opacity-50 font-racing"
              >
                {isJoining ? 'REGISTRANDO...' : '🏆 CONFIRMAR REGISTRO'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
