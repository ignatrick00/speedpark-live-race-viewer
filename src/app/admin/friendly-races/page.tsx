'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AdminGuard from '@/components/AdminGuard';

export default function FriendlyRacesAdminPage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [maxParticipants, setMaxParticipants] = useState<number>(12);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch current config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/admin/system-config');
        const data = await response.json();

        if (data.success) {
          setMaxParticipants(data.config.friendlyRaceMaxParticipants || 12);
        }
      } catch (error) {
        console.error('Error fetching config:', error);
        setMessage({ type: 'error', text: 'Error al cargar la configuración' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (!token) return;

    if (maxParticipants < 1 || maxParticipants > 20) {
      setMessage({ type: 'error', text: 'El límite debe estar entre 1 y 20 participantes' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/system-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          friendlyRaceMaxParticipants: maxParticipants
        })
      });

      // Verificar si la respuesta es OK antes de parsear JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error:', response.status, errorText);
        setMessage({
          type: 'error',
          text: `Error del servidor (${response.status}): ${errorText || 'Error desconocido'}`
        });
        return;
      }

      // Intentar parsear JSON solo si hay contenido
      const text = await response.text();
      if (!text) {
        console.error('❌ Empty response from server');
        setMessage({ type: 'error', text: 'Respuesta vacía del servidor' });
        return;
      }

      const data = JSON.parse(text);

      if (data.success) {
        setMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar' });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage({
        type: 'error',
        text: `Error al guardar: ${error instanceof Error ? error.message : 'Error desconocido'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-2xl text-cyan-400">Cargando...</div>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        {/* Background Effects */}
        <div className="fixed inset-0 z-0">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(147, 51, 234, 0.1) 2px, transparent 2px)',
              backgroundSize: '100px 100px'
            }}
          />
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-400/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto p-8">
          {/* Header */}
          <header className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => router.push('/admin')}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                ← Volver
              </button>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-3xl">🏁</span>
              </div>
              <div>
                <h1 className="font-bold text-4xl md:text-5xl tracking-wider bg-gradient-to-r from-purple-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                  CARRERAS AMISTOSAS
                </h1>
                <p className="text-gray-400 text-lg">Configuración y límites</p>
              </div>
            </div>
          </header>

          {/* Main Config Section */}
          <div className="bg-gradient-to-br from-purple-500/10 via-midnight to-indigo-500/10 border-2 border-purple-500/30 rounded-2xl p-8 mb-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-purple-400 mb-2 flex items-center gap-2">
                <span>⚙️</span> CONFIGURACIÓN GLOBAL
              </h2>
              <p className="text-gray-400 text-sm">
                Configura el máximo de participantes permitidos en carreras amistosas
              </p>
            </div>

            <div className="bg-black/40 border border-purple-500/30 rounded-xl p-6 mb-6">
              <label className="block text-cyan-400 font-bold mb-3">
                MÁXIMO DE PARTICIPANTES
              </label>
              <p className="text-gray-400 text-sm mb-4">
                Este límite se aplicará a todas las nuevas carreras amistosas creadas.
                Úsalo para controlar el número de inscripciones cuando haya karts en mantenimiento.
              </p>

              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 1)}
                  className="w-32 px-4 py-3 bg-midnight/80 border-2 border-purple-500/50 rounded-lg text-white text-xl font-bold text-center focus:border-purple-400 focus:outline-none"
                />
                <div className="flex-1">
                  <div className="text-gray-400 text-sm">
                    Rango válido: <span className="text-cyan-400 font-bold">1-20 participantes</span>
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    Total de karts disponibles en SpeedPark: 20
                  </div>
                </div>
              </div>

              {/* Visual indicator */}
              <div className="mt-6 bg-midnight/60 border border-purple-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Capacidad actual:</span>
                  <span className="text-purple-400 font-bold">{maxParticipants} / 20</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(maxParticipants / 20) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <span className="text-2xl">💡</span>
                <div className="flex-1">
                  <h3 className="text-indigo-400 font-bold mb-2">¿Cuándo cambiar este límite?</h3>
                  <ul className="text-gray-400 text-sm space-y-1">
                    <li>• Cuando haya karts en mantenimiento o fuera de servicio</li>
                    <li>• Para eventos especiales con capacidad limitada</li>
                    <li>• Para ajustar la disponibilidad según demanda</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-8 rounded-lg transition-all duration-300 disabled:cursor-not-allowed"
              >
                {isSaving ? '💾 GUARDANDO...' : '💾 GUARDAR CONFIGURACIÓN'}
              </button>
            </div>

            {/* Message */}
            {message && (
              <div className={`mt-4 p-4 rounded-lg border-2 ${
                message.type === 'success'
                  ? 'bg-green-500/10 border-green-500/50 text-green-400'
                  : 'bg-red-500/10 border-red-500/50 text-red-400'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{message.type === 'success' ? '✅' : '❌'}</span>
                  <span className="font-bold">{message.text}</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-purple-500/10 to-midnight border border-purple-500/30 rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">🎯</div>
              <div className="text-gray-400 text-sm mb-1">Límite Actual</div>
              <div className="text-2xl font-bold text-purple-400">{maxParticipants}</div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500/10 to-midnight border border-indigo-500/30 rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">🏎️</div>
              <div className="text-gray-400 text-sm mb-1">Karts Totales</div>
              <div className="text-2xl font-bold text-indigo-400">20</div>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/10 to-midnight border border-cyan-500/30 rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-gray-400 text-sm mb-1">Disponibilidad</div>
              <div className="text-2xl font-bold text-cyan-400">{Math.round((maxParticipants / 20) * 100)}%</div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-gray-500 text-sm">
            <p>⚡ Cambios aplicarán solo a nuevas carreras creadas después de guardar</p>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
