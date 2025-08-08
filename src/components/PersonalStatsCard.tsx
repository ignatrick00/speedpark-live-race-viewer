'use client';

import React from 'react';
import { PersonalStats } from '@/app/dashboard/page';

interface PersonalStatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  color?: 'blue' | 'gold' | 'green' | 'purple' | 'cyan';
}

const colorClasses = {
  blue: {
    bg: 'from-electric-blue/10 to-rb-blue/10',
    border: 'border-electric-blue/30',
    text: 'text-electric-blue',
    subtitle: 'text-sky-blue/70'
  },
  gold: {
    bg: 'from-karting-gold/10 to-electric-blue/10', 
    border: 'border-karting-gold/30',
    text: 'text-karting-gold',
    subtitle: 'text-sky-blue/70'
  },
  green: {
    bg: 'from-green-500/10 to-electric-blue/10',
    border: 'border-green-500/30', 
    text: 'text-green-400',
    subtitle: 'text-sky-blue/70'
  },
  purple: {
    bg: 'from-purple-500/10 to-rb-blue/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400', 
    subtitle: 'text-sky-blue/70'
  },
  cyan: {
    bg: 'from-sky-blue/10 to-electric-blue/10',
    border: 'border-sky-blue/30',
    text: 'text-sky-blue',
    subtitle: 'text-sky-blue/70'
  }
};

export default function PersonalStatsCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color = 'blue' 
}: PersonalStatsCardProps) {
  const colors = colorClasses[color];
  
  return (
    <div className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-lg p-4 text-center hover:border-opacity-50 transition-all duration-300`}>
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`${colors.text} font-bold text-2xl mb-1`}>{value}</div>
      <div className="text-xs font-medium mb-1 uppercase tracking-wider">{title}</div>
      <div className={`${colors.subtitle} text-xs`}>{subtitle}</div>
    </div>
  );
}