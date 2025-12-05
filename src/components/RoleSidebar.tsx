'use client';

import { useAuth } from '@/hooks/useAuth';

export default function RoleSidebar() {
  const { user, isCoach, isOrganizer } = useAuth();

  // Don't render if no user or no special roles
  if (!user || (!isCoach && !isOrganizer && user.email !== 'icabreraquezada@gmail.com')) {
    return null;
  }

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2 pr-2">
      {/* Coach Button */}
      {isCoach && (
        <a
          href="/coach"
          className="group relative"
          title="Coach"
        >
          <div className="bg-gradient-to-l from-yellow-600 to-yellow-700 backdrop-blur-sm border-l-4 border-yellow-400 rounded-l-xl px-3 py-4 hover:px-5 transition-all duration-300 shadow-lg hover:shadow-yellow-500/50">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏎️</span>
              <span className="text-white font-racing text-sm uppercase tracking-wider transition-opacity duration-300 whitespace-nowrap">
                Coach
              </span>
            </div>
          </div>
        </a>
      )}

      {/* Organizador Button */}
      {isOrganizer && (
        <a
          href="/organizador"
          className="group relative"
          title="Organizador"
        >
          <div className="bg-gradient-to-l from-purple-600 to-purple-700 backdrop-blur-sm border-l-4 border-purple-400 rounded-l-xl px-3 py-4 hover:px-5 transition-all duration-300 shadow-lg hover:shadow-purple-500/50">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              <span className="text-white font-racing text-sm uppercase tracking-wider transition-opacity duration-300 whitespace-nowrap">
                Organizador
              </span>
            </div>
          </div>
        </a>
      )}

      {/* Admin Button */}
      {user.email === 'icabreraquezada@gmail.com' && (
        <a
          href="/admin"
          className="group relative"
          title="Admin"
        >
          <div className="bg-gradient-to-l from-red-600 to-red-700 backdrop-blur-sm border-l-4 border-red-400 rounded-l-xl px-3 py-4 hover:px-5 transition-all duration-300 shadow-lg hover:shadow-red-500/50">
            <div className="flex items-center gap-2">
              <span className="text-2xl">👑</span>
              <span className="text-white font-racing text-sm uppercase tracking-wider transition-opacity duration-300 whitespace-nowrap">
                Admin
              </span>
            </div>
          </div>
        </a>
      )}
    </div>
  );
}
