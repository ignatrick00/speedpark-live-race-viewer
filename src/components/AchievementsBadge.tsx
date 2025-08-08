'use client';

import React from 'react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  category: 'races' | 'time' | 'position' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface AchievementsBadgeProps {
  totalRaces: number;
  bestTime: number;
  bestPosition: number;
  podiumFinishes: number;
  totalSpent: number;
}

function generateAchievements(props: AchievementsBadgeProps): Achievement[] {
  const { totalRaces, bestTime, bestPosition, podiumFinishes, totalSpent } = props;
  
  const achievements: Achievement[] = [
    {
      id: 'first_race',
      title: 'Primera Vuelta',
      description: 'Completa tu primera carrera',
      icon: '🏁',
      earned: totalRaces >= 1,
      category: 'races',
      rarity: 'common'
    },
    {
      id: 'speed_demon',
      title: 'Demonio de Velocidad',
      description: 'Tiempo menor a 45 segundos',
      icon: '⚡',
      earned: bestTime < 45000,
      category: 'time',
      rarity: 'rare'
    },
    {
      id: 'podium_hunter',
      title: 'Cazador de Podios',
      description: '3 o más podios',
      icon: '🏆',
      earned: podiumFinishes >= 3,
      category: 'position',
      rarity: 'epic'
    },
    {
      id: 'champion',
      title: 'Campeón',
      description: 'Primer lugar en una carrera',
      icon: '👑',
      earned: bestPosition === 1,
      category: 'position',
      rarity: 'legendary'
    },
    {
      id: 'veteran',
      title: 'Piloto Veterano',
      description: '20 o más carreras',
      icon: '🎯',
      earned: totalRaces >= 20,
      category: 'races',
      rarity: 'epic'
    },
    {
      id: 'big_spender',
      title: 'Gran Inversor',
      description: 'Más de $300.000 gastados',
      icon: '💎',
      earned: totalSpent > 300000,
      category: 'special',
      rarity: 'rare'
    }
  ];
  
  return achievements;
}

function getRarityColor(rarity: Achievement['rarity']): string {
  switch (rarity) {
    case 'common': return 'border-gray-400 text-gray-300';
    case 'rare': return 'border-electric-blue text-electric-blue';
    case 'epic': return 'border-karting-gold text-karting-gold';
    case 'legendary': return 'border-purple-400 text-purple-400';
  }
}

function getRarityBg(rarity: Achievement['rarity']): string {
  switch (rarity) {
    case 'common': return 'from-gray-500/10 to-gray-500/5';
    case 'rare': return 'from-electric-blue/10 to-electric-blue/5';
    case 'epic': return 'from-karting-gold/10 to-karting-gold/5';
    case 'legendary': return 'from-purple-400/10 to-purple-400/5';
  }
}

export default function AchievementsBadge(props: AchievementsBadgeProps) {
  const achievements = generateAchievements(props);
  const earnedCount = achievements.filter(a => a.earned).length;
  
  return (
    <div className="bg-midnight/60 border border-electric-blue/20 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏅</span>
          <h3 className="font-bold text-xl text-electric-blue">LOGROS</h3>
        </div>
        <div className="text-sky-blue text-sm font-medium">
          {earnedCount}/{achievements.length}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`
              relative p-3 rounded-md border transition-all duration-300 
              ${achievement.earned 
                ? `bg-gradient-to-br ${getRarityBg(achievement.rarity)} ${getRarityColor(achievement.rarity)} hover:scale-105` 
                : 'bg-gray-500/10 border-gray-600 text-gray-500 opacity-50'
              }
            `}
            title={achievement.description}
          >
            <div className="text-center">
              <div className="text-2xl mb-1 grayscale-0">
                {achievement.icon}
              </div>
              <div className="text-xs font-bold mb-1">
                {achievement.title}
              </div>
              <div className="text-xs opacity-80 leading-tight">
                {achievement.description}
              </div>
              
              {achievement.earned && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Progress Bar */}
      <div className="mt-4 pt-4 border-t border-electric-blue/20">
        <div className="flex justify-between text-xs text-sky-blue/70 mb-2">
          <span>Progreso de Logros</span>
          <span>{Math.round((earnedCount / achievements.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-600/20 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-electric-blue to-karting-gold h-2 rounded-full transition-all duration-500"
            style={{ width: `${(earnedCount / achievements.length) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}