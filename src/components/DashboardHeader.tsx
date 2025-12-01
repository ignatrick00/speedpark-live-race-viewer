'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Squadron {
  _id: string;
  name: string;
  logo?: string;
  colors: {
    primary: string;
    secondary: string;
  };
  division: string;
  totalPoints: number;
  ranking: number;
}

export default function DashboardHeader() {
  const { user, token, logout } = useAuth();
  const pathname = usePathname();
  const [userSquadron, setUserSquadron] = useState<Squadron | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadUserSquadron();
    }
  }, [user]);

  const loadUserSquadron = async () => {
    try {
      const response = await fetch(`/api/squadrons?userId=${user?.id}`);
      const data = await response.json();

      if (data.success && data.userSquadron) {
        setUserSquadron(data.userSquadron);
      }
    } catch (error) {
      console.error('Error loading user squadron:', error);
    } finally {
      setLoading(false);
    }
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  const navItems = [
    {
      label: '📊 Dashboard',
      path: '/dashboard',
      show: true
    },
    {
      label: '🏁 Live Race',
      path: '/',
      show: true
    },
    {
      label: '🏆 Rankings',
      path: '/rankings',
      show: true
    },
    {
      label: userSquadron ? '⚡ Mi Equipo' : '➕ Unirse a Equipo',
      path: userSquadron ? `/squadrons/${userSquadron._id}` : '/squadrons',
      show: true,
      highlight: !userSquadron
    },
    {
      label: '🎯 Campeonatos',
      path: '/championships',
      show: true
    },
    {
      label: '👥 Carreras Amistosas',
      path: '/friendly-races',
      show: true
    }
  ];

  return (
    <header className="sticky top-0 z-50 bg-midnight/95 backdrop-blur-md border-b border-electric-blue/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & User Info */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="text-2xl">🏁</div>
              <div className="hidden md:block">
                <div className="font-bold text-electric-blue text-sm">KARTEANDO.CL</div>
                <div className="text-xs text-sky-blue/60">
                  {user?.profile?.alias || user?.profile?.firstName}
                </div>
              </div>
            </Link>

            {/* Squadron Badge */}
            {userSquadron && (
              <Link
                href={`/squadrons/${userSquadron._id}`}
                className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-electric-blue/30 bg-electric-blue/10 hover:bg-electric-blue/20 transition-all"
                style={{
                  borderColor: userSquadron.colors.primary + '40',
                  backgroundColor: userSquadron.colors.primary + '15'
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: userSquadron.colors.primary }}
                />
                <span className="text-xs font-medium text-white">
                  {userSquadron.name}
                </span>
                <span className="text-xs text-sky-blue/60">
                  #{userSquadron.ranking || '—'}
                </span>
              </Link>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.filter(item => item.show).map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${isActive(item.path)
                    ? 'bg-electric-blue text-dark-bg'
                    : item.highlight
                    ? 'bg-karting-gold/20 text-karting-gold border border-karting-gold/30 hover:bg-karting-gold/30'
                    : 'text-sky-blue hover:bg-electric-blue/10 hover:text-electric-blue'
                  }
                `}
              >
                {item.label}
              </Link>
            ))}

            {/* Logout Button */}
            <button
              onClick={logout}
              className="ml-2 px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
            >
              🚪 Salir
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 rounded-lg text-electric-blue hover:bg-electric-blue/10"
          >
            {showMobileMenu ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Navigation */}
        {showMobileMenu && (
          <div className="md:hidden py-4 border-t border-electric-blue/20">
            <nav className="flex flex-col gap-2">
              {/* Squadron Badge Mobile */}
              {userSquadron && (
                <Link
                  href={`/squadrons/${userSquadron._id}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-electric-blue/30 bg-electric-blue/10"
                  style={{
                    borderColor: userSquadron.colors.primary + '40',
                    backgroundColor: userSquadron.colors.primary + '15'
                  }}
                  onClick={() => setShowMobileMenu(false)}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: userSquadron.colors.primary }}
                  />
                  <span className="text-sm font-medium text-white flex-1">
                    {userSquadron.name}
                  </span>
                  <span className="text-xs text-sky-blue/60">
                    Ranking #{userSquadron.ranking || '—'}
                  </span>
                </Link>
              )}

              {navItems.filter(item => item.show).map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setShowMobileMenu(false)}
                  className={`
                    px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${isActive(item.path)
                      ? 'bg-electric-blue text-dark-bg'
                      : item.highlight
                      ? 'bg-karting-gold/20 text-karting-gold border border-karting-gold/30'
                      : 'text-sky-blue hover:bg-electric-blue/10'
                    }
                  `}
                >
                  {item.label}
                </Link>
              ))}

              <button
                onClick={() => {
                  logout();
                  setShowMobileMenu(false);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 text-left"
              >
                🚪 Salir
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
