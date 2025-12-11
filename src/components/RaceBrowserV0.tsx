'use client';

import React, { useState, useEffect } from 'react';
import DatePicker from './DatePicker';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';

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
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // YYYY-MM-DD local time
  });
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [raceResults, setRaceResults] = useState<DriverResult[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [highlightedDriver, setHighlightedDriver] = useState<string | null>(null);
  const [highlightedDriverTimes, setHighlightedDriverTimes] = useState<string | null>(null);

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
        setRaceResults(data.race.drivers);
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

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52BE80',
    '#EC7063', '#AF7AC5', '#5DADE2', '#48C9B0', '#F4D03F',
    '#EB984E', '#A569BD', '#5499C7', '#45B39D', '#F5B041',
    '#DC7633', '#9B59B6', '#3498DB', '#1ABC9C', '#F39C12',
    '#E74C3C', '#8E44AD', '#2980B9', '#16A085', '#D68910'
  ];

  // Prepare position chart data
  const preparePositionChartData = () => {
    if (raceResults.length === 0) return [];

    const maxLaps = Math.max(...raceResults.map(d => d.laps?.length || 0));
    const chartData: any[] = [];

    for (let lapNum = 1; lapNum <= maxLaps; lapNum++) {
      const lapData: any = { lap: lapNum };

      raceResults.forEach((driver: any) => {
        const lap = driver.laps?.find((l: any) => l.lapNumber === lapNum);
        if (lap) {
          lapData[driver.driverName] = lap.finalPosition || lap.position;
        }
      });

      chartData.push(lapData);
    }

    return chartData;
  };

  // Prepare lap times chart data
  const prepareLapTimesChartData = () => {
    if (raceResults.length === 0) return [];

    const maxLaps = Math.max(...raceResults.map(d => d.laps?.length || 0));
    const chartData: any[] = [];

    for (let lapNum = 1; lapNum <= maxLaps; lapNum++) {
      const lapData: any = { lap: lapNum };

      raceResults.forEach((driver: any) => {
        const lap = driver.laps?.find((l: any) => l.lapNumber === lapNum);
        if (lap && lap.time > 0) {
          lapData[driver.driverName] = lap.time / 1000;
        }
      });

      chartData.push(lapData);
    }

    return chartData;
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
            <>
              <div className="overflow-x-auto mb-8">
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

              {/* Position Evolution Chart */}
              <div className="mt-8 mb-8">
                <h4 className="text-lg font-bold text-electric-blue mb-4">📊 Evolución de Posiciones por Vuelta</h4>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={preparePositionChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0ea5e9" opacity={0.1} />
                    <XAxis
                      dataKey="lap"
                      stroke="#0ea5e9"
                      label={{ value: 'Vuelta', position: 'insideBottom', offset: -5, fill: '#0ea5e9' }}
                    />
                    <YAxis
                      stroke="#0ea5e9"
                      label={{ value: 'Posición', angle: -90, position: 'insideLeft', fill: '#0ea5e9' }}
                      domain={[1, 'auto']}
                      ticks={Array.from({ length: raceResults.length }, (_, i) => i + 1)}
                    />
                    <Legend
                      iconType="line"
                      onClick={(e: any) => {
                        if (highlightedDriver === e.dataKey) {
                          setHighlightedDriver(null);
                        } else {
                          setHighlightedDriver(e.dataKey);
                        }
                      }}
                      wrapperStyle={{
                        paddingTop: '20px',
                        cursor: 'pointer'
                      }}
                      formatter={(value: string) => {
                        const isSelected = highlightedDriver === value;
                        return (
                          <span style={{
                            fontWeight: isSelected ? 'bold' : 'normal',
                            fontSize: isSelected ? '1.1em' : '1em',
                            color: isSelected ? '#fff' : '#9ca3af',
                            textDecoration: isSelected ? 'underline' : 'none'
                          }}>
                            {value}
                          </span>
                        );
                      }}
                    />
                    {raceResults.map((driver: any, idx: number) => {
                      const isHighlighted = highlightedDriver === null || highlightedDriver === driver.driverName;
                      const opacity = isHighlighted ? 1 : 0.2;
                      const strokeWidth = isHighlighted && highlightedDriver === driver.driverName ? 4 : 2.5;

                      return (
                        <Line
                          key={driver.driverName}
                          type="monotone"
                          dataKey={driver.driverName}
                          stroke={colors[idx % colors.length]}
                          strokeWidth={strokeWidth}
                          strokeOpacity={opacity}
                          dot={{
                            r: isHighlighted && highlightedDriver === driver.driverName ? 5 : 4,
                            strokeWidth: 2,
                            fill: colors[idx % colors.length],
                            fillOpacity: opacity,
                            cursor: 'pointer',
                            onClick: () => {
                              if (highlightedDriver === driver.driverName) {
                                setHighlightedDriver(null);
                              } else {
                                setHighlightedDriver(driver.driverName);
                              }
                            }
                          }}
                          activeDot={false}
                          connectNulls={true}
                          onClick={() => {
                            if (highlightedDriver === driver.driverName) {
                              setHighlightedDriver(null);
                            } else {
                              setHighlightedDriver(driver.driverName);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Lap Times Evolution Chart */}
              <div className="mt-8">
                <h4 className="text-lg font-bold text-electric-blue mb-4">⏱️ Evolución de Tiempos por Vuelta</h4>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={prepareLapTimesChartData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0ea5e9" opacity={0.1} />
                    <XAxis
                      dataKey="lap"
                      stroke="#0ea5e9"
                      label={{ value: 'Vuelta', position: 'insideBottom', offset: -5, fill: '#0ea5e9' }}
                    />
                    <YAxis
                      stroke="#0ea5e9"
                      label={{ value: 'Tiempo (segundos)', angle: -90, position: 'insideLeft', fill: '#0ea5e9' }}
                      domain={['auto', 'auto']}
                      tickFormatter={(value) => value.toFixed(1)}
                    />
                    <Legend
                      iconType="line"
                      onClick={(e: any) => {
                        if (highlightedDriverTimes === e.dataKey) {
                          setHighlightedDriverTimes(null);
                        } else {
                          setHighlightedDriverTimes(e.dataKey);
                        }
                      }}
                      wrapperStyle={{
                        paddingTop: '20px',
                        cursor: 'pointer'
                      }}
                      formatter={(value: string) => {
                        const isSelected = highlightedDriverTimes === value;
                        return (
                          <span style={{
                            fontWeight: isSelected ? 'bold' : 'normal',
                            fontSize: isSelected ? '1.1em' : '1em',
                            color: isSelected ? '#fff' : '#9ca3af',
                            textDecoration: isSelected ? 'underline' : 'none'
                          }}>
                            {value}
                          </span>
                        );
                      }}
                    />
                    {raceResults.map((driver: any, idx: number) => {
                      const isHighlighted = highlightedDriverTimes === null || highlightedDriverTimes === driver.driverName;
                      const opacity = isHighlighted ? 1 : 0.2;
                      const strokeWidth = isHighlighted && highlightedDriverTimes === driver.driverName ? 4 : 2.5;

                      return (
                        <Line
                          key={driver.driverName}
                          type="monotone"
                          dataKey={driver.driverName}
                          stroke={colors[idx % colors.length]}
                          strokeWidth={strokeWidth}
                          strokeOpacity={opacity}
                          dot={{
                            r: isHighlighted && highlightedDriverTimes === driver.driverName ? 5 : 4,
                            strokeWidth: 2,
                            fill: colors[idx % colors.length],
                            fillOpacity: opacity,
                            cursor: 'pointer',
                            onClick: () => {
                              if (highlightedDriverTimes === driver.driverName) {
                                setHighlightedDriverTimes(null);
                              } else {
                                setHighlightedDriverTimes(driver.driverName);
                              }
                            }
                          }}
                          activeDot={false}
                          connectNulls={true}
                          onClick={() => {
                            if (highlightedDriverTimes === driver.driverName) {
                              setHighlightedDriverTimes(null);
                            } else {
                              setHighlightedDriverTimes(driver.driverName);
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
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
