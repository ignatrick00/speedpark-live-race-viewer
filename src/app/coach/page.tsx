'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';

interface CoachAvailability {
  _id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  individualPrice: number;
  groupPricePerPerson: number;
  maxGroupCapacity: number;
  isActive: boolean;
}

interface TrainingClass {
  _id: string;
  title: string;
  description?: string;
  specialties: string[];
  date: Date;
  startTime: string;
  endTime: string;
  bookingType: string;
  maxGroupCapacity: number;
  individualPrice: number;
  groupPricePerPerson: number;
  individualBooking?: {
    studentName: string;
    bookedAt: Date;
    status: string;
  };
  groupBookings: Array<{
    studentName: string;
    bookedAt: Date;
    status: string;
  }>;
  status: string;
}

const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function CoachPage() {
  const { user, token, isCoach, isLoading } = useAuth();

  // Availability state
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [availabilities, setAvailabilities] = useState<CoachAvailability[]>([]);
  const [loadingAvailabilities, setLoadingAvailabilities] = useState(false);
  const [editingAvailability, setEditingAvailability] = useState<CoachAvailability | null>(null);

  // Classes state
  const [showMyClasses, setShowMyClasses] = useState(false);
  const [myClasses, setMyClasses] = useState<TrainingClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Availability form state
  const [availabilityForm, setAvailabilityForm] = useState({
    dayOfWeek: 1, // Monday by default
    startTime: '14:00',
    endTime: '18:00',
    individualPrice: 45000,
    groupPricePerPerson: 25000,
    maxGroupCapacity: 4,
  });
  const [isCreatingAvailability, setIsCreatingAvailability] = useState(false);

  // Fetch availabilities
  const fetchAvailabilities = async () => {
    if (!token || !user) return;

    setLoadingAvailabilities(true);
    try {
      const response = await fetch(`/api/coach-availability?coachId=${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailabilities(data.availabilities || []);
      }
    } catch (error) {
      console.error('Error fetching availabilities:', error);
    } finally {
      setLoadingAvailabilities(false);
    }
  };

  // Fetch classes
  const fetchMyClasses = async () => {
    if (!token || !user) return;

    setLoadingClasses(true);
    try {
      const response = await fetch(`/api/training-classes?coachId=${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setMyClasses(data.classes || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchAvailabilities();
    }
  }, [user, token]);

  useEffect(() => {
    if (showMyClasses) {
      fetchMyClasses();
    }
  }, [showMyClasses, token, user]);

  // Open modal for creating new availability
  const handleOpenCreateModal = () => {
    setEditingAvailability(null);
    setAvailabilityForm({
      dayOfWeek: 1,
      startTime: '14:00',
      endTime: '18:00',
      individualPrice: 45000,
      groupPricePerPerson: 25000,
      maxGroupCapacity: 4,
    });
    setShowAvailabilityModal(true);
  };

  // Open modal for editing availability
  const handleOpenEditModal = (avail: CoachAvailability) => {
    setEditingAvailability(avail);
    setAvailabilityForm({
      dayOfWeek: avail.dayOfWeek,
      startTime: avail.startTime,
      endTime: avail.endTime,
      individualPrice: avail.individualPrice,
      groupPricePerPerson: avail.groupPricePerPerson,
      maxGroupCapacity: avail.maxGroupCapacity,
    });
    setShowAvailabilityModal(true);
  };

  // Create or update availability
  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsCreatingAvailability(true);
    try {
      const isEditing = !!editingAvailability;
      const url = isEditing
        ? `/api/coach-availability/${editingAvailability._id}`
        : '/api/coach-availability';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(availabilityForm),
      });

      const data = await response.json();

      if (response.ok) {
        alert(isEditing ? '¡Disponibilidad actualizada!' : '¡Disponibilidad creada exitosamente!');
        setShowAvailabilityModal(false);
        setEditingAvailability(null);
        fetchAvailabilities();
        // Reset form
        setAvailabilityForm({
          dayOfWeek: 1,
          startTime: '14:00',
          endTime: '18:00',
          individualPrice: 45000,
          groupPricePerPerson: 25000,
          maxGroupCapacity: 4,
        });
      } else {
        alert(data.error || 'Error al guardar disponibilidad');
      }
    } catch (error) {
      console.error('Error saving availability:', error);
      alert('Error al guardar disponibilidad');
    } finally {
      setIsCreatingAvailability(false);
    }
  };

  // Delete availability
  const handleDeleteAvailability = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta disponibilidad?')) return;

    try {
      const response = await fetch(`/api/coach-availability/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        alert('Disponibilidad eliminada');
        fetchAvailabilities();
      } else {
        const data = await response.json();
        alert(data.error || 'Error al eliminar');
      }
    } catch (error) {
      console.error('Error deleting availability:', error);
      alert('Error al eliminar');
    }
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-midnight via-racing-black to-midnight flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin text-6xl mb-4">🏁</div>
            <p className="text-sky-blue/70">Cargando...</p>
          </div>
        </div>
      </>
    );
  }

  if (!isCoach) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-midnight via-racing-black to-midnight flex items-center justify-center">
          <div className="max-w-md mx-auto text-center p-8">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-racing text-gold mb-4">ACCESO RESTRINGIDO</h1>
            <p className="text-sky-blue/70 mb-6">
              Esta página es solo para usuarios con rol de Coach.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-electric-blue/20 border border-electric-blue/50 text-electric-blue rounded-lg hover:bg-electric-blue/30 transition-all font-racing"
            >
              VOLVER AL INICIO
            </a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-midnight via-racing-black to-midnight p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-5xl">🏎️</span>
              <h1 className="text-4xl md:text-5xl font-racing text-gold">
                PANEL DE COACH
              </h1>
            </div>
            <p className="text-sky-blue/70 text-lg">
              Gestiona tu disponibilidad y clases de karting
            </p>
          </div>

          {/* Main Actions - 2 cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-8">
            {/* Gestionar Disponibilidad */}
            <div className="bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 backdrop-blur-sm border-2 border-gold/50 rounded-xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">📅</span>
                <h2 className="text-3xl font-racing text-gold">
                  MI DISPONIBILIDAD
                </h2>
              </div>
              <p className="text-slate-400 mb-6 text-lg">
                Define los horarios en que puedes dar clases
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="w-full px-6 py-4 bg-gold/20 border-2 border-gold/50 text-gold rounded-lg hover:bg-gold/30 transition-all font-racing text-lg mb-4"
              >
                ➕ AGREGAR HORARIO
              </button>

              {/* List of availabilities */}
              {loadingAvailabilities ? (
                <div className="text-center py-4">
                  <div className="animate-spin text-2xl">⚙️</div>
                </div>
              ) : availabilities.length === 0 ? (
                <p className="text-slate-500 text-sm italic">
                  No has configurado horarios disponibles aún
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availabilities.map((avail) => (
                    <div
                      key={avail._id}
                      className="bg-midnight/50 border border-slate-700/50 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white font-medium">
                          {DAYS_OF_WEEK[avail.dayOfWeek]}
                        </p>
                        <p className="text-sm text-sky-blue/70">
                          {avail.startTime} - {avail.endTime}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEditModal(avail)}
                          className="text-blue-400 hover:text-blue-300 px-2"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteAvailability(avail._id)}
                          className="text-red-400 hover:text-red-300 px-2"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mis Clases */}
            <div className="bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 backdrop-blur-sm border-2 border-electric-blue/50 rounded-xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">📋</span>
                <h2 className="text-3xl font-racing text-electric-blue">
                  MIS CLASES
                </h2>
              </div>
              <p className="text-slate-400 mb-6 text-lg">
                Ver clases reservadas y estudiantes inscritos
              </p>
              <button
                onClick={() => setShowMyClasses(!showMyClasses)}
                className="w-full px-6 py-4 bg-electric-blue/20 border-2 border-electric-blue/50 text-electric-blue rounded-lg hover:bg-electric-blue/30 transition-all font-racing text-lg"
              >
                {showMyClasses ? '▼ OCULTAR' : '📋 VER MIS CLASES'}
              </button>
            </div>
          </div>

          {/* My Classes List */}
          {showMyClasses && (
            <div className="mt-8">
              <div className="bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 backdrop-blur-sm border-2 border-slate-700/50 rounded-xl p-6">
                <h2 className="text-2xl font-racing text-white mb-6">CLASES CON RESERVAS</h2>

                {loadingClasses ? (
                  <div className="text-center py-12">
                    <div className="animate-spin text-4xl mb-2">⚙️</div>
                    <p className="text-sky-blue/70">Cargando clases...</p>
                  </div>
                ) : myClasses.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="text-slate-400 text-lg">No tienes clases reservadas aún</p>
                    <p className="text-slate-500 text-sm mt-2">
                      Las clases aparecerán aquí cuando los estudiantes hagan reservas
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myClasses.map((clase) => (
                      <div
                        key={clase._id}
                        className="bg-midnight/50 border border-slate-700/30 rounded-lg p-6"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-racing text-gold mb-2">{clase.title}</h3>
                            {clase.description && (
                              <p className="text-slate-400 mb-2">{clase.description}</p>
                            )}
                          </div>
                          <span
                            className={`px-4 py-2 rounded-lg text-sm font-racing ${
                              clase.status === 'available'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                : clase.status === 'partially_booked'
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                                : 'bg-red-500/20 text-red-400 border border-red-500/50'
                            }`}
                          >
                            {clase.status === 'available' ? 'Disponible' :
                             clase.status === 'partially_booked' ? 'Parcialmente Reservado' :
                             'Completo'}
                          </span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-slate-500">📅 Fecha</p>
                            <p className="text-white font-digital">
                              {new Date(clase.date).toLocaleDateString('es-CL')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-500">🕐 Horario</p>
                            <p className="text-white font-digital">
                              {clase.startTime} - {clase.endTime}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-500">💵 Precio Individual</p>
                            <p className="text-gold font-digital">
                              ${clase.individualPrice.toLocaleString('es-CL')}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-slate-500">💵 Precio Grupal</p>
                            <p className="text-gold font-digital">
                              ${clase.groupPricePerPerson.toLocaleString('es-CL')} p/p
                            </p>
                          </div>
                        </div>

                        {/* Enrolled Students */}
                        <div className="border-t border-slate-700/30 pt-4">
                          <h4 className="text-sm font-racing text-electric-blue mb-3">
                            ESTUDIANTES INSCRITOS
                          </h4>

                          {clase.individualBooking ? (
                            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                              <p className="text-purple-400 font-medium">
                                👤 Clase Individual: {clase.individualBooking.studentName}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                Reservado: {clase.individualBooking.bookedAt ?
                                  new Date(clase.individualBooking.bookedAt).toLocaleString('es-CL', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : 'Fecha no disponible'}
                              </p>
                            </div>
                          ) : clase.groupBookings.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-sm text-slate-400 mb-2">
                                👥 Clase Grupal: {clase.groupBookings.length}/{clase.maxGroupCapacity} cupos
                              </p>
                              {clase.groupBookings.map((booking, idx) => (
                                <div
                                  key={idx}
                                  className="bg-green-500/10 border border-green-500/30 rounded-lg p-3"
                                >
                                  <p className="text-green-400 font-medium">{booking.studentName}</p>
                                  <p className="text-xs text-slate-500">
                                    Reservado: {booking.bookedAt ?
                                      new Date(booking.bookedAt).toLocaleString('es-CL', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      }) : 'Fecha no disponible'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-slate-500 italic">Sin estudiantes inscritos aún</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Availability Modal */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl bg-gradient-to-br from-midnight via-slate-800 to-midnight border-2 border-gold/50 rounded-xl p-8">
            <button
              onClick={() => setShowAvailabilityModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl"
            >
              ✕
            </button>

            <h2 className="text-3xl font-racing text-gold mb-6">
              {editingAvailability ? 'EDITAR DISPONIBILIDAD' : 'AGREGAR DISPONIBILIDAD'}
            </h2>
            <p className="text-slate-400 mb-6">
              Define un horario recurrente semanal en el que puedes dar clases
            </p>

            <form onSubmit={handleSaveAvailability} className="space-y-6">
              {/* Day of week */}
              <div>
                <label className="block text-electric-blue font-racing mb-2">
                  DÍA DE LA SEMANA *
                </label>
                <select
                  value={availabilityForm.dayOfWeek}
                  onChange={(e) => setAvailabilityForm({ ...availabilityForm, dayOfWeek: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-midnight/50 border-2 border-electric-blue/50 rounded-lg text-white focus:border-electric-blue focus:outline-none"
                  required
                >
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <option key={idx} value={idx}>{day}</option>
                  ))}
                </select>
              </div>

              {/* Time range */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-electric-blue font-racing mb-2">
                    HORA INICIO *
                  </label>
                  <input
                    type="time"
                    value={availabilityForm.startTime}
                    onChange={(e) => setAvailabilityForm({ ...availabilityForm, startTime: e.target.value })}
                    className="w-full px-4 py-3 bg-midnight/50 border-2 border-electric-blue/50 rounded-lg text-white focus:border-electric-blue focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-electric-blue font-racing mb-2">
                    HORA FIN *
                  </label>
                  <input
                    type="time"
                    value={availabilityForm.endTime}
                    onChange={(e) => setAvailabilityForm({ ...availabilityForm, endTime: e.target.value })}
                    className="w-full px-4 py-3 bg-midnight/50 border-2 border-electric-blue/50 rounded-lg text-white focus:border-electric-blue focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Pricing and capacity */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-electric-blue font-racing mb-2">
                    CAPACIDAD GRUPO
                  </label>
                  <input
                    type="number"
                    value={availabilityForm.maxGroupCapacity}
                    onChange={(e) => setAvailabilityForm({ ...availabilityForm, maxGroupCapacity: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-midnight/50 border-2 border-electric-blue/50 rounded-lg text-white focus:border-electric-blue focus:outline-none"
                    min="1"
                    max="10"
                  />
                </div>
                <div>
                  <label className="block text-electric-blue font-racing mb-2">
                    PRECIO INDIVIDUAL
                  </label>
                  <input
                    type="number"
                    value={availabilityForm.individualPrice}
                    onChange={(e) => setAvailabilityForm({ ...availabilityForm, individualPrice: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-midnight/50 border-2 border-electric-blue/50 rounded-lg text-white focus:border-electric-blue focus:outline-none"
                    step="1000"
                  />
                </div>
                <div>
                  <label className="block text-electric-blue font-racing mb-2">
                    PRECIO GRUPAL
                  </label>
                  <input
                    type="number"
                    value={availabilityForm.groupPricePerPerson}
                    onChange={(e) => setAvailabilityForm({ ...availabilityForm, groupPricePerPerson: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-midnight/50 border-2 border-electric-blue/50 rounded-lg text-white focus:border-electric-blue focus:outline-none"
                    step="1000"
                  />
                </div>
              </div>

              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <p className="text-cyan-400 text-sm">
                  ℹ️ Los estudiantes podrán reservar clases automáticamente en este horario.
                  El sistema generará slots de 1 hora dentro del rango horario que definas.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAvailabilityModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-slate-500 text-slate-300 rounded-lg hover:bg-slate-500/10 transition-all font-medium"
                  disabled={isCreatingAvailability}
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 rounded-lg hover:from-yellow-300 hover:to-yellow-400 transition-all font-racing text-lg shadow-lg"
                  disabled={isCreatingAvailability}
                >
                  {isCreatingAvailability ? 'GUARDANDO...' : '✓ GUARDAR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
