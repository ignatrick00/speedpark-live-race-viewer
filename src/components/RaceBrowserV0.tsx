'use client';

import React, { useState, useEffect } from 'react';
import DatePicker from './DatePicker';
import RaceResultsView from './RaceResultsView';

interface Race {
  sessionId: string;
  sessionName: string;
  sessionDate: string;
  sessionType: string;
  totalDrivers: number;
  totalLaps: number;
  displayDate: string;
  displayTime: string;
}

export default function RaceBrowserV0() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // YYYY-MM-DD local time
  });
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [raceDetails, setRaceDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch races when date changes
  useEffect(() => {
    fetchRaces();
  }, [selectedDate]);

  // Fetch race results when race is selected
  useEffect(() => {
    if (selectedRace) {
      fetchRaceResults();
    }
  }, [selectedRace]);

  const fetchRaces = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/races-v0?date=${selectedDate}`);
      const data = await response.json();

      if (data.success) {
        setRaces(data.races);
      }
    } catch (error) {
      console.error('Error fetching races:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRaceResults = async () => {
    if (!selectedRace) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/race-results-v0?sessionId=${encodeURIComponent(selectedRace.sessionId)}`);
      const data = await response.json();

      if (data.success) {
        setRaceDetails(data.race);
      }
    } catch (error) {
      console.error('Error fetching race results:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Date Selector */}
      <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-electric-blue mb-2">
              📅 Navegador de Carreras V0
            </h2>
            <p className="text-sm text-sky-blue/60">
              Selecciona una fecha para ver las carreras del día
            </p>
          </div>

          <DatePicker
            value={selectedDate}
            onChange={(date) => {
              setSelectedDate(date);
              setSelectedRace(null);
            }}
          />
        </div>
      </div>

      {/* Race List */}
      {!selectedRace && (
        <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
          <h3 className="text-xl font-bold text-electric-blue mb-4">
            Carreras del {(() => {
              const [year, month, day] = selectedDate.split('-').map(Number);
              const date = new Date(year, month - 1, day);
              return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
            })()}
          </h3>

          {loading && (
            <div className="text-center text-gray-400 py-8">Cargando carreras...</div>
          )}

          {!loading && races.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              No hay carreras registradas en esta fecha
            </div>
          )}

          {!loading && races.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {races.map((race) => (
                <button
                  key={race.sessionId}
                  onClick={() => setSelectedRace(race)}
                  className="bg-racing-black/40 border border-sky-blue/20 rounded-lg p-4 hover:border-electric-blue/50 hover:bg-racing-black/60 transition-all text-left"
                >
                  <div className="font-bold text-white mb-2">{race.sessionName}</div>
                  <div className="text-sm text-sky-blue/60 space-y-1">
                    <div>⏰ {race.displayTime}</div>
                    <div>👥 {race.totalDrivers} pilotos</div>
                    <div>🏁 {race.totalLaps} vueltas totales</div>
                    <div className="text-xs text-electric-blue mt-2 capitalize">
                      {race.sessionType}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Race Results Table */}
      {selectedRace && (
        <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
          {loading && (
            <div className="text-center text-gray-400 py-8">Cargando resultados...</div>
          )}

          {!loading && raceDetails && (
            <RaceResultsView
              raceDetails={raceDetails}
              onBack={() => {
                setSelectedRace(null);
              }}
              showBackButton={true}
            />
          )}
        </div>
      )}
    </div>
  );
}
