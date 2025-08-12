'use client'

import { useState } from 'react'

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
}

const mockInstructors: Instructor[] = [
  {
    id: '1',
    name: 'Luis Abarca',
    specialties: ['Principiantes', 'Técnica de Frenado', 'Racing Line'],
    rating: 4.9,
    experience: '7 años'
  },
  {
    id: '2',
    name: 'Carlos Mendoza',
    specialties: ['Principiantes', 'Técnica de Frenado'],
    rating: 4.8,
    experience: '5 años'
  },
  {
    id: '3', 
    name: 'Ana Rodriguez',
    specialties: ['Avanzado', 'Racing Line'],
    rating: 4.9,
    experience: '8 años'
  },
  {
    id: '4',
    name: 'Miguel Torres',
    specialties: ['Niños', 'Seguridad'],
    rating: 4.7,
    experience: '3 años'
  }
]

// Generar horarios automáticamente - Lunes a Domingo 14:00 a 22:00
const generateSchedule = () => {
  const bloques: ClaseBloque[] = []
  const today = new Date()
  
  // Generar para los próximos 7 días
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDate = new Date(today)
    currentDate.setDate(today.getDate() + dayOffset)
    const dateString = currentDate.toISOString().split('T')[0]
    
    // Horarios de 14:00 a 22:00 (cada hora)
    const hours = [14, 15, 16, 17, 18, 19, 20, 21]
    
    hours.forEach(hour => {
      const startTime = `${hour.toString().padStart(2, '0')}:00`
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`
      
      // Para cada instructor - UN SOLO BLOQUE por hora que puede ser individual O grupal
      mockInstructors.forEach(instructor => {
        // Simular algunas reservas aleatorias
        const hasIndividualBooking = Math.random() > 0.8 // 20% probabilidad
        const groupBookingsCount = Math.floor(Math.random() * 3) // 0-2 reservas grupales
        
        const groupBookings = Array.from({length: groupBookingsCount}, (_, i) => ({
          studentName: `Estudiante ${i + 1}`,
          bookedAt: new Date()
        }))
        
        bloques.push({
          id: `${instructor.id}-${dateString}-${hour}`,
          instructorId: instructor.id,
          instructor: instructor.name,
          date: dateString,
          startTime,
          endTime,
          individualBooking: hasIndividualBooking ? {
            isBooked: true,
            studentName: 'Juan Pérez'
          } : {
            isBooked: false
          },
          groupBookings,
          maxGroupCapacity: 4
        })
      })
    })
  }
  
  return bloques
}

const mockBloques = generateSchedule()

export default function ClasesPage() {
  const [searchMode, setSearchMode] = useState<'instructor' | 'day'>('instructor')
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedBloque, setSelectedBloque] = useState<ClaseBloque | null>(null)
  const [reservationMode, setReservationMode] = useState<'individual' | 'group'>('individual')

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

  const getBloquesByInstructor = (instructorId: string) => {
    return mockBloques.filter(bloque => bloque.instructorId === instructorId)
  }

  const getBloquesByDate = (date: string) => {
    return mockBloques.filter(bloque => bloque.date === date)
  }

  const isSlotAvailable = (bloque: ClaseBloque, mode: 'individual' | 'group') => {
    if (mode === 'individual') {
      // Individual: disponible si no hay reserva individual Y no hay reservas grupales
      return !bloque.individualBooking?.isBooked && bloque.groupBookings.length === 0
    } else {
      // Grupal: disponible si no hay reserva individual Y hay espacio en el grupo
      return !bloque.individualBooking?.isBooked && bloque.groupBookings.length < bloque.maxGroupCapacity
    }
  }

  const getPrice = (mode: 'individual' | 'group') => {
    return mode === 'individual' ? 45000 : 25000
  }

  const getSlotStatus = (bloque: ClaseBloque) => {
    if (bloque.individualBooking?.isBooked) {
      return {
        type: 'individual' as const,
        status: 'occupied',
        message: `Reservado por ${bloque.individualBooking.studentName}`,
        color: 'text-red-400'
      }
    } else if (bloque.groupBookings.length > 0) {
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
      {/* Header */}
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
        {searchMode === 'instructor' ? (
          <div className="space-y-8">
            {/* Instructor Selection */}
            {!selectedInstructor ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockInstructors.map((instructor) => (
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
            ) : (
              /* Instructor Schedule */
              <div className="space-y-6">
                <button
                  onClick={() => setSelectedInstructor(null)}
                  className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  ← Volver a instructores
                </button>
                
                <div className="bg-blue-900/20 border border-blue-400/20 rounded-xl p-6">
                  <h2 className="text-2xl font-bold text-cyan-400 mb-4">
                    Horarios de {mockInstructors.find(i => i.id === selectedInstructor)?.name}
                  </h2>
                  
                  <div className="grid gap-4">
                    {getBloquesByInstructor(selectedInstructor).map((bloque) => {
                      const slotStatus = getSlotStatus(bloque)
                      
                      return (
                        <div
                          key={bloque.id}
                          className="bg-black/30 border border-blue-400/20 rounded-lg p-4 hover:border-cyan-400/40 transition-all"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-3">
                                <span className="text-cyan-400 font-medium">
                                  {new Date(bloque.date).toLocaleDateString('es-CL')}
                                </span>
                                <span className="text-blue-300">
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
                            <div className="ml-6 text-right">
                              {slotStatus.status !== 'occupied' && (
                                <div className="bg-blue-900/30 border border-blue-400/20 rounded-lg p-4 min-w-[200px]">
                                  {/* Mode Switch */}
                                  <div className="flex bg-blue-800/30 rounded-lg p-1 mb-3">
                                    <button
                                      onClick={() => setReservationMode('individual')}
                                      className={`flex-1 px-3 py-1 rounded text-xs font-medium transition-all ${
                                        reservationMode === 'individual'
                                          ? 'bg-cyan-400 text-black'
                                          : 'text-blue-300 hover:text-cyan-400'
                                      }`}
                                      disabled={!isSlotAvailable(bloque, 'individual')}
                                    >
                                      👤 Individual
                                    </button>
                                    <button
                                      onClick={() => setReservationMode('group')}
                                      className={`flex-1 px-3 py-1 rounded text-xs font-medium transition-all ${
                                        reservationMode === 'group'
                                          ? 'bg-cyan-400 text-black'
                                          : 'text-blue-300 hover:text-cyan-400'
                                      }`}
                                      disabled={!isSlotAvailable(bloque, 'group')}
                                    >
                                      👥 Grupal
                                    </button>
                                  </div>
                                  
                                  {/* Price */}
                                  <div className="text-xl font-bold text-cyan-400 mb-2">
                                    {formatPrice(getPrice(reservationMode))}
                                  </div>
                                  
                                  {/* Additional info */}
                                  <div className="text-xs text-blue-300 mb-3">
                                    {reservationMode === 'individual' ? (
                                      'Clase personalizada 1:1'
                                    ) : (
                                      `Máx. ${bloque.maxGroupCapacity} estudiantes`
                                    )}
                                  </div>
                                  
                                  {/* Reserve button */}
                                  <button 
                                    className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                                      isSlotAvailable(bloque, reservationMode)
                                        ? 'bg-cyan-400 text-black hover:bg-cyan-300'
                                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    }`}
                                    disabled={!isSlotAvailable(bloque, reservationMode)}
                                    onClick={() => setSelectedBloque(bloque)}
                                  >
                                    {isSlotAvailable(bloque, reservationMode) ? 'Reservar' : 'No disponible'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Day-based search */
          <div className="space-y-8">
            {/* Date Selection */}
            <div className="flex justify-center">
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-blue-900/30 border border-blue-400/20 rounded-lg px-4 py-2 text-cyan-400 focus:border-cyan-400 focus:outline-none"
              >
                {getAvailableDates().map((date) => (
                  <option key={date} value={date} className="bg-blue-900">
                    {new Date(date).toLocaleDateString('es-CL', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </option>
                ))}
              </select>
            </div>

            {/* Classes for selected date */}
            <div className="bg-blue-900/20 border border-blue-400/20 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-cyan-400 mb-6">
                Clases disponibles - {new Date(selectedDate).toLocaleDateString('es-CL')}
              </h2>
              
              <div className="grid gap-4">
                {getBloquesByDate(selectedDate).map((bloque) => {
                  const slotStatus = getSlotStatus(bloque)
                  
                  return (
                    <div
                      key={bloque.id}
                      className="bg-black/30 border border-blue-400/20 rounded-lg p-4 hover:border-cyan-400/40 transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <span className="text-cyan-400 font-medium">
                              {bloque.startTime} - {bloque.endTime}
                            </span>
                            <span className="text-blue-300">
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
                            <div className="text-xs text-orange-300 mb-3">
                              👥 {slotStatus.students.join(', ')}
                            </div>
                          )}
                        </div>
                        
                        {/* Reservation Panel */}
                        <div className="ml-6 text-right">
                          {slotStatus.status !== 'occupied' && (
                            <div className="bg-blue-900/30 border border-blue-400/20 rounded-lg p-4 min-w-[200px]">
                              {/* Mode Switch */}
                              <div className="flex bg-blue-800/30 rounded-lg p-1 mb-3">
                                <button
                                  onClick={() => setReservationMode('individual')}
                                  className={`flex-1 px-3 py-1 rounded text-xs font-medium transition-all ${
                                    reservationMode === 'individual'
                                      ? 'bg-cyan-400 text-black'
                                      : 'text-blue-300 hover:text-cyan-400'
                                  }`}
                                  disabled={!isSlotAvailable(bloque, 'individual')}
                                >
                                  👤 Individual
                                </button>
                                <button
                                  onClick={() => setReservationMode('group')}
                                  className={`flex-1 px-3 py-1 rounded text-xs font-medium transition-all ${
                                    reservationMode === 'group'
                                      ? 'bg-cyan-400 text-black'
                                      : 'text-blue-300 hover:text-cyan-400'
                                  }`}
                                  disabled={!isSlotAvailable(bloque, 'group')}
                                >
                                  👥 Grupal
                                </button>
                              </div>
                              
                              {/* Price */}
                              <div className="text-xl font-bold text-cyan-400 mb-2">
                                {formatPrice(getPrice(reservationMode))}
                              </div>
                              
                              {/* Additional info */}
                              <div className="text-xs text-blue-300 mb-3">
                                {reservationMode === 'individual' ? (
                                  'Clase personalizada 1:1'
                                ) : (
                                  `Máx. ${bloque.maxGroupCapacity} estudiantes`
                                )}
                              </div>
                              
                              {/* Reserve button */}
                              <button 
                                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                                  isSlotAvailable(bloque, reservationMode)
                                    ? 'bg-cyan-400 text-black hover:bg-cyan-300'
                                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                }`}
                                disabled={!isSlotAvailable(bloque, reservationMode)}
                                onClick={() => setSelectedBloque(bloque)}
                              >
                                {isSlotAvailable(bloque, reservationMode) ? 'Reservar' : 'No disponible'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}