'use client';

import React, { useState, useEffect } from 'react';

interface KartRecord {
  position: number;
  driverName: string;
  bestTime: number;
  sessionName: string;
  sessionDate: string;
}

interface KartRecordsResponse {
  success: boolean;
  kartNumber: number;
  filter: string;
  records: KartRecord[];
  totalRecords: number;
}

export default function KartRecordsSelector() {
  const [selectedKart, setSelectedKart] = useState<number>(18); // Default kart
  const [dayRecords, setDayRecords] = useState<KartRecord[]>([]);
  const [weekRecords, setWeekRecords] = useState<KartRecord[]>([]);
  const [monthRecords, setMonthRecords] = useState<KartRecord[]>([]);
  const [alltimeRecords, setAlltimeRecords] = useState<KartRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Available karts (1-22 for SpeedPark)
  const availableKarts = Array.from({ length: 22 }, (_, i) => i + 1);

  useEffect(() => {
    fetchAllRecords();
  }, [selectedKart]);

  const fetchAllRecords = async () => {
    setLoading(true);
    try {
      // Fetch all 4 filters in parallel
      const [day, week, month, alltime] = await Promise.all([
        fetch(`/api/kart-records?kartNumber=${selectedKart}&filter=day`).then(r => r.json()),
        fetch(`/api/kart-records?kartNumber=${selectedKart}&filter=week`).then(r => r.json()),
        fetch(`/api/kart-records?kartNumber=${selectedKart}&filter=month`).then(r => r.json()),
        fetch(`/api/kart-records?kartNumber=${selectedKart}&filter=alltime`).then(r => r.json()),
      ]);

      if (day.success) setDayRecords(day.records);
      if (week.success) setWeekRecords(week.records);
      if (month.success) setMonthRecords(month.records);
      if (alltime.success) setAlltimeRecords(alltime.records);

      console.log(`📊 Loaded records for Kart #${selectedKart}:`, {
        day: day.records?.length || 0,
        week: week.records?.length || 0,
        month: month.records?.length || 0,
        alltime: alltime.records?.length || 0
      });
    } catch (error) {
      console.error('Error fetching kart records:', error);
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

  const getMedalEmoji = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return null;
  };

  const renderRecordTable = (records: KartRecord[], title: string, subtitle: string) => (
    <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-electric-blue flex items-center gap-2">
          🏎️ {title}
        </h3>
        <p className="text-xs text-sky-blue/50 mt-1">{subtitle}</p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center text-gray-400 py-8">Cargando...</div>
      )}

      {/* No Data State */}
      {!loading && records.length === 0 && (
        <div className="text-center text-gray-400 py-8">
          No hay datos para este período
        </div>
      )}

      {/* Records List */}
      {!loading && records.length > 0 && (
        <div className="space-y-3">
          {records.slice(0, 10).map((entry) => (
            <div
              key={entry.position}
              className="bg-racing-black/40 border border-sky-blue/10 rounded-lg p-4 hover:border-electric-blue/30 transition-all"
            >
              <div className="flex items-center justify-between">
                {/* Left: Position + Driver */}
                <div className="flex items-center gap-3 flex-1">
                  <div className={`text-2xl font-bold ${
                    entry.position <= 3 ? '' : 'text-sky-blue/70'
                  }`}>
                    {getMedalEmoji(entry.position) || `#${entry.position}`}
                  </div>

                  <div className="flex-1">
                    <div className="font-bold text-white text-lg">
                      {entry.driverName}
                    </div>
                    <div className="text-xs text-sky-blue/60">
                      {entry.sessionName}
                    </div>
                  </div>
                </div>

                {/* Right: Time */}
                <div className="text-right">
                  <div className={`font-mono text-lg font-bold ${
                    entry.position === 1
                      ? 'text-karting-gold'
                      : entry.position === 2
                      ? 'text-gray-300'
                      : entry.position === 3
                      ? 'text-orange-400'
                      : 'text-electric-blue'
                  }`}>
                    {formatTime(entry.bestTime)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Kart Selector */}
      <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-electric-blue mb-2">
              📊 Récords por Kart
            </h2>
            <p className="text-sm text-sky-blue/60">
              Selecciona un kart para ver los mejores tiempos de corredores usando ese kart
            </p>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-white font-semibold">Kart:</label>
            <select
              value={selectedKart}
              onChange={(e) => setSelectedKart(parseInt(e.target.value))}
              className="bg-racing-black border-2 border-electric-blue/30 text-white px-6 py-3 rounded-lg font-bold text-lg hover:border-electric-blue transition-all focus:outline-none focus:ring-2 focus:ring-electric-blue"
            >
              {availableKarts.map(kart => (
                <option key={kart} value={kart}>
                  #{kart.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4 Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderRecordTable(dayRecords, `Top 10 - Kart #${selectedKart} (Hoy)`, 'Mejores tiempos del día')}
        {renderRecordTable(weekRecords, `Top 10 - Kart #${selectedKart} (Semana)`, 'Últimos 7 días')}
        {renderRecordTable(monthRecords, `Top 10 - Kart #${selectedKart} (Mes)`, 'Últimos 30 días')}
        {renderRecordTable(alltimeRecords, `Top 10 - Kart #${selectedKart} (Histórico)`, 'Todos los tiempos')}
      </div>
    </div>
  );
}
