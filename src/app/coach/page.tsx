'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';

interface CoachAvailability {
  _id: string;
  availabilityType: 'recurring' | 'specific';
  dayOfWeek?: number;
  specificDate?: string;
  startTime: string;
  endTime: string;
  blockDurationMinutes: number;
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
    whatsappNumber: string;
    bookedAt: Date;
    status: string;
  };
  groupBookings: Array<{
    studentName: string;
    whatsappNumber: string;
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

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Availability form state
  const [availabilityForm, setAvailabilityForm] = useState({
    availabilityType: 'recurring' as 'recurring' | 'specific',
    dayOfWeek: 1, // Monday by default
    specificDate: '',
    startTime: '14:00',
    endTime: '18:00',
    blockDurationMinutes: 45,
    individualPrice: 45000,
    groupPricePerPerson: 25000,
    maxGroupCapacity: 4,
  });
  const [isCreatingAvailability, setIsCreatingAvailability] = useState(false);

  // Notification modal state
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');

  // Confirm modal state
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  // Fetch availabilities
  const fetchAvailabilities = async () => {
    if (!token || !user) return;

    setLoadingAvailabilities(true);
    try {
      console.log('🔄 Fetching availabilities...');
      const response = await fetch(`/api/coach-availability?coachId=${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📦 Received availabilities:', data.availabilities);
        setAvailabilities(data.availabilities || []);
      }
    } catch (error) {
      console.error('Error fetching availabilities:', error);
    } finally {
      setLoadingAvailabilities(false);
    }
  };

  // Fetch classes
  // Fetch notifications
  const fetchNotifications = async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/notifications?unreadOnly=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Mark notification as read and dismiss
  const dismissNotification = async (notificationId: string) => {
    if (!token) return;

    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Add to dismissed set and remove from list
      setDismissedNotifications(prev => new Set(prev).add(notificationId));
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const fetchMyClasses = async () => {
    if (!token || !user) return;

    setLoadingClasses(true);
    try {
      // Get today's date and 30 days from now
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 30);

      const startDateStr = today.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const response = await fetch(
        `/api/training-classes?coachId=${user.id}&startDate=${startDateStr}&endDate=${endDateStr}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

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
      fetchNotifications();
    }
  }, [user, token]);

  useEffect(() => {
    if (showMyClasses) {
      fetchMyClasses();
    }
  }, [showMyClasses, token, user]);

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getClassesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return myClasses.filter(clase => {
      const claseDate = new Date(clase.date).toISOString().split('T')[0];
      return claseDate === dateStr;
    });
  };

  const hasClassesOnDate = (date: Date) => {
    return getClassesForDate(date).length > 0;
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const filteredClasses = selectedDate
    ? getClassesForDate(selectedDate)
    : myClasses;

  // Open modal for creating new availability
  const handleOpenCreateModal = () => {
    setEditingAvailability(null);
    setAvailabilityForm({
      availabilityType: 'recurring',
      dayOfWeek: 1,
      specificDate: '',
      startTime: '14:00',
      endTime: '18:00',
      blockDurationMinutes: 45,
      individualPrice: 45000,
      groupPricePerPerson: 25000,
      maxGroupCapacity: 4,
    });
    setShowAvailabilityModal(true);
  };

  // Open modal for editing availability
  const handleOpenEditModal = (avail: CoachAvailability) => {
    console.log('📝 Opening edit modal for availability:', avail);
    console.log('📊 Current blockDurationMinutes:', avail.blockDurationMinutes);
    setEditingAvailability(avail);
    setAvailabilityForm({
      availabilityType: avail.availabilityType || 'recurring',
      dayOfWeek: avail.dayOfWeek || 1,
      specificDate: avail.specificDate ? new Date(avail.specificDate).toISOString().split('T')[0] : '',
      startTime: avail.startTime,
      endTime: avail.endTime,
      blockDurationMinutes: avail.blockDurationMinutes || 45,
      individualPrice: avail.individualPrice,
      groupPricePerPerson: avail.groupPricePerPerson,
      maxGroupCapacity: avail.maxGroupCapacity,
    });
    setShowAvailabilityModal(true);
  };

  // Create or update availability
  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🔍 Saving availability with form:', availabilityForm);

    // Prepare data: remove unused fields based on type
    const dataToSend: any = { ...availabilityForm };
    if (availabilityForm.availabilityType === 'recurring') {
      delete dataToSend.specificDate;
    } else if (availabilityForm.availabilityType === 'specific') {
      delete dataToSend.dayOfWeek;
    }

    console.log('📤 Sending to server:', dataToSend);

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
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();
      console.log('📬 Server response:', data);

      if (response.ok) {
        console.log('✅ Save successful, refreshing availabilities...');
        setNotificationMessage(isEditing ? '¡Disponibilidad actualizada!' : '¡Disponibilidad creada exitosamente!');
        setNotificationType('success');
        setShowNotification(true);
        setShowAvailabilityModal(false);
        setEditingAvailability(null);
        fetchAvailabilities();
        // Reset form
        setAvailabilityForm({
          availabilityType: 'recurring',
          dayOfWeek: 1,
          specificDate: '',
          startTime: '14:00',
          endTime: '18:00',
          blockDurationMinutes: 45,
          individualPrice: 45000,
          groupPricePerPerson: 25000,
          maxGroupCapacity: 4,
        });
      } else {
        setNotificationMessage(data.error || 'Error al guardar disponibilidad');
        setNotificationType('error');
        setShowNotification(true);
      }
    } catch (error) {
      console.error('Error saving availability:', error);
      setNotificationMessage('Error al guardar disponibilidad');
      setNotificationType('error');
      setShowNotification(true);
    } finally {
      setIsCreatingAvailability(false);
    }
  };

  // Delete availability
  const handleDeleteAvailability = async (id: string) => {
    setConfirmMessage('¿Estás seguro de eliminar esta disponibilidad?');
    setConfirmAction(() => async () => {
      try {
        const response = await fetch(`/api/coach-availability/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          setNotificationMessage('Disponibilidad eliminada');
          setNotificationType('success');
          setShowNotification(true);
          fetchAvailabilities();
        } else {
          const data = await response.json();
          setNotificationMessage(data.error || 'Error al eliminar');
          setNotificationType('error');
          setShowNotification(true);
        }
      } catch (error) {
        console.error('Error deleting availability:', error);
        setNotificationMessage('Error al eliminar');
        setNotificationType('error');
        setShowNotification(true);
      }
    });
    setShowConfirm(true);
  };

  // Delete training class
  const handleDeleteClass = async (date: Date | string, startTime: string, endTime: string) => {
    setConfirmMessage('¿Estás seguro de eliminar esta clase? Se eliminará el bloque completo.');
    setConfirmAction(() => async () => {
      try {
        // Handle both Date object and string
        const dateString = typeof date === 'string'
          ? date.split('T')[0]  // If already string, just get the date part
          : date.toISOString().split('T')[0];  // If Date object, convert to string

        const response = await fetch('/api/training-classes', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            date: dateString,
            startTime,
            endTime
          })
        });

        if (response.ok) {
          setNotificationMessage('Clase eliminada exitosamente');
          setNotificationType('success');
          setShowNotification(true);
          fetchMyClasses();
        } else {
          const data = await response.json();
          setNotificationMessage(data.error || 'Error al eliminar clase');
          setNotificationType('error');
          setShowNotification(true);
        }
      } catch (error) {
        console.error('Error deleting class:', error);
        setNotificationMessage('Error al eliminar clase');
        setNotificationType('error');
        setShowNotification(true);
      }
    });
    setShowConfirm(true);
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
                          {avail.availabilityType === 'specific' && avail.specificDate
                            ? new Date(avail.specificDate).toLocaleDateString('es-CL', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })
                            : DAYS_OF_WEEK[avail.dayOfWeek || 0]}
                        </p>
                        <p className="text-sm text-sky-blue/70">
                          {avail.startTime} - {avail.endTime}
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-orange-400">
                            ⏱️ Bloques de {avail.blockDurationMinutes || 45} minutos
                          </p>
                          {avail.availabilityType === 'specific' && (
                            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                              Día específico
                            </span>
                          )}
                        </div>
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

          {/* Calendar View */}
          {showMyClasses && (
            <div className="mt-6">
              <div className="bg-gradient-to-br from-midnight via-racing-black to-midnight border border-electric-blue/50 rounded-lg p-4 max-w-md mx-auto">
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={previousMonth}
                    className="px-2 py-1 bg-electric-blue/20 border border-electric-blue/50 text-electric-blue rounded hover:bg-electric-blue/30 transition-all text-sm"
                  >
                    ◀
                  </button>
                  <h3 className="text-lg font-racing text-electric-blue">
                    {currentMonth.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' }).toUpperCase()}
                  </h3>
                  <button
                    onClick={nextMonth}
                    className="px-2 py-1 bg-electric-blue/20 border border-electric-blue/50 text-electric-blue rounded hover:bg-electric-blue/30 transition-all text-sm"
                  >
                    ▶
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Day headers */}
                  {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, idx) => (
                    <div key={idx} className="text-center text-sky-blue/70 font-racing text-xs py-1">
                      {day}
                    </div>
                  ))}

                  {/* Calendar days */}
                  {(() => {
                    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
                    const days = [];

                    // Empty cells for days before month starts
                    for (let i = 0; i < startingDayOfWeek; i++) {
                      days.push(
                        <div key={`empty-${i}`} className="aspect-square"></div>
                      );
                    }

                    // Actual days of the month
                    for (let day = 1; day <= daysInMonth; day++) {
                      const date = new Date(year, month, day);
                      const hasClasses = hasClassesOnDate(date);
                      const isSelected = selectedDate &&
                        selectedDate.toISOString().split('T')[0] === date.toISOString().split('T')[0];
                      const isToday = new Date().toISOString().split('T')[0] === date.toISOString().split('T')[0];

                      days.push(
                        <button
                          key={day}
                          onClick={() => handleDateClick(date)}
                          className={`
                            aspect-square rounded relative transition-all text-xs
                            ${isSelected
                              ? 'bg-electric-blue text-racing-black font-bold ring-1 ring-electric-blue'
                              : hasClasses
                              ? 'bg-gold/20 text-gold border border-gold/50 hover:bg-gold/30'
                              : 'bg-slate-800/30 text-slate-400 hover:bg-slate-700/50'
                            }
                            ${isToday && !isSelected ? 'ring-1 ring-sky-blue' : ''}
                          `}
                        >
                          <span>{day}</span>
                          {hasClasses && (
                            <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2">
                              <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-racing-black' : 'bg-gold'}`}></div>
                            </div>
                          )}
                        </button>
                      );
                    }

                    return days;
                  })()}
                </div>

                {/* Selected date info */}
                {selectedDate && (
                  <div className="mt-3 p-2 bg-electric-blue/10 border border-electric-blue/30 rounded">
                    <div className="flex items-center justify-between text-sm">
                      <p className="text-sky-blue font-digital">
                        📅 {selectedDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                      </p>
                      <button
                        onClick={() => setSelectedDate(null)}
                        className="px-2 py-0.5 text-xs bg-slate-700/50 text-slate-300 rounded hover:bg-slate-600/50 transition-all"
                      >
                        Ver todas
                      </button>
                    </div>
                    <p className="text-gold text-xs mt-1">
                      {getClassesForDate(selectedDate).length} clase(s)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* My Classes List */}
          {showMyClasses && (
            <div className="mt-8">
              <div className="bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 backdrop-blur-sm border-2 border-slate-700/50 rounded-xl p-6">
                <h2 className="text-2xl font-racing text-white mb-6">
                  {selectedDate
                    ? `CLASES - ${selectedDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }).toUpperCase()}`
                    : 'CLASES CON RESERVAS'
                  }
                </h2>

                {/* Notifications Banner */}
                {notifications.filter(n => !dismissedNotifications.has(n._id)).length > 0 && (
                  <div className="mb-6 space-y-3">
                    {notifications
                      .filter(n => !dismissedNotifications.has(n._id))
                      .map((notification) => (
                        <div
                          key={notification._id}
                          className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 flex items-start gap-4"
                        >
                          <div className="text-3xl">📢</div>
                          <div className="flex-1">
                            <h3 className="text-cyan-400 font-bold text-lg mb-1">
                              {notification.title}
                            </h3>
                            <p className="text-slate-300">
                              {notification.message}
                            </p>
                            <p className="text-xs text-slate-500 mt-2">
                              {new Date(notification.createdAt).toLocaleString('es-CL', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <button
                            onClick={() => dismissNotification(notification._id)}
                            className="text-slate-400 hover:text-cyan-400 transition-colors text-2xl"
                            title="Marcar como leída"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                  </div>
                )}

                {loadingClasses ? (
                  <div className="text-center py-12">
                    <div className="animate-spin text-4xl mb-2">⚙️</div>
                    <p className="text-sky-blue/70">Cargando clases...</p>
                  </div>
                ) : filteredClasses.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="text-slate-400 text-lg">
                      {selectedDate
                        ? 'No hay clases programadas para esta fecha'
                        : 'No tienes clases reservadas aún'
                      }
                    </p>
                    <p className="text-slate-500 text-sm mt-2">
                      {selectedDate
                        ? 'Selecciona otra fecha en el calendario o ver todas las clases'
                        : 'Las clases aparecerán aquí cuando los estudiantes hagan reservas'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredClasses.map((clase) => (
                      <div
                        key={clase._id}
                        className="bg-midnight/50 border border-slate-700/30 rounded-lg p-6"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-racing text-gold mb-2">{clase.title}</h3>
                            {clase.description && (
                              <p className="text-slate-400 mb-2">{clase.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
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
                            <button
                              onClick={() => handleDeleteClass(clase.date, clase.startTime, clase.endTime)}
                              className="px-3 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-all text-sm font-racing"
                              title="Eliminar clase"
                            >
                              🗑️
                            </button>
                          </div>
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
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="text-purple-400 font-medium">
                                    👤 Clase Individual: {clase.individualBooking.studentName}
                                  </p>
                                  <p className="text-sm text-electric-blue mt-2">
                                    📱 WhatsApp: {clase.individualBooking.whatsappNumber || 'No disponible'}
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
                                {clase.individualBooking.whatsappNumber && (
                                  <a
                                    href={`https://wa.me/${clase.individualBooking.whatsappNumber.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-3 px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-500/30 transition-all font-racing text-sm flex items-center gap-2"
                                  >
                                    💬 WhatsApp
                                  </a>
                                )}
                              </div>
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
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <p className="text-green-400 font-medium">{booking.studentName}</p>
                                      <p className="text-sm text-electric-blue mt-1">
                                        📱 WhatsApp: {booking.whatsappNumber || 'No disponible'}
                                      </p>
                                      <p className="text-xs text-slate-500 mt-1">
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
                                    {booking.whatsappNumber && (
                                      <a
                                        href={`https://wa.me/${booking.whatsappNumber.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-3 px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-500/30 transition-all font-racing text-sm flex items-center gap-2"
                                      >
                                        💬 WhatsApp
                                      </a>
                                    )}
                                  </div>
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
              {availabilityForm.availabilityType === 'recurring'
                ? 'Define un horario recurrente semanal en el que puedes dar clases'
                : 'Define un horario para un día específico'}
            </p>

            <form onSubmit={handleSaveAvailability} className="space-y-6">
              {/* Availability Type Selector */}
              <div>
                <label className="block text-gold font-racing mb-3">
                  TIPO DE DISPONIBILIDAD *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setAvailabilityForm({ ...availabilityForm, availabilityType: 'recurring' })}
                    className={`px-4 py-3 rounded-lg border-2 font-racing transition-all ${
                      availabilityForm.availabilityType === 'recurring'
                        ? 'bg-electric-blue/20 border-electric-blue text-electric-blue'
                        : 'bg-midnight/30 border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    📅 RECURRENTE
                    <p className="text-xs font-normal mt-1">Todos los {DAYS_OF_WEEK[availabilityForm.dayOfWeek]?.toLowerCase() || 'lunes'}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvailabilityForm({ ...availabilityForm, availabilityType: 'specific' })}
                    className={`px-4 py-3 rounded-lg border-2 font-racing transition-all ${
                      availabilityForm.availabilityType === 'specific'
                        ? 'bg-electric-blue/20 border-electric-blue text-electric-blue'
                        : 'bg-midnight/30 border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    📆 DÍA ESPECÍFICO
                    <p className="text-xs font-normal mt-1">Solo una fecha</p>
                  </button>
                </div>
              </div>

              {/* Day of week OR Specific date */}
              {availabilityForm.availabilityType === 'recurring' ? (
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
              ) : (
                <div>
                  <label className="block text-electric-blue font-racing mb-2">
                    FECHA ESPECÍFICA *
                  </label>
                  <input
                    type="date"
                    value={availabilityForm.specificDate}
                    onChange={(e) => setAvailabilityForm({ ...availabilityForm, specificDate: e.target.value })}
                    className="w-full px-4 py-3 bg-midnight/50 border-2 border-electric-blue/50 rounded-lg text-white focus:border-electric-blue focus:outline-none"
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-sky-blue/50 text-sm mt-1">
                    Esta disponibilidad solo estará activa para la fecha seleccionada
                  </p>
                </div>
              )}

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

              {/* Block duration */}
              <div>
                <label className="block text-electric-blue font-racing mb-2">
                  DURACIÓN DEL BLOQUE *
                </label>
                <select
                  value={availabilityForm.blockDurationMinutes}
                  onChange={(e) => setAvailabilityForm({ ...availabilityForm, blockDurationMinutes: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-midnight/50 border-2 border-electric-blue/50 rounded-lg text-white focus:border-electric-blue focus:outline-none"
                  required
                >
                  <option value={45}>45 minutos</option>
                  <option value={15}>15 minutos</option>
                  <option value={20}>20 minutos</option>
                  <option value={30}>30 minutos</option>
                  <option value={60}>60 minutos (1 hora)</option>
                  <option value={90}>90 minutos (1.5 horas)</option>
                  <option value={120}>120 minutos (2 horas)</option>
                </select>
                <p className="text-sky-blue/50 text-sm mt-1">
                  Los estudiantes podrán reservar bloques de esta duración dentro del horario.
                </p>
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

      {/* Notification Modal */}
      {showNotification && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-midnight via-racing-black to-midnight border-2 border-electric-blue/50 rounded-lg p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              {notificationType === 'success' ? (
                <div className="text-6xl mb-4">✅</div>
              ) : (
                <div className="text-6xl mb-4">❌</div>
              )}
              <h3 className={`text-2xl font-racing mb-4 ${notificationType === 'success' ? 'text-electric-blue' : 'text-red-400'}`}>
                {notificationType === 'success' ? 'ÉXITO' : 'ERROR'}
              </h3>
              <p className="text-sky-blue/90 mb-6">{notificationMessage}</p>
              <button
                onClick={() => setShowNotification(false)}
                className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 rounded-lg hover:from-yellow-300 hover:to-yellow-400 transition-all font-racing text-lg shadow-lg"
              >
                CERRAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-midnight via-racing-black to-midnight border-2 border-electric-blue/50 rounded-lg p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-2xl font-racing text-electric-blue mb-4">CONFIRMACIÓN</h3>
              <p className="text-sky-blue/90 mb-6">{confirmMessage}</p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    setConfirmAction(null);
                  }}
                  className="flex-1 px-6 py-3 border-2 border-slate-500 text-slate-300 rounded-lg hover:bg-slate-500/10 transition-all font-medium"
                >
                  CANCELAR
                </button>
                <button
                  onClick={() => {
                    if (confirmAction) confirmAction();
                    setShowConfirm(false);
                    setConfirmAction(null);
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-400 hover:to-red-500 transition-all font-racing shadow-lg"
                >
                  ELIMINAR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
