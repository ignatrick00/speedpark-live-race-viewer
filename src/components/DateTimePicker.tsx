'use client';

import React, { useState, useRef, useEffect } from 'react';

interface DateTimePickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minDate?: string;
}

export default function DateTimePicker({ label, value, onChange, required, minDate }: DateTimePickerProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [step, setStep] = useState<'date' | 'time'>('date');
  const [selectedDate, setSelectedDate] = useState<Date>(value ? new Date(value) : new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(value ? new Date(value) : new Date());
  const [hours, setHours] = useState(value ? new Date(value).getHours() : 10);
  const [minutes, setMinutes] = useState(value ? new Date(value).getMinutes() : 0);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
        setStep('date');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDateTime = (date: Date, h: number, m: number) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(h).padStart(2, '0');
    const minute = String(m).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${minute}`;
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Seleccionar fecha y hora';
    const date = new Date(dateStr);
    return date.toLocaleString('es-CL', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(newDate);
    // Cambiar automáticamente al paso de selección de hora
    setStep('time');
  };

  const handleTimeConfirm = () => {
    const formatted = formatDateTime(selectedDate, hours, minutes);
    onChange(formatted);
    setShowCalendar(false);
    setStep('date'); // Reset para próxima vez
  };

  const handleCancel = () => {
    setShowCalendar(false);
    setStep('date');
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    return (
      day === selectedDate.getDate() &&
      currentMonth.getMonth() === selectedDate.getMonth() &&
      currentMonth.getFullYear() === selectedDate.getFullYear()
    );
  };

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleString('es-CL', { month: 'long', year: 'numeric' });

  return (
    <div className="relative" ref={calendarRef}>
      <label className="block text-gray-400 mb-2">
        {label} {required && '*'}
      </label>

      {/* Input Display */}
      <button
        type="button"
        onClick={() => {
          setShowCalendar(!showCalendar);
          setStep('date');
        }}
        className="w-full px-4 py-3 bg-black/50 border border-purple-500/30 rounded-lg focus:border-purple-400 focus:outline-none text-white text-left flex items-center justify-between hover:bg-black/70 transition-colors"
      >
        <span className={value ? 'text-white' : 'text-gray-500'}>
          {formatDisplayDate(value)}
        </span>
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {/* Calendar Modal - Centered on screen */}
      {showCalendar && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { setShowCalendar(false); setStep('date'); }} />

          {/* Calendar Content */}
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-gray-900 border border-purple-500/30 rounded-xl shadow-2xl p-4 w-[calc(100vw-2rem)] md:w-96 max-h-[85vh] overflow-y-auto">
            {step === 'date' ? (
            // PASO 1: Seleccionar Fecha
            <>
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h3 className="text-white font-bold capitalize">{monthName}</h3>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => (
                  <div key={i} className="text-center text-xs text-gray-500 font-bold py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {days.map((day, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => day && handleDateSelect(day)}
                    disabled={!day}
                    className={`
                      aspect-square flex items-center justify-center rounded-lg text-sm transition-all
                      ${!day ? 'invisible' : ''}
                      ${isSelected(day || 0) ? 'bg-purple-500 text-white font-bold' : ''}
                      ${isToday(day || 0) && !isSelected(day || 0) ? 'bg-purple-500/20 text-purple-400 font-bold' : ''}
                      ${day && !isSelected(day) && !isToday(day) ? 'text-gray-300 hover:bg-purple-500/10' : ''}
                    `}
                  >
                    {day}
                  </button>
                ))}
              </div>

              <div className="mt-4 text-center text-sm text-gray-400">
                Selecciona un día para continuar
              </div>
            </>
          ) : (
            // PASO 2: Seleccionar Hora
            <>
              {/* Selected Date Display */}
              <div className="mb-4 pb-4 border-b border-purple-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Fecha seleccionada</p>
                    <p className="text-white font-bold">
                      {selectedDate.toLocaleDateString('es-CL', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('date')}
                    className="text-purple-400 hover:text-purple-300 text-sm underline"
                  >
                    Cambiar
                  </button>
                </div>
              </div>

              {/* Time Picker */}
              <div className="mb-6">
                <label className="block text-gray-400 text-sm mb-3 text-center font-bold">
                  Selecciona la hora del evento
                </label>
                <div className="flex gap-3 items-center justify-center">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1 text-center">Hora</label>
                    <select
                      value={hours}
                      onChange={(e) => setHours(parseInt(e.target.value))}
                      className="w-full px-3 py-3 bg-black/50 border border-purple-500/30 rounded-lg focus:border-purple-400 focus:outline-none text-white text-center text-lg font-bold"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {String(i).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="text-white font-bold text-2xl mt-5">:</span>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1 text-center">Minutos</label>
                    <select
                      value={minutes}
                      onChange={(e) => setMinutes(parseInt(e.target.value))}
                      className="w-full px-3 py-3 bg-black/50 border border-purple-500/30 rounded-lg focus:border-purple-400 focus:outline-none text-white text-center text-lg font-bold"
                    >
                      {Array.from({ length: 12 }, (_, i) => i * 5).map((min) => (
                        <option key={min} value={min}>
                          {String(min).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Hora completa</p>
                  <p className="text-purple-400 font-bold text-xl">
                    {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 px-4 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleTimeConfirm}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors font-medium"
                >
                  Confirmar
                </button>
              </div>
            </>
          )}
          </div>
        </>
      )}
    </div>
  );
}
