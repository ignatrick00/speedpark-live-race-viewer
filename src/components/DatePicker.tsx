'use client';

import React, { useState, useRef, useEffect } from 'react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

export default function DatePicker({ value, onChange }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Parse as local date to avoid timezone issues
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  const [currentMonth, setCurrentMonth] = useState(parseLocalDate(value));
  const containerRef = useRef<HTMLDivElement>(null);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatDisplayDate = (dateStr: string) => {
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString('es-CL', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSelectDay = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    onChange(`${year}-${month}-${day}`);
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    onChange(`${year}-${month}-${day}`);
    setCurrentMonth(today);
    setIsOpen(false);
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date | null) => {
    if (!date) return false;
    const selected = parseLocalDate(value);
    return (
      date.getDate() === selected.getDate() &&
      date.getMonth() === selected.getMonth() &&
      date.getFullYear() === selected.getFullYear()
    );
  };

  const days = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-racing-black border-2 border-electric-blue/30 text-white px-6 py-3 rounded-lg font-bold hover:border-electric-blue hover:shadow-lg hover:shadow-electric-blue/20 transition-all focus:outline-none focus:ring-2 focus:ring-electric-blue flex items-center gap-3 min-w-[280px]"
      >
        <span className="text-electric-blue text-xl">📅</span>
        <span className="flex-1 text-left font-racing text-lg tracking-wide">
          {formatDisplayDate(value)}
        </span>
        <span className={`text-sky-blue transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Calendar Dropdown */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-midnight border-2 border-electric-blue/40 rounded-xl shadow-2xl shadow-electric-blue/10 p-4 z-50 animate-in fade-in duration-200 min-w-[320px]">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-electric-blue/20">
            <button
              onClick={handlePrevMonth}
              className="text-electric-blue hover:text-karting-gold text-2xl font-bold transition-colors px-2"
            >
              ‹
            </button>
            <h3 className="font-racing text-xl text-white uppercase tracking-wider">
              {monthName}
            </h3>
            <button
              onClick={handleNextMonth}
              className="text-electric-blue hover:text-karting-gold text-2xl font-bold transition-colors px-2"
            >
              ›
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
              <div key={day} className="text-center text-sky-blue/60 text-xs font-semibold py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {days.map((date, idx) => {
              if (!date) {
                return <div key={idx} className="aspect-square" />;
              }

              const selected = isSelected(date);
              const today = isToday(date);

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectDay(date)}
                  className={`
                    aspect-square rounded-lg text-sm font-semibold transition-all
                    ${selected
                      ? 'bg-karting-gold text-midnight shadow-lg shadow-karting-gold/30'
                      : today
                        ? 'bg-electric-blue/20 text-electric-blue border border-electric-blue/50'
                        : 'text-white hover:bg-sky-blue/20 hover:text-sky-blue'
                    }
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 pt-2 border-t border-electric-blue/20">
            <button
              onClick={handleToday}
              className="flex-1 bg-electric-blue/10 border border-electric-blue/30 text-electric-blue px-4 py-2 rounded-lg font-semibold hover:bg-electric-blue/20 hover:border-electric-blue transition-all text-sm"
            >
              📍 Hoy
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-sky-blue/60 hover:text-sky-blue transition-colors text-sm font-semibold"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
