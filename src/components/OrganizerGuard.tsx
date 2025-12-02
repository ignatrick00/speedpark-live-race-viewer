'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface OrganizerGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function OrganizerGuard({ children, fallback }: OrganizerGuardProps) {
  const { user, token, isLoading, isOrganizer } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyOrganizerAccess() {
      if (!token || !user) {
        setIsVerifying(false);
        setError('Autenticación requerida');
        return;
      }

      // Verificar si tiene permisos de organizador
      if (isOrganizer) {
        setError(null);
      } else {
        setError('Acceso denegado - Se requieren permisos de organizador');
      }
      setIsVerifying(false);
    }

    if (!isLoading) {
      verifyOrganizerAccess();
    }
  }, [token, user, isLoading, isOrganizer]);

  // Loading state
  if (isLoading || isVerifying) {
    return fallback || (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-400 font-bold text-lg">VERIFICANDO ACCESO...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !isOrganizer) {
    return fallback || (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-red-400 mb-4 tracking-wider">
            ACCESO DENEGADO
          </h1>

          <p className="text-gray-400 text-sm mb-6">
            {error || 'No tienes permisos de organizador'}
          </p>

          {!user ? (
            <p className="text-gray-500 text-xs mb-4">
              Debes iniciar sesión con una cuenta de organizador
            </p>
          ) : (
            <p className="text-gray-500 text-xs mb-4">
              Cuenta actual: {user.email}
              <br />
              Se requiere cuenta de organizador aprobada
            </p>
          )}

          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            VOLVER AL INICIO
          </button>
        </div>
      </div>
    );
  }

  // Protected content
  return <>{children}</>;
}
