'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Navbar from '@/components/Navbar'

interface Instructor {
  id: string
  name: string
  specialties: string[]
  photo?: string
  rating: number
  experience: string
}

interface ClaseBloque {
  id: string
  instructorId: string
  instructor: string
  date: string
  startTime: string
  endTime: string
  individualBooking?: {
    isBooked: boolean
    studentName?: string
  }
  groupBookings: Array<{
    studentName: string
    bookedAt: Date
  }>
  maxGroupCapacity: number
  individualPrice: number
  groupPricePerPerson: number
  availabilityId?: string
  status?: string
}

export default function ClasesPage() {
  const { token } = useAuth()
  const [searchMode, setSearchMode] = useState<'instructor' | 'day'>('instructor')
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedBloque, setSelectedBloque] = useState<ClaseBloque | null>(null)
  const [reservationMode, setReservationMode] = useState<'individual' | 'group'>('individual')
  const [bloqueReservationModes, setBloqueReservationModes] = useState<Record<string, 'individual' | 'group'>>({})

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null)

  // Real data from API
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [bloques, setBloques] = useState<ClaseBloque[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingInProgress, setBookingInProgress] = useState<string | null>(null)

  // Notification modal state
  const [showNotification, setShowNotification] = useState(false)
  const [notificationMessage, setNotificationMessage] = useState('')
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success')

  // Invitation modal state
  const [showInvitationModal, setShowInvitationModal] = useState(false)
  const [selectedClassForInvite, setSelectedClassForInvite] = useState<ClaseBloque | null>(null)
  const [inviteeEmail, setInviteeEmail] = useState('')
  const [sendingInvitation, setSendingInvitation] = useState(false)

  // Fetch available slots from API
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/available-slots')
        if (response.ok) {
          const data = await response.json()

          // Transform API data to match existing format
          const transformedBloques: ClaseBloque[] = data.slots.map((slot: any) => {
            return {
              id: slot.existingClassId || `slot-${slot.date}-${slot.startTime}`,
              instructorId: typeof slot.coachId === 'string' ? slot.coachId : slot.coachId,
              instructor: slot.coachName,
              date: slot.date,
              startTime: slot.startTime,
              endTime: slot.endTime,
              individualBooking: slot.individualBooking ? {
                isBooked: true,
                studentName: slot.individualBooking.studentName
              } : undefined,
              groupBookings: slot.groupBookings?.map((booking: any) => ({
                studentName: booking.studentName,
                bookedAt: new Date(booking.bookedAt)
              })) || [],
              maxGroupCapacity: slot.maxGroupCapacity,
              individualPrice: slot.individualPrice,
              groupPricePerPerson: slot.groupPricePerPerson,
              availabilityId: slot.availabilityId,
              status: slot.status
            }
          })

          setBloques(transformedBloques)

          // Extract unique instructors from slots
          const uniqueInstructors = new Map<string, Instructor>()
          data.slots.forEach((slot: any) => {
            const coachId = typeof slot.coachId === 'string' ? slot.coachId : slot.coachId
            if (!uniqueInstructors.has(coachId)) {
              uniqueInstructors.set(coachId, {
                id: coachId,
                name: slot.coachName,
                specialties: [],
                rating: 4.9,
                experience: 'Coach certificado'
              })
            }
          })

          setInstructors(Array.from(uniqueInstructors.values()))
        }
      } catch (error) {
        console.error('Error fetching classes:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchClasses()
  }, [])

  const handleBookClass = async (bloqueId: string, bookingType: 'individual' | 'group') => {
    if (!token) {
      setNotificationMessage('Debes iniciar sesión para reservar una clase')
      setNotificationType('error')
      setShowNotification(true)
      return
    }

    // Find the bloque to get the necessary information
    const bloque = bloques.find(b => b.id === bloqueId)
    if (!bloque) {
      setNotificationMessage('Bloque no encontrado')
      setNotificationType('error')
      setShowNotification(true)
      return
    }

    setBookingInProgress(bloqueId)
    try {
      const response = await fetch('/api/book-slot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          availabilityId: bloque.availabilityId,
          date: bloque.date,
          startTime: bloque.startTime,
          endTime: bloque.endTime,
          bookingType
        })
      })

      const data = await response.json()

      if (response.ok) {
        setNotificationMessage(`¡Reserva exitosa! Precio: $${data.price.toLocaleString('es-CL')}`)
        setNotificationType('success')
        setShowNotification(true)
        // Refresh slots to show updated bookings
        const slotsResponse = await fetch('/api/available-slots')
        if (slotsResponse.ok) {
          const slotsData = await slotsResponse.json()
          const transformedBloques: ClaseBloque[] = slotsData.slots.map((slot: any) => ({
            id: slot.existingClassId || `slot-${slot.date}-${slot.startTime}`,
            instructorId: typeof slot.coachId === 'string' ? slot.coachId : slot.coachId,
            instructor: slot.coachName,
            date: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            individualBooking: slot.individualBooking ? {
              isBooked: true,
              studentName: slot.individualBooking.studentName
            } : undefined,
            groupBookings: slot.groupBookings?.map((booking: any) => ({
              studentName: booking.studentName,
              bookedAt: new Date(booking.bookedAt)
            })) || [],
            maxGroupCapacity: slot.maxGroupCapacity,
            individualPrice: slot.individualPrice,
            groupPricePerPerson: slot.groupPricePerPerson,
            availabilityId: slot.availabilityId,
            status: slot.status
          }))
          setBloques(transformedBloques)
        }
      } else {
        setNotificationMessage(data.error || 'Error al hacer la reserva')
        setNotificationType('error')
        setShowNotification(true)
      }
    } catch (error) {
      console.error('Error booking class:', error)
      setNotificationMessage('Error al hacer la reserva')
      setNotificationType('error')
      setShowNotification(true)
    } finally {
      setBookingInProgress(null)
    }
  }

  const handleSendInvitation = async () => {
    if (!token) {
      setNotificationMessage('Debes iniciar sesión para enviar invitaciones')
      setNotificationType('error')
      setShowNotification(true)
      return
    }

    if (!inviteeEmail) {
      setNotificationMessage('Por favor ingresa un email')
      setNotificationType('error')
      setShowNotification(true)
      return
    }

    if (!selectedClassForInvite) {
      return
    }

    setSendingInvitation(true)
    try {
      const response = await fetch('/api/group-invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          classId: selectedClassForInvite.id,
          inviteeEmail
        })
      })

      const data = await response.json()

      if (response.ok) {
        setNotificationMessage(`¡Invitación enviada a ${inviteeEmail}!`)
        setNotificationType('success')
        setShowNotification(true)
        setShowInvitationModal(false)
        setInviteeEmail('')
        setSelectedClassForInvite(null)
      } else {
        setNotificationMessage(data.error || 'Error al enviar invitación')
        setNotificationType('error')
        setShowNotification(true)
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
      setNotificationMessage('Error al enviar invitación')
      setNotificationType('error')
      setShowNotification(true)
    } finally {
      setSendingInvitation(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price)
  }

  const getAvailableDates = () => {
    const dates = []
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
    }
    return dates
  }

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    return firstDay === 0 ? 6 : firstDay - 1 // Convert Sunday (0) to 6, Monday becomes 0
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth)
    if (direction === 'prev') {
      newMonth.setMonth(currentMonth.getMonth() - 1)
    } else {
      newMonth.setMonth(currentMonth.getMonth() + 1)
    }
    setCurrentMonth(newMonth)
  }

  const selectCalendarDate = (day: number) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Only allow future dates
    if (selectedDate >= today) {
      setSelectedCalendarDate(selectedDate)
      // Fix timezone offset issue by using local date formatting
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const dayStr = String(selectedDate.getDate()).padStart(2, '0')
      setSelectedDate(`${year}-${month}-${dayStr}`)
    }
  }

  const isDateAvailable = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date >= today
  }

  const isDateSelected = (day: number) => {
    if (!selectedCalendarDate) return false
    return selectedCalendarDate.getDate() === day && 
           selectedCalendarDate.getMonth() === currentMonth.getMonth() &&
           selectedCalendarDate.getFullYear() === currentMonth.getFullYear()
  }

  const getBloquesByInstructor = (instructorId: string) => {
    return bloques.filter(bloque => bloque.instructorId === instructorId)
  }

  const getBloquesByDate = (date: string) => {
    return bloques.filter(bloque => bloque.date === date)
  }

  const isSlotAvailable = (bloque: ClaseBloque, mode: 'individual' | 'group') => {
    if (mode === 'individual') {
      // Individual: disponible si no hay reserva individual Y no hay reservas grupales
      const hasIndividualBooking = bloque.individualBooking?.isBooked === true
      const hasGroupBookings = bloque.groupBookings.length > 0
      return !hasIndividualBooking && !hasGroupBookings
    } else {
      // Grupal: disponible si no hay reserva individual Y hay espacio en el grupo
      const hasIndividualBooking = bloque.individualBooking?.isBooked === true
      const hasSpace = bloque.groupBookings.length < bloque.maxGroupCapacity
      return !hasIndividualBooking && hasSpace
    }
  }

  const getPrice = (bloque: ClaseBloque, mode: 'individual' | 'group') => {
    return mode === 'individual' ? bloque.individualPrice : bloque.groupPricePerPerson
  }

  const getBloqueReservationMode = (bloqueId: string) => {
    return bloqueReservationModes[bloqueId] || 'individual'
  }

  const setBloqueReservationMode = (bloqueId: string, mode: 'individual' | 'group') => {
    setBloqueReservationModes(prev => ({
      ...prev,
      [bloqueId]: mode
    }))
  }

  const getSlotStatus = (bloque: ClaseBloque) => {
    if (bloque.individualBooking?.isBooked && bloque.individualBooking?.studentName) {
      return {
        type: 'individual' as const,
        status: 'occupied',
        message: `Reservado por ${bloque.individualBooking.studentName}`,
        color: 'text-red-400'
      }
    } else if (bloque.groupBookings && bloque.groupBookings.length > 0) {
      return {
        type: 'group' as const,
        status: 'partial',
        message: `Grupo: ${bloque.groupBookings.length}/${bloque.maxGroupCapacity} cupos`,
        color: 'text-orange-400',
        students: bloque.groupBookings.map(b => b.studentName)
      }
    } else {
      return {
        type: 'available' as const,
        status: 'free',
        message: 'Disponible',
        color: 'text-green-400'
      }
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      {/* Page Header */}
      <div className="bg-gradient-to-r from-cyan-900/50 via-blue-900/50 to-purple-900/50 border-b border-cyan-400/20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-racing text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
              CLASES DE KARTING
            </h1>
            <p className="text-blue-300 text-lg max-w-2xl mx-auto">
              Aprende técnicas avanzadas de karting con nuestros instructores certificados. 
              Clases individuales o grupales por bloques de 1 hora.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-center mb-8">
          <div className="flex bg-blue-900/30 rounded-xl p-1 border border-blue-400/20">
            <button
              onClick={() => setSearchMode('instructor')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                searchMode === 'instructor'
                  ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/25'
                  : 'text-blue-300 hover:text-cyan-400'
              }`}
            >
              🧑‍🏫 Buscar por Instructor
            </button>
            <button
              onClick={() => setSearchMode('day')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                searchMode === 'day'
                  ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/25'
                  : 'text-blue-300 hover:text-cyan-400'
              }`}
            >
              📅 Buscar por Día
            </button>
          </div>
        </div>


        {/* Content based on search mode */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin text-6xl mb-4">🏁</div>
            <p className="text-cyan-400 text-xl font-racing">CARGANDO CLASES...</p>
          </div>
        ) : searchMode === 'instructor' ? (
          <div className="space-y-8">
            {/* Instructor Selection */}
            {!selectedInstructor ? (
              instructors.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-cyan-400 text-xl font-racing mb-2">NO HAY CLASES DISPONIBLES</p>
                  <p className="text-blue-300">Los coaches aún no han creado clases</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {instructors.map((instructor) => (
                  <div
                    key={instructor.id}
                    className="bg-blue-900/20 border border-blue-400/20 rounded-xl p-6 hover:bg-blue-800/30 transition-all cursor-pointer hover:border-cyan-400/40"
                    onClick={() => setSelectedInstructor(instructor.id)}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 rounded-full flex items-center justify-center border-2 border-cyan-400/50">
                        <span className="text-2xl">🧑‍🏫</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-cyan-400">{instructor.name}</h3>
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-400">⭐</span>
                          <span className="text-blue-300">{instructor.rating}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-blue-300">
                        <strong>Experiencia:</strong> {instructor.experience}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {instructor.specialties.map((specialty) => (
                          <span
                            key={specialty}
                            className="px-3 py-1 bg-cyan-400/20 text-cyan-400 rounded-full text-sm border border-cyan-400/30"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              )
            ) : (
              /* Instructor Schedule */
              <div className="space-y-6">
                <button
                  onClick={() => setSelectedInstructor(null)}
                  className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  ← Volver a instructores
                </button>
                
                {/* Calendar for instructor search */}
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-cyan-400 text-center">Selecciona una fecha</h3>
                  
                  {/* Calendar Container */}
                  <div className="bg-blue-900/20 border border-blue-400/20 rounded-xl p-4 sm:p-6 max-w-md mx-auto">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => navigateMonth('prev')}
                        className="p-2 text-blue-300 hover:text-cyan-400 transition-colors rounded-lg hover:bg-blue-800/30"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      
                      <h4 className="text-lg font-bold text-cyan-400">
                        {currentMonth.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
                      </h4>
                      
                      <button
                        onClick={() => navigateMonth('next')}
                        className="p-2 text-blue-300 hover:text-cyan-400 transition-colors rounded-lg hover:bg-blue-800/30"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* Days of Week Header */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                        <div key={day} className="text-center text-xs font-medium text-blue-300 py-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                      {/* Empty cells for days before month start */}
                      {Array.from({ length: getFirstDayOfMonth(currentMonth) }, (_, i) => (
                        <div key={`empty-${i}`} className="h-10"></div>
                      ))}
                      
                      {/* Days of the month */}
                      {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => {
                        const day = i + 1
                        const isAvailable = isDateAvailable(day)
                        const isSelected = isDateSelected(day)
                        const isToday = new Date().getDate() === day && 
                                       new Date().getMonth() === currentMonth.getMonth() &&
                                       new Date().getFullYear() === currentMonth.getFullYear()
                        
                        return (
                          <button
                            key={day}
                            onClick={() => selectCalendarDate(day)}
                            disabled={!isAvailable}
                            className={`h-10 w-full rounded-lg text-sm font-medium transition-all ${
                              isSelected
                                ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/25'
                                : isAvailable
                                ? 'text-blue-300 hover:bg-blue-800/40 hover:text-cyan-400 border border-transparent hover:border-cyan-400/40'
                                : 'text-blue-700 cursor-not-allowed'
                            } ${
                              isToday && !isSelected
                                ? 'border border-yellow-400 text-yellow-400'
                                : ''
                            }`}
                          >
                            {day}
                          </button>
                        )
                      })}
                    </div>

                    {/* Legend */}
                    <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 border border-yellow-400 rounded"></div>
                        <span className="text-blue-300">Hoy</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-cyan-400 rounded"></div>
                        <span className="text-blue-300">Seleccionado</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-700 rounded"></div>
                        <span className="text-blue-300">No disponible</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-900/20 border border-blue-400/20 rounded-xl p-6">
                  <h2 className="text-2xl font-bold text-cyan-400 mb-4">
                    Todas las clases de {instructors.find(i => i.id === selectedInstructor)?.name}
                  </h2>

                  {getBloquesByInstructor(selectedInstructor).length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📭</div>
                      <p className="text-blue-300 text-lg">Este instructor no tiene clases programadas</p>
                    </div>
                  ) : (
                    <div className="grid lg:grid-cols-2 gap-4">
                      {getBloquesByInstructor(selectedInstructor).map((bloque) => {
                      const slotStatus = getSlotStatus(bloque)
                      
                      return (
                        <div
                          key={bloque.id}
                          className="bg-black/30 border border-blue-400/20 rounded-lg p-4 hover:border-cyan-400/40 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                                <span className="text-cyan-400 font-medium">
                                  {new Date(bloque.date).toLocaleDateString('es-CL')}
                                </span>
                                <span className="text-blue-300 text-lg">
                                  {bloque.startTime} - {bloque.endTime}
                                </span>
                              </div>
                              
                              {/* Status */}
                              <div className="mb-3">
                                <span className={`px-3 py-1 rounded-full text-sm border ${slotStatus.color} ${
                                  slotStatus.status === 'free' ? 'bg-green-900/30 border-green-400/30' :
                                  slotStatus.status === 'partial' ? 'bg-orange-900/30 border-orange-400/30' :
                                  'bg-red-900/30 border-red-400/30'
                                }`}>
                                  {slotStatus.message}
                                </span>
                              </div>
                              
                              {/* Group members if any */}
                              {slotStatus.students && slotStatus.students.length > 0 && (
                                <div className="text-xs text-orange-300 mb-3">
                                  👥 {slotStatus.students.join(', ')}
                                </div>
                              )}
                            </div>
                            
                            {/* Reservation Panel */}
                            <div className="sm:ml-6 w-full sm:w-auto">
                              {slotStatus.status !== 'occupied' && (
                                <div className="bg-blue-900/30 border border-blue-400/20 rounded-lg p-4 w-full sm:w-[240px]">
                                  {/* Mode Switch */}
                                  <div className="flex bg-blue-800/30 rounded-lg p-1 mb-3">
                                    <button
                                      onClick={() => setBloqueReservationMode(bloque.id, 'individual')}
                                      className={`w-1/2 px-3 py-1 rounded text-xs font-medium transition-all ${
                                        getBloqueReservationMode(bloque.id) === 'individual'
                                          ? 'bg-cyan-400 text-black'
                                          : 'text-blue-300 hover:text-cyan-400'
                                      }`}
                                    >
                                      👤 Individual
                                    </button>
                                    <button
                                      onClick={() => setBloqueReservationMode(bloque.id, 'group')}
                                      className={`w-1/2 px-3 py-1 rounded text-xs font-medium transition-all ${
                                        getBloqueReservationMode(bloque.id) === 'group'
                                          ? 'bg-cyan-400 text-black'
                                          : 'text-blue-300 hover:text-cyan-400'
                                      }`}
                                    >
                                      👥 Grupal
                                    </button>
                                  </div>
                                  
                                  {/* Price */}
                                  <div className="text-xl font-bold text-cyan-400 mb-2">
                                    {formatPrice(getPrice(bloque, getBloqueReservationMode(bloque.id)))}
                                  </div>
                                  
                                  {/* Additional info */}
                                  <div className="text-xs text-blue-300 mb-3">
                                    {getBloqueReservationMode(bloque.id) === 'individual' ? (
                                      'Clase personalizada 1:1'
                                    ) : (
                                      `$25.000 por persona • Máx. ${bloque.maxGroupCapacity} estudiantes`
                                    )}
                                  </div>
                                  
                                  {/* Reserve button */}
                                  <button
                                    className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                                      isSlotAvailable(bloque, getBloqueReservationMode(bloque.id))
                                        ? 'bg-cyan-400 text-black hover:bg-cyan-300'
                                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    }`}
                                    disabled={!isSlotAvailable(bloque, getBloqueReservationMode(bloque.id)) || bookingInProgress === bloque.id}
                                    onClick={() => handleBookClass(bloque.id, getBloqueReservationMode(bloque.id))}
                                  >
                                    {bookingInProgress === bloque.id ? 'Reservando...' : isSlotAvailable(bloque, getBloqueReservationMode(bloque.id)) ? 'Reservar' : 'No disponible'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Day-based search */
          <div className="space-y-8">
            {/* Calendar */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-cyan-400 text-center">Selecciona una fecha</h3>
              
              {/* Calendar Container */}
              <div className="bg-blue-900/20 border border-blue-400/20 rounded-xl p-4 sm:p-6 max-w-md mx-auto">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="p-2 text-blue-300 hover:text-cyan-400 transition-colors rounded-lg hover:bg-blue-800/30"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  
                  <h4 className="text-lg font-bold text-cyan-400">
                    {currentMonth.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
                  </h4>
                  
                  <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 text-blue-300 hover:text-cyan-400 transition-colors rounded-lg hover:bg-blue-800/30"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Days of Week Header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-blue-300 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for days before month start */}
                  {Array.from({ length: getFirstDayOfMonth(currentMonth) }, (_, i) => (
                    <div key={`empty-${i}`} className="h-10"></div>
                  ))}
                  
                  {/* Days of the month */}
                  {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => {
                    const day = i + 1
                    const isAvailable = isDateAvailable(day)
                    const isSelected = isDateSelected(day)
                    const isToday = new Date().getDate() === day && 
                                   new Date().getMonth() === currentMonth.getMonth() &&
                                   new Date().getFullYear() === currentMonth.getFullYear()
                    
                    return (
                      <button
                        key={day}
                        onClick={() => selectCalendarDate(day)}
                        disabled={!isAvailable}
                        className={`h-10 w-full rounded-lg text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-cyan-400 text-black shadow-lg shadow-cyan-400/25'
                            : isAvailable
                            ? 'text-blue-300 hover:bg-blue-800/40 hover:text-cyan-400 border border-transparent hover:border-cyan-400/40'
                            : 'text-blue-700 cursor-not-allowed'
                        } ${
                          isToday && !isSelected
                            ? 'border border-yellow-400 text-yellow-400'
                            : ''
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 border border-yellow-400 rounded"></div>
                    <span className="text-blue-300">Hoy</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-cyan-400 rounded"></div>
                    <span className="text-blue-300">Seleccionado</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-blue-700 rounded"></div>
                    <span className="text-blue-300">No disponible</span>
                  </div>
                </div>
              </div>
            </div>

            {/* All Available Classes */}
            <div className="bg-blue-900/20 border border-blue-400/20 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-cyan-400 mb-6">
                Todas las clases disponibles
              </h2>

              {bloques.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-blue-300 text-lg">No hay clases programadas</p>
                </div>
              ) : (
                <div className="grid lg:grid-cols-2 gap-4">
                  {bloques.map((bloque) => {
                  const slotStatus = getSlotStatus(bloque)
                  
                  return (
                    <div
                      key={bloque.id}
                      className="bg-black/30 border border-blue-400/20 rounded-lg p-4 hover:border-cyan-400/40 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
                            <span className="text-cyan-400 font-medium text-lg">
                              {bloque.startTime} - {bloque.endTime}
                            </span>
                            <span className="text-blue-300 text-sm sm:text-base">
                              con {bloque.instructor}
                            </span>
                          </div>
                          
                          {/* Status */}
                          <div className="mb-3">
                            <span className={`px-3 py-1 rounded-full text-sm border ${slotStatus.color} ${
                              slotStatus.status === 'free' ? 'bg-green-900/30 border-green-400/30' :
                              slotStatus.status === 'partial' ? 'bg-orange-900/30 border-orange-400/30' :
                              'bg-red-900/30 border-red-400/30'
                            }`}>
                              {slotStatus.message}
                            </span>
                          </div>
                          
                          {/* Group members if any */}
                          {slotStatus.students && slotStatus.students.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs text-orange-300 mb-2">
                                👥 {slotStatus.students.join(', ')}
                              </div>
                              {/* Invite button if user is part of the group */}
                              {user && token && bloque.groupBookings?.some(b => b.studentName === (user.profile.alias || `${user.profile.firstName} ${user.profile.lastName}`)) && (
                                <button
                                  onClick={() => {
                                    setSelectedClassForInvite(bloque)
                                    setShowInvitationModal(true)
                                  }}
                                  className="text-xs px-3 py-1 bg-electric-blue/20 border border-electric-blue/40 text-electric-blue rounded-lg hover:bg-electric-blue/30 transition-all"
                                >
                                  ✉️ Invitar Corredor
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Reservation Panel */}
                        <div className="sm:ml-6 w-full sm:w-auto">
                          {slotStatus.status === 'occupied' ? (
                            <div className="bg-red-900/20 border border-red-400/30 rounded-lg p-4 w-full sm:w-[240px]">
                              <div className="text-center">
                                <div className="text-3xl mb-2">🔒</div>
                                <p className="text-red-400 font-medium text-sm">Clase Reservada</p>
                                <p className="text-red-300/70 text-xs mt-1">Este slot ya no está disponible</p>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-blue-900/30 border border-blue-400/20 rounded-lg p-4 w-full sm:w-[240px]">
                              {/* Mode Switch */}
                              <div className="flex bg-blue-800/30 rounded-lg p-1 mb-3">
                                <button
                                  onClick={() => setBloqueReservationMode(bloque.id, 'individual')}
                                  className={`w-1/2 px-3 py-1 rounded text-xs font-medium transition-all ${
                                    getBloqueReservationMode(bloque.id) === 'individual'
                                      ? 'bg-cyan-400 text-black'
                                      : 'text-blue-300 hover:text-cyan-400'
                                  }`}
                                >
                                  👤 Individual
                                </button>
                                <button
                                  onClick={() => setBloqueReservationMode(bloque.id, 'group')}
                                  className={`w-1/2 px-3 py-1 rounded text-xs font-medium transition-all ${
                                    getBloqueReservationMode(bloque.id) === 'group'
                                      ? 'bg-cyan-400 text-black'
                                      : 'text-blue-300 hover:text-cyan-400'
                                  }`}
                                >
                                  👥 Grupal
                                </button>
                              </div>
                              
                              {/* Price */}
                              <div className="text-xl font-bold text-cyan-400 mb-2">
                                {formatPrice(getPrice(bloque, getBloqueReservationMode(bloque.id)))}
                              </div>
                              
                              {/* Additional info */}
                              <div className="text-xs text-blue-300 mb-3">
                                {getBloqueReservationMode(bloque.id) === 'individual' ? (
                                  'Clase personalizada 1:1'
                                ) : (
                                  `$25.000 por persona • Máx. ${bloque.maxGroupCapacity} estudiantes`
                                )}
                              </div>
                              
                              {/* Reserve button */}
                              <button
                                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                                  isSlotAvailable(bloque, getBloqueReservationMode(bloque.id))
                                    ? 'bg-cyan-400 text-black hover:bg-cyan-300'
                                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                }`}
                                disabled={!isSlotAvailable(bloque, getBloqueReservationMode(bloque.id)) || bookingInProgress === bloque.id}
                                onClick={() => handleBookClass(bloque.id, getBloqueReservationMode(bloque.id))}
                              >
                                {bookingInProgress === bloque.id ? 'Reservando...' : isSlotAvailable(bloque, getBloqueReservationMode(bloque.id)) ? 'Reservar' : 'No disponible'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Invitation Modal */}
      {showInvitationModal && selectedClassForInvite && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-midnight via-racing-black to-midnight border-2 border-electric-blue/50 rounded-lg p-8 max-w-md w-full shadow-2xl">
            <div className="mb-6">
              <h3 className="text-2xl font-racing text-electric-blue mb-2">INVITAR CORREDOR</h3>
              <p className="text-sky-blue/70 text-sm">
                Invita a otro corredor a unirse a esta clase grupal
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-electric-blue text-sm mb-2">
                  Clase
                </label>
                <div className="bg-midnight/50 border border-electric-blue/30 rounded-lg p-3">
                  <p className="text-white">{selectedClassForInvite.instructor}</p>
                  <p className="text-sky-blue/70 text-sm">
                    {new Date(selectedClassForInvite.date).toLocaleDateString('es-CL')} • {selectedClassForInvite.startTime} - {selectedClassForInvite.endTime}
                  </p>
                  <p className="text-orange-400 text-xs mt-1">
                    {selectedClassForInvite.groupBookings.length}/{selectedClassForInvite.maxGroupCapacity} cupos ocupados
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-electric-blue text-sm mb-2">
                  Email del corredor *
                </label>
                <input
                  type="email"
                  value={inviteeEmail}
                  onChange={(e) => setInviteeEmail(e.target.value)}
                  placeholder="corredor@ejemplo.com"
                  className="w-full px-4 py-3 bg-midnight/50 border-2 border-electric-blue/50 rounded-lg text-white focus:border-electric-blue focus:outline-none"
                  disabled={sendingInvitation}
                />
                <p className="text-sky-blue/50 text-xs mt-1">
                  Se enviará un link de invitación a este email
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowInvitationModal(false)
                  setSelectedClassForInvite(null)
                  setInviteeEmail('')
                }}
                disabled={sendingInvitation}
                className="flex-1 px-6 py-3 border-2 border-slate-500 text-slate-300 rounded-lg hover:bg-slate-500/10 transition-all font-medium disabled:opacity-50"
              >
                CANCELAR
              </button>
              <button
                onClick={handleSendInvitation}
                disabled={sendingInvitation || !inviteeEmail}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 rounded-lg hover:from-yellow-300 hover:to-yellow-400 transition-all font-racing text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingInvitation ? 'ENVIANDO...' : 'ENVIAR'}
              </button>
            </div>
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
    </div>
  )
}