'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AdminGuard from '@/components/AdminGuard';

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuth();

  const adminPages = [
    {
      id: 'stats',
      name: 'Estadísticas del Sistema',
      icon: '📊',
      path: '/stats',
      description: 'Panel completo de métricas y estadísticas generales',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'organizers',
      name: 'Gestión de Organizadores',
      icon: '🎯',
      path: '/admin/organizers',
      description: 'Aprobar solicitudes y gestionar permisos de organizadores',
      color: 'from-yellow-500 to-amber-500',
      badge: 'NEW'
    },
    {
      id: 'linkage-requests',
      name: 'Solicitudes de Vinculación',
      icon: '🔗',
      path: '/admin/linkage-requests',
      description: 'Aprobar o rechazar vinculaciones de usuarios con corredores',
      color: 'from-orange-500 to-red-500'
    },
    {
      id: 'drivers',
      name: 'Gestión de Corredores',
      icon: '🏁',
      path: '/admin/drivers',
      description: 'Administrar corredores y vinculación de usuarios',
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'debug',
      name: 'Debug MongoDB',
      icon: '🔍',
      path: '/admin/debug',
      description: 'Revisar colecciones y datos de la base de datos',
      color: 'from-purple-500 to-pink-500'
    }
  ];

  return (
    <AdminGuard>
      <div className="min-h-screen bg-black text-white relative overflow-hidden">
        {/* Background Effects */}
        <div className="fixed inset-0 z-0">
          <div 
            className="absolute inset-0 opacity-20" 
            style={{
              backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(0, 212, 255, 0.1) 2px, transparent 2px)',
              backgroundSize: '100px 100px'
            }}
          />
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-400/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto p-8">
          {/* Header */}
          <header className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-2xl">👑</span>
              </div>
              <div className="text-left">
                <h1 className="font-bold text-5xl md:text-7xl tracking-wider bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                  ADMIN PANEL
                </h1>
                <p className="text-gray-400 text-lg">🛡️ {user?.email}</p>
              </div>
            </div>
            <p className="text-cyan-400 text-xl tracking-wide">SPEEDPARK ADMINISTRATION HUB</p>
          </header>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {adminPages.map((page) => (
              <div
                key={page.id}
                onClick={() => router.push(page.path)}
                className={`group relative bg-gradient-to-br ${page.color}/10 border-2 border-transparent hover:border-white/20 rounded-2xl p-8 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl`}
              >
                {/* Card Background Glow */}
                <div className={`absolute inset-0 bg-gradient-to-br ${page.color}/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                
                <div className="relative z-10 text-center">
                  {/* Icon */}
                  <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300 relative">
                    {page.icon}
                    {page.badge && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        {page.badge}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-2xl text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-cyan-400 transition-all duration-300">
                    {page.name}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                    {page.description}
                  </p>
                  
                  {/* Action Indicator */}
                  <div className="mt-6 flex items-center justify-center gap-2 text-cyan-400 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <span className="text-sm font-medium">ACCEDER</span>
                    <span className="text-lg">→</span>
                  </div>
                </div>

                {/* Hover Glow Effect */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${page.color}/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl -z-10`}></div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 rounded-lg hover:from-cyan-500/30 hover:to-blue-500/30 hover:border-cyan-400/50 transition-all duration-300 text-cyan-400 hover:text-white font-medium"
            >
              🏠 Mi Dashboard
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-400/30 rounded-lg hover:from-green-500/30 hover:to-emerald-500/30 hover:border-green-400/50 transition-all duration-300 text-green-400 hover:text-white font-medium"
            >
              🏁 Live Race
            </button>
          </div>

          {/* Footer */}
          <footer className="mt-16 text-center text-gray-500 text-sm">
            <p>⚡ SpeedPark Admin Panel v2.0 | Acceso exclusivo para administradores</p>
          </footer>
        </div>
      </div>
    </AdminGuard>
  );
}