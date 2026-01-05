'use client';

import React, { useState } from 'react';

interface DatePickerCalendarProps {
  selectedDate: string; // YYYY-MM-DD format
  onDateChange: (date: string) => void;
  maxDate?: string; // YYYY-MM-DD format
}

export default function DatePickerCalendar({ selectedDate, onDateChange, maxDate }: DatePickerCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    // Parsear manualmente para evitar conversión UTC
    const [year, month] = selectedDate.split('-').map(Number);
    return new Date(year, month - 1, 1);
  });

  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const formatDisplayDate = (dateStr: string) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    // Parsear manualmente para evitar conversión UTC
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayName = days[date.getDay()];
    const dayNumber = date.getDate();
    const monthName = months[date.getMonth()];
    return `${dayName} ${dayNumber} de ${monthName}`;
  };

  // Get all days for current month view
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const handleDayClick = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Formato YYYY-MM-DD sin conversión UTC (usa hora local)
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Check if date is in the future
    if (maxDate && dateStr > maxDate) {
      return; // Don't allow future dates
    }

    onDateChange(dateStr);
    setIsOpen(false);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

    // Parsear maxDate manualmente para evitar conversión UTC
    let maxYear, maxMonth;
    if (maxDate) {
      [maxYear, maxMonth] = maxDate.split('-').map(Number);
    } else {
      const now = new Date();
      maxYear = now.getFullYear();
      maxMonth = now.getMonth() + 1; // getMonth() es 0-indexed
    }

    // Don't go to future months beyond maxDate
    if (nextMonth.getFullYear() > maxYear ||
        (nextMonth.getFullYear() === maxYear && nextMonth.getMonth() + 1 > maxMonth)) {
      return;
    }

    setCurrentMonth(nextMonth);
  };

  const isDateSelected = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr === selectedDate;
  };

  const isDateDisabled = (day: number) => {
    if (!maxDate) return false;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr > maxDate;
  };

  const isToday = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Obtener fecha de hoy en hora local (sin UTC)
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    return dateStr === todayStr;
  };

  const days = getDaysInMonth();

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-racing-black border border-electric-blue/30 rounded-lg text-white hover:border-electric-blue/60 focus:border-electric-blue/60 focus:outline-none transition-colors"
      >
        <span className="text-lg">📅</span>
        <span className="text-sm font-medium">{formatDisplayDate(selectedDate)}</span>
        <span className="text-electric-blue/60 text-xs">▼</span>
      </button>

      {/* Calendar Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Calendar */}
          <div className="absolute top-full left-0 mt-2 z-50 bg-gradient-to-br from-racing-black/95 to-racing-black/90 border border-electric-blue/30 rounded-xl shadow-2xl p-4 min-w-[320px]">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={goToPreviousMonth}
                className="p-2 hover:bg-electric-blue/10 rounded-lg transition-colors text-electric-blue"
              >
                ←
              </button>
              <div className="text-center">
                <div className="font-bold text-electric-blue">
                  {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </div>
              </div>
              <button
                onClick={goToNextMonth}
                className="p-2 hover:bg-electric-blue/10 rounded-lg transition-colors text-electric-blue disabled:opacity-30 disabled:cursor-not-allowed"
                disabled={(() => {
                  if (!maxDate) return false;
                  const [maxYear, maxMonth] = maxDate.split('-').map(Number);
                  return (
                    currentMonth.getFullYear() > maxYear ||
                    (currentMonth.getFullYear() === maxYear &&
                      currentMonth.getMonth() + 1 >= maxMonth)
                  );
                })()}
              >
                →
              </button>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-sky-blue/60 py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const selected = isDateSelected(day);
                const disabled = isDateDisabled(day);
                const today = isToday(day);

                return (
                  <button
                    key={day}
                    onClick={() => !disabled && handleDayClick(day)}
                    disabled={disabled}
                    className={`
                      aspect-square rounded-lg text-sm font-medium transition-all
                      ${selected
                        ? 'bg-gradient-to-br from-electric-blue to-cyan-500 text-white shadow-lg scale-105'
                        : disabled
                        ? 'text-gray-600 cursor-not-allowed'
                        : today
                        ? 'bg-electric-blue/20 text-electric-blue border border-electric-blue/40'
                        : 'text-white hover:bg-electric-blue/10 hover:border hover:border-electric-blue/30'
                      }
                      ${!selected && !disabled && !today ? 'hover:scale-105' : ''}
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-electric-blue/20">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gradient-to-br from-electric-blue to-cyan-500"></div>
                  <span className="text-sky-blue/60">Seleccionado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-electric-blue/20 border border-electric-blue/40"></div>
                  <span className="text-sky-blue/60">Hoy</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
