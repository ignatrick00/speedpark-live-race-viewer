'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RaceData {
  date: Date;
  bestTime: number;
  sessionName: string;
}

interface ProgressChartProps {
  races: RaceData[];
}

function formatTime(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = ((milliseconds % 60000) / 1000).toFixed(3);
  return `${minutes}:${seconds.padStart(6, '0')}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

export default function ProgressChart({ races }: ProgressChartProps) {
  console.log('📊 [ProgressChart] All races received:', races.map(r => ({
    sessionName: r.sessionName,
    bestTime: r.bestTime,
    date: r.date
  })));

  // Get last 6 months of data (show ALL races, not filtered by type)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const recentRaces = races
    .filter(race => new Date(race.date) >= sixMonthsAgo)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  console.log('📊 [ProgressChart] Recent races (last 6 months):', recentRaces.length);

  if (recentRaces.length === 0) {
    return (
      <div className="bg-midnight/60 border border-electric-blue/20 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-2xl">📈</span>
          <h3 className="font-bold text-2xl text-electric-blue">PROGRESO MENSUAL</h3>
        </div>
        <div className="text-center py-8 text-sky-blue/60">
          <p>No hay datos de carreras o clasificaciones en los últimos 6 meses</p>
        </div>
      </div>
    );
  }

  // Format session name helper
  function formatSessionName(name: string): string {
    // Remove [HEAT] and any other brackets
    let formatted = name.replace(/\[HEAT\]/gi, '').replace(/\[.*?\]/g, '').trim();

    // Extract number and type
    const match = formatted.match(/(\d+)\s*-\s*(.+)/);
    if (match) {
      const number = match[1];
      const type = match[2].toLowerCase().trim();

      // Determine if it's Clasificación or Carrera
      if (type.includes('clasificaci') || type.includes('premium')) {
        return `Clasificación #${number}`;
      } else if (type.includes('carrera')) {
        return `Carrera #${number}`;
      } else {
        return `Sesión #${number}`;
      }
    }

    return formatted;
  }

  // Prepare data for Recharts with formatted session names
  const chartData = recentRaces.map((race, index) => ({
    index: index + 1,
    date: formatDate(new Date(race.date)),
    label: `${formatDate(new Date(race.date))}\n${formatSessionName(race.sessionName)}`,
    bestTime: race.bestTime,
    sessionName: race.sessionName,
    formattedSessionName: formatSessionName(race.sessionName)
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-midnight/95 border border-electric-blue/40 p-3 rounded-lg shadow-lg">
          <p className="text-white font-medium">{data.date}</p>
          <p className="text-sky-blue text-sm">{data.formattedSessionName}</p>
          <p className="text-karting-gold font-bold">Tiempo: {formatTime(data.bestTime)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-midnight/60 border border-electric-blue/20 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">📈</span>
        <h3 className="font-bold text-2xl text-electric-blue">PROGRESO MENSUAL</h3>
        <span className="text-sky-blue/60 text-sm ml-auto">Últimos 6 meses</span>
      </div>

      {/* Chart Container */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 212, 255, 0.1)" />
          <XAxis
            dataKey="label"
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={100}
            interval={0}
          />
          <YAxis
            stroke="#9CA3AF"
            tickFormatter={formatTime}
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            label={{ value: 'Tiempo', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#9CA3AF' } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="bestTime"
            stroke="#FFD700"
            strokeWidth={3}
            dot={{ fill: '#FFD700', strokeWidth: 2, r: 5, stroke: '#00d4ff' }}
            activeDot={{ r: 7, fill: '#FFD700', stroke: '#00d4ff', strokeWidth: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-electric-blue/20">
        <div className="flex items-center justify-center gap-6 text-xs text-sky-blue/70">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-karting-gold rounded-full"></div>
            <span>Mejor tiempo por sesión</span>
          </div>
        </div>
        <div className="text-center mt-2 text-xs text-sky-blue/60">
          Mostrando {recentRaces.length} sesiones
        </div>
      </div>
    </div>
  );
}
