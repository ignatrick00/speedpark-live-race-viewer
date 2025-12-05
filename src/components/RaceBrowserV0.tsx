'use client';

import React, { useState, useEffect } from 'react';
import DatePicker from './DatePicker';

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

interface DriverResult {
  driverName: string;
  position: number;
  bestTime: number;
  lastTime: number;
  averageTime: number;
  totalLaps: number;
  kartNumber: number;
  laps: any[];
}

interface Lap {
  lapNumber: number;
  time: number;
  position: number;
  kartNumber: number;
  timestamp: string;
  gapToLeader?: string;
  isPersonalBest?: boolean;
}

export default function RaceBrowserV0() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  });
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [raceResults, setRaceResults] = useState<DriverResult[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverResult | null>(null);
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
        console.log(`📊 [V0] Loaded ${data.races.length} races for ${selectedDate}`);
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
        setRaceResults(data.race.drivers);
        console.log(`🏁 [V0] Loaded results for ${selectedRace.sessionName}`);
      }
    } catch (error) {
      console.error('Error fetching race results:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeMs: number) => {
    if (!timeMs || timeMs === 0) return '--:--';
    const minutes = Math.floor(timeMs / 60000);
    const seconds = ((timeMs % 60000) / 1000).toFixed(3);
    return `${minutes}:${parseFloat(seconds).toFixed(3).padStart(6, '0')}`;
  };

  const getPositionColor = (position: number) => {
    if (position === 1) return 'text-karting-gold';
    if (position === 2) return 'text-gray-300';
    if (position === 3) return 'text-orange-400';
    return 'text-electric-blue';
  };

  const getMedalEmoji = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return null;
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
              setSelectedDriver(null);
            }}
          />
        </div>
      </div>

      {/* Race List */}
      {!selectedRace && (
        <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
          <h3 className="text-xl font-bold text-electric-blue mb-4">
            Carreras del {new Date(selectedDate).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
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
      {selectedRace && !selectedDriver && (
        <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-electric-blue mb-1">
                🏁 {selectedRace.sessionName}
              </h3>
              <p className="text-sm text-sky-blue/60">
                {selectedRace.displayDate} • {selectedRace.displayTime} • {selectedRace.totalDrivers} pilotos
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedRace(null);
                setSelectedDriver(null);
              }}
              className="text-electric-blue hover:text-cyan-400 font-bold"
            >
              ← Volver a carreras
            </button>
          </div>

          {loading && (
            <div className="text-center text-gray-400 py-8">Cargando resultados...</div>
          )}

          {!loading && raceResults.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-electric-blue/30">
                    <th className="text-left p-3 text-electric-blue">Pos</th>
                    <th className="text-left p-3 text-electric-blue">Piloto</th>
                    <th className="text-center p-3 text-electric-blue">Kart</th>
                    <th className="text-center p-3 text-electric-blue">Vueltas</th>
                    <th className="text-right p-3 text-electric-blue">Mejor Vuelta</th>
                    <th className="text-right p-3 text-electric-blue">Última Vuelta</th>
                    <th className="text-right p-3 text-electric-blue">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {raceResults.map((driver, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setSelectedDriver(driver)}
                      className="border-b border-sky-blue/10 hover:bg-electric-blue/10 cursor-pointer transition-all"
                    >
                      <td className="p-3">
                        <span className={`text-lg font-bold ${getPositionColor(driver.finalPosition)}`}>
                          {getMedalEmoji(driver.finalPosition) || `#${driver.finalPosition}`}
                        </span>
                      </td>
                      <td className="p-3 text-white font-semibold">{driver.driverName}</td>
                      <td className="p-3 text-center text-sky-blue">#{driver.kartNumber}</td>
                      <td className="p-3 text-center text-sky-blue">{driver.totalLaps}</td>
                      <td className="p-3 text-right font-mono text-electric-blue">
                        {formatTime(driver.bestTime)}
                      </td>
                      <td className="p-3 text-right font-mono text-sky-blue">
                        {formatTime(driver.lastTime)}
                      </td>
                      <td className="p-3 text-right font-mono text-gray-400">
                        {formatTime(driver.averageTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Driver Lap Details */}
      {selectedDriver && (
        <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-electric-blue mb-1">
                👤 {selectedDriver.driverName} - Análisis de Vueltas
              </h3>
              <p className="text-sm text-sky-blue/60">
                Posición: {selectedDriver.finalPosition} • Kart #{selectedDriver.kartNumber} • {selectedDriver.totalLaps} vueltas
              </p>
            </div>
            <button
              onClick={() => setSelectedDriver(null)}
              className="text-electric-blue hover:text-cyan-400 font-bold"
            >
              ← Volver a resultados
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-racing-black/40 border border-electric-blue/20 rounded-lg p-4">
              <div className="text-sm text-sky-blue/60 mb-1">Mejor Vuelta</div>
              <div className="text-2xl font-mono font-bold text-karting-gold">
                {formatTime(selectedDriver.bestTime)}
              </div>
            </div>
            <div className="bg-racing-black/40 border border-electric-blue/20 rounded-lg p-4">
              <div className="text-sm text-sky-blue/60 mb-1">Última Vuelta</div>
              <div className="text-2xl font-mono font-bold text-electric-blue">
                {formatTime(selectedDriver.lastTime)}
              </div>
            </div>
            <div className="bg-racing-black/40 border border-electric-blue/20 rounded-lg p-4">
              <div className="text-sm text-sky-blue/60 mb-1">Promedio</div>
              <div className="text-2xl font-mono font-bold text-gray-300">
                {formatTime(selectedDriver.averageTime)}
              </div>
            </div>
          </div>

          {selectedDriver.laps.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-electric-blue/30">
                    <th className="text-left p-3 text-electric-blue">Vuelta</th>
                    <th className="text-right p-3 text-electric-blue">Tiempo</th>
                    <th className="text-center p-3 text-electric-blue">Posición</th>
                    <th className="text-right p-3 text-electric-blue">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDriver.laps
                    .sort((a, b) => a.lapNumber - b.lapNumber)
                    .map((lap: Lap, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-sky-blue/10 ${
                          lap.isPersonalBest ? 'bg-karting-gold/10' : ''
                        }`}
                      >
                        <td className="p-3 text-white font-semibold">
                          Vuelta {lap.lapNumber}
                          {lap.isPersonalBest && <span className="ml-2 text-karting-gold">⭐</span>}
                        </td>
                        <td className={`p-3 text-right font-mono font-bold ${
                          lap.isPersonalBest ? 'text-karting-gold' : 'text-electric-blue'
                        }`}>
                          {formatTime(lap.time)}
                        </td>
                        <td className="p-3 text-center text-sky-blue">P{lap.finalPosition}</td>
                        <td className="p-3 text-right text-gray-400">{lap.gapToLeader || '-'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              No hay datos de vueltas individuales para este piloto
            </div>
          )}
        </div>
      )}
    </div>
  );
}
