'use client';

import React from 'react';

interface MonthlyData {
  month: string;
  races: number;
  bestTime: number;
  position: number;
}

interface ProgressChartProps {
  monthlyData: MonthlyData[];
}

function formatTime(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = ((milliseconds % 60000) / 1000).toFixed(1);
  return `${minutes}:${seconds.padStart(4, '0')}`;
}

function getBarHeight(value: number, max: number): number {
  return Math.max((value / max) * 100, 5); // Minimum 5% height for visibility
}

function getPositionColor(position: number): string {
  if (position <= 3) return 'bg-karting-gold';
  if (position <= 5) return 'bg-electric-blue';
  if (position <= 8) return 'bg-sky-blue';
  return 'bg-rb-blue';
}

export default function ProgressChart({ monthlyData }: ProgressChartProps) {
  const maxRaces = Math.max(...monthlyData.map(d => d.races), 1);
  const bestOverallTime = Math.min(...monthlyData.map(d => d.bestTime));
  const worstOverallTime = Math.max(...monthlyData.map(d => d.bestTime));
  
  return (
    <div className="bg-midnight/60 border border-electric-blue/20 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-2xl">📈</span>
        <h3 className="font-bold text-2xl text-electric-blue">PROGRESO MENSUAL</h3>
      </div>
      
      <div className="grid grid-cols-6 gap-4">
        {monthlyData.map((month, index) => {
          const timePercent = worstOverallTime - bestOverallTime > 0 
            ? ((worstOverallTime - month.bestTime) / (worstOverallTime - bestOverallTime)) * 100 
            : 50;
          
          return (
            <div key={month.month} className="text-center">
              {/* Races Bar Chart */}
              <div className="h-20 flex items-end mb-2">
                <div className="w-full relative">
                  <div 
                    className="bg-electric-blue/30 w-full rounded-t transition-all duration-500 relative overflow-hidden"
                    style={{ height: `${getBarHeight(month.races, maxRaces)}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-electric-blue/60 to-electric-blue/20 rounded-t"></div>
                  </div>
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-electric-blue text-xs font-bold">
                    {month.races}
                  </div>
                </div>
              </div>
              
              {/* Month Label */}
              <div className="text-sky-blue text-sm font-bold mb-2">
                {month.month}
              </div>
              
              {/* Best Time */}
              <div className="text-karting-gold text-xs mb-1 font-medium">
                {formatTime(month.bestTime)}
              </div>
              
              {/* Position Indicator */}
              <div className="flex justify-center">
                <div className={`w-3 h-3 rounded-full ${getPositionColor(month.position)}`} 
                     title={`Posición promedio: #${month.position}`}>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-electric-blue/20">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="text-sky-blue/70">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-electric-blue rounded"></div>
              <span>Carreras por mes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-karting-gold rounded"></div>
              <span>Mejor tiempo</span>
            </div>
          </div>
          <div className="text-sky-blue/70">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-karting-gold rounded-full"></div>
              <span>Posición 1-3</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-rb-blue rounded-full"></div>
              <span>Posición 8+</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}