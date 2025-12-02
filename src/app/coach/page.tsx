'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';

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

export default function CoachPage() {
  const { user, token, isCoach, isLoading } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMyClasses, setShowMyClasses] = useState(false);
  const [myClasses, setMyClasses] = useState<TrainingClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    specialties: [] as string[],
    date: '',
    startTime: '14:00',
    endTime: '15:00',
    maxGroupCapacity: 4,
    individualPrice: 45000,
    groupPricePerPerson: 25000,
  });
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);

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
    if (showMyClasses) {
      fetchMyClasses();
    }
  }, [showMyClasses, token, user]);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.date || !formData.startTime || !formData.endTime) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/training-classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert('¡Clase creada exitosamente!');
        setShowCreateModal(false);
        // Reset form
        setFormData({
          title: '',
          description: '',
          specialties: [],
          date: '',
          startTime: '14:00',
          endTime: '15:00',
          maxGroupCapacity: 4,
          individualPrice: 45000,
          groupPricePerPerson: 25000,
        });
        setSpecialtyInput('');
      } else {
        alert(data.error || 'Error al crear la clase');
      }
    } catch (error) {
      console.error('Error creating class:', error);
      alert('Error al crear la clase');
    } finally {
      setIsCreating(false);
    }
  };

  const addSpecialty = () => {
    if (specialtyInput.trim() && !formData.specialties.includes(specialtyInput.trim())) {
      setFormData({
        ...formData,
        specialties: [...formData.specialties, specialtyInput.trim()],
      });
      setSpecialtyInput('');
    }
  };

  const removeSpecialty = (specialty: string) => {
    setFormData({
      ...formData,
      specialties: formData.specialties.filter(s => s !== specialty),
    });
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
              Gestiona tus clases de karting
            </p>
          </div>

          {/* Main Actions - Only 2 cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Crear Clase */}
            <div className="bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 backdrop-blur-sm border-2 border-gold/50 rounded-xl p-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">➕</span>
                <h2 className="text-3xl font-racing text-gold">
                  CREAR CLASE
                </h2>
              </div>
              <p className="text-slate-400 mb-6 text-lg">
                Programa una nueva sesión de entrenamiento
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full px-6 py-4 bg-gold/20 border-2 border-gold/50 text-gold rounded-lg hover:bg-gold/30 transition-all font-racing text-lg"
              >
                ➕ NUEVA CLASE
              </button>
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
                Ver clases creadas y estudiantes inscritos
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
                <h2 className="text-2xl font-racing text-white mb-6">MIS CLASES PROGRAMADAS</h2>

                {loadingClasses ? (
                  <div className="text-center py-12">
                    <div className="animate-spin text-4xl mb-2">⚙️</div>
                    <p className="text-sky-blue/70">Cargando clases...</p>
                  </div>
                ) : myClasses.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="text-slate-400 text-lg">No has creado ninguna clase aún</p>
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
                            <div className="flex flex-wrap gap-2 mb-3">
                              {clase.specialties.map((specialty) => (
                                <span
                                  key={specialty}
                                  className="px-3 py-1 bg-cyan-400/20 text-cyan-400 rounded-full text-sm border border-cyan-400/30"
                                >
                                  {specialty}
                                </span>
                              ))}
                            </div>
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

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl bg-gradient-to-br from-midnight via-slate-800 to-midnight border-2 border-gold/50 rounded-xl p-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl"
            >
              ✕
            </button>

            <h2 className="text-3xl font-racing text-gold mb-6">CREAR NUEVA CLASE</h2>

            <form onSubmit={handleCreateClass} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-electric-blue font-racing mb-2">
                  TÍTULO DE LA CLASE *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-midnight/50 border-2 border-electric-blue/50 rounded-lg text-white focus:border-electric-blue focus:outline-none"
                  placeholder="Ej: Técnica de Frenado Avanzado"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-electric-blue font-racing mb-2">
                  DESCRIPCIÓN
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-midnight/50 border-2 border-electric-blue/50 rounded-lg text-white focus:border-electric-blue focus:outline-none"
                  placeholder="Descripción de la clase..."
                  rows={3}
                />
              </div>

              {/* Specialties */}
              <div>
                <label className="block text-electric-blue font-racing mb-2">
                  ESPECIALIDADES
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={specialtyInput}
                    onChange={(e) => setSpecialtyInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialty())}
                    className="flex-1 px-4 py-2 bg-midnight/50 border-2 border-electric-blue/50 rounded-lg text-white focus:border-electric-blue focus:outline-none"
                    placeholder="Ej: Principiantes"
                  />
                  <button
                    type="button"
                    onClick={addSpecialty}
                    className="px-4 py-2 bg-cyan-400/20 border border-cyan-400/50 text-cyan-400 rounded-lg hover:bg-cyan-400/30"
                  >
                    + Agregar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="px-3 py-1 bg-cyan-400/20 text-cyan-400 rounded-full text-sm border border-cyan-400/30 flex items-center gap-2"
                    >
                      {specialty}
                      <button
                        type="button"
                        onClick={() => removeSpecialty(specialty)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Date and Time */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-electric-blue font-racing mb-2">
                    FECHA *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 bg-midnight/50 border-2 border-electric-blue/50 rounded-lg text-white focus:border-electric-blue focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-electric-blue font-racing mb-2">
                    HORA INICIO *
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
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
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-4 py-3 bg-midnight/50 border-2 border-electric-blue/50 rounded-lg text-white focus:border-electric-blue focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Capacity and Pricing */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-electric-blue font-racing mb-2">
                    CAPACIDAD GRUPO
                  </label>
                  <input
                    type="number"
                    value={formData.maxGroupCapacity}
                    onChange={(e) => setFormData({ ...formData, maxGroupCapacity: parseInt(e.target.value) })}
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
                    value={formData.individualPrice}
                    onChange={(e) => setFormData({ ...formData, individualPrice: parseInt(e.target.value) })}
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
                    value={formData.groupPricePerPerson}
                    onChange={(e) => setFormData({ ...formData, groupPricePerPerson: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-midnight/50 border-2 border-electric-blue/50 rounded-lg text-white focus:border-electric-blue focus:outline-none"
                    step="1000"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-slate-500 text-slate-400 rounded-lg hover:bg-slate-500/10 transition-all"
                  disabled={isCreating}
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gold text-midnight rounded-lg hover:bg-gold/90 transition-all font-racing text-lg"
                  disabled={isCreating}
                >
                  {isCreating ? 'CREANDO...' : '✓ CREAR CLASE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
