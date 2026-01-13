'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface AdminNavbarProps {
  currentPage?: string;
}

export default function AdminNavbar({ currentPage }: AdminNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  // Solo mostrar si es admin
  if (!user || user.email !== 'icabreraquezada@gmail.com') {
    return null;
  }

  const adminPages = [
    {
      id: 'analytics',
      name: 'Analytics',
      icon: '📈',
      path: '/admin/analytics',
      description: 'Monitoreo en tiempo real y actividad de usuarios'
    },
    {
      id: 'drivers',
      name: 'Corredores',
      icon: '🏁',
      path: '/admin/drivers',
      description: 'Gestión de corredores y vinculación'
    },
    {
      id: 'debug',
      name: 'Debug MongoDB',
      icon: '🔍',
      path: '/admin/debug',
      description: 'Revisar colecciones de base de datos'
    },
    {
      id: 'stats',
      name: 'Estadísticas',
      icon: '📊',
      path: '/stats',
      description: 'Estadísticas generales del sistema'
    }
  ];

  const isActivePage = (path: string) => pathname === path;

  return (
    <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Admin Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">👑</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Panel de Administración</h2>
              <p className="text-gray-400 text-sm">🛡️ Admin: {user.email}</p>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-3 py-2 text-cyan-400 hover:text-white transition-colors text-sm border border-cyan-400/30 rounded-lg hover:bg-cyan-400/10"
            >
              🏠 Dashboard
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-3 py-2 text-green-400 hover:text-white transition-colors text-sm border border-green-400/30 rounded-lg hover:bg-green-400/10"
            >
              🏁 Live Race
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex flex-wrap gap-2">
          {adminPages.map((page) => (
            <button
              key={page.id}
              onClick={() => router.push(page.path)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                isActivePage(page.path)
                  ? 'bg-gradient-to-r from-electric-blue/20 to-rb-blue/20 border border-electric-blue/50 text-electric-blue'
                  : 'bg-gray-700/50 border border-gray-600/50 text-gray-300 hover:bg-gray-600/50 hover:text-white hover:border-gray-500'
              }`}
              title={page.description}
            >
              <span className="text-base">{page.icon}</span>
              <span>{page.name}</span>
              
              {isActivePage(page.path) && (
                <div className="w-2 h-2 bg-electric-blue rounded-full animate-pulse ml-1"></div>
              )}
            </button>
          ))}
        </nav>

        {/* Current Page Indicator */}
        {currentPage && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-gray-400 text-sm">
              📍 <strong className="text-white">{currentPage}</strong>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}