'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import OrganizerGuard from '@/components/OrganizerGuard';
import Navbar from '@/components/Navbar';
import DateTimePicker from '@/components/DateTimePicker';
import { EventCategory, EventCategoryConfig } from '@/types/squadron-events';

export default function CrearEventoPage() {
  const router = useRouter();
  const { token } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: EventCategory.OPEN_SERIES,
    eventDate: '',
    duration: 90,
    registrationDeadline: '',
    location: 'SpeedPark',
    maxSquadrons: 20,
    minPilotsPerSquadron: 2,
    maxPilotsPerSquadron: 6,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validar que el cierre de inscripciones sea antes de la fecha del evento
      const eventDate = new Date(formData.eventDate);
      const registrationDeadline = new Date(formData.registrationDeadline);

      if (registrationDeadline >= eventDate) {
        setError('El cierre de inscripciones debe ser ANTES de la fecha del evento');
        setLoading(false);
        return;
      }

      // Extraer la hora del eventDate
      const eventTime = `${String(eventDate.getHours()).padStart(2, '0')}:${String(eventDate.getMinutes()).padStart(2, '0')}`;

      const config = EventCategoryConfig[formData.category as EventCategory];

      // Generar distribución de puntos automáticamente
      const pointsDistribution = generatePointsDistribution(
        config.points,
        formData.maxSquadrons
      );

      const response = await fetch('/api/squadron-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          eventTime, // Extraído del eventDate
          pointsForWinner: config.points,
          pointsDistribution,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirigir y forzar refresh
        router.push('/organizador');
        router.refresh();
      } else {
        setError(data.error || 'Error al crear evento');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      setError('Error de red al crear evento');
    } finally {
      setLoading(false);
    }
  };

  // Generar distribución de puntos basada en el sistema de F1
  const generatePointsDistribution = (maxPoints: number, maxSquadrons: number) => {
    const distribution = [];
    const positions = Math.min(10, maxSquadrons); // Puntos para top 10

    for (let i = 0; i < positions; i++) {
      const points = Math.round(maxPoints * (1 - i * 0.15)); // Decrece 15% por posición
      distribution.push({
        position: i + 1,
        points: Math.max(points, 50), // Mínimo 50 puntos
      });
    }

    return distribution;
  };

  const selectedConfig = EventCategoryConfig[formData.category as EventCategory];

  return (
    <OrganizerGuard>
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        {/* Navbar */}
        <Navbar />

        {/* Background Effects */}
        <div className="fixed inset-0 z-0">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(168, 85, 247, 0.1) 2px, transparent 2px)',
              backgroundSize: '100px 100px'
            }}
          />
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-400/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/organizador')}
              className="text-purple-400 hover:text-purple-300 mb-4 flex items-center gap-2"
            >
              ← Volver
            </button>
            <h1 className="font-bold text-4xl md:text-5xl tracking-wider bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
              CREAR EVENTO
            </h1>
            <p className="text-gray-400">Configura un nuevo evento de escuderías</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category Selection */}
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-6">
              <label className="block text-purple-400 font-bold mb-4">
                Categoría del Evento *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(EventCategoryConfig).map(([key, config]) => (
                  <div
                    key={key}
                    onClick={() => setFormData({ ...formData, category: key as EventCategory })}
                    className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                      formData.category === key
                        ? `bg-gradient-to-br ${config.color}/20 border-purple-400`
                        : 'bg-gray-800/30 border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <h3 className="font-bold text-white mb-1">{config.name}</h3>
                    <p className="text-xs text-gray-400 mb-2">{config.description}</p>
                    <p className="text-sm text-purple-400 font-bold">{config.points} pts ganador</p>
                    {config.requiredRank && (
                      <p className="text-xs text-gray-500">Requisito: Top {config.requiredRank}</p>
                    )}
                    {!config.requiredRank && (
                      <p className="text-xs text-green-400">Sin restricciones</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Category Info */}
              <div className={`mt-4 p-4 rounded-lg bg-gradient-to-r ${selectedConfig.color}/10 border border-white/10`}>
                <p className="text-sm text-white">
                  <strong>Puntos al ganador:</strong> {selectedConfig.points}
                </p>
                <p className="text-sm text-gray-400">
                  <strong>Frecuencia anual:</strong> {selectedConfig.frequencyPerYear} eventos
                </p>
                {selectedConfig.mandatoryForTop && (
                  <p className="text-sm text-orange-400">
                    <strong>Participación obligatoria</strong> para Top {selectedConfig.mandatoryForTop} escuderías
                  </p>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-6 space-y-4">
              <h3 className="text-purple-400 font-bold mb-4">Información Básica</h3>

              <div>
                <label className="block text-gray-400 mb-2">Nombre del Evento *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg focus:border-purple-400 focus:outline-none text-white"
                  placeholder="Ej: Grand Prix Élite - Temporada 2024"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-2">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg focus:border-purple-400 focus:outline-none text-white"
                  rows={3}
                  placeholder="Descripción del evento..."
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-2">Ubicación *</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg focus:border-purple-400 focus:outline-none text-white"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-6 space-y-4">
              <h3 className="text-purple-400 font-bold mb-4">Fechas y Horarios</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DateTimePicker
                  label="Fecha del Evento"
                  value={formData.eventDate}
                  onChange={(value) => setFormData({ ...formData, eventDate: value })}
                  required
                />

                <DateTimePicker
                  label="Cierre de Inscripciones"
                  value={formData.registrationDeadline}
                  onChange={(value) => setFormData({ ...formData, registrationDeadline: value })}
                  required
                  maxDate={formData.eventDate}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 mt-4">
                <div>
                  <label className="block text-gray-400 mb-2">Duración (minutos) *</label>
                  <input
                    type="number"
                    required
                    min="30"
                    max="300"
                    step="15"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg focus:border-purple-400 focus:outline-none text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Duración estimada: {Math.floor(formData.duration / 60)}h {formData.duration % 60}min
                  </p>
                </div>
              </div>
            </div>

            {/* Participants Configuration */}
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-6 space-y-4">
              <h3 className="text-purple-400 font-bold mb-4">Configuración de Participantes</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-400 mb-2">Máximo Escuderías</label>
                  <input
                    type="number"
                    min="2"
                    max="50"
                    value={formData.maxSquadrons}
                    onChange={(e) => setFormData({ ...formData, maxSquadrons: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg focus:border-purple-400 focus:outline-none text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-2">Mín. Pilotos/Escudería</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.minPilotsPerSquadron}
                    onChange={(e) => setFormData({ ...formData, minPilotsPerSquadron: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg focus:border-purple-400 focus:outline-none text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-2">Máx. Pilotos/Escudería</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.maxPilotsPerSquadron}
                    onChange={(e) => setFormData({ ...formData, maxPilotsPerSquadron: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg focus:border-purple-400 focus:outline-none text-white"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.push('/organizador')}
                className="flex-1 px-6 py-3 bg-gray-800 text-gray-300 rounded-xl font-bold hover:bg-gray-700 transition-all"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Creando...' : 'Crear Evento'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </OrganizerGuard>
  );
}
