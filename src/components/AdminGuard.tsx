'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const ADMIN_EMAIL = 'icabreraquezada@gmail.com';

export default function AdminGuard({ children, fallback }: AdminGuardProps) {
  const { user, token, isLoading } = useAuth();
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyAdminAccess() {
      if (!token || !user) {
        setIsVerifying(false);
        setError('Authentication required');
        return;
      }

      // Quick check - if email doesn't match, don't even call API
      if (user.email !== ADMIN_EMAIL) {
        setIsVerifying(false);
        setError('Access denied. Admin privileges required.');
        return;
      }

      try {
        const response = await fetch('/api/auth/check-admin', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (response.ok && data.isAdmin) {
          setIsAdminVerified(true);
          setError(null);
        } else {
          setIsAdminVerified(false);
          setError(data.error || 'Access denied');
        }
      } catch (err) {
        console.error('Admin verification failed:', err);
        setIsAdminVerified(false);
        setError('Failed to verify admin access');
      } finally {
        setIsVerifying(false);
      }
    }

    if (!isLoading) {
      verifyAdminAccess();
    }
  }, [token, user, isLoading]);

  // Show loading state
  if (isLoading || isVerifying) {
    return fallback || (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-electric-blue font-digital text-lg">VERIFICANDO ACCESO...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !isAdminVerified) {
    return fallback || (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-racing text-red-400 mb-4 tracking-wider">
            ACCESO DENEGADO
          </h1>
          
          <p className="text-sky-blue/80 font-digital text-sm mb-6">
            {error || 'No tienes permisos de administrador'}
          </p>
          
          {!user ? (
            <p className="text-sky-blue/60 font-digital text-xs mb-4">
              Debes iniciar sesión con una cuenta de administrador
            </p>
          ) : user.email !== ADMIN_EMAIL ? (
            <p className="text-sky-blue/60 font-digital text-xs mb-4">
              Cuenta actual: {user.email}
              <br />
              Se requiere cuenta de administrador
            </p>
          ) : null}
          
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-gradient-to-r from-electric-blue to-sky-blue text-midnight font-racing font-bold rounded hover:from-electric-blue/90 hover:to-sky-blue/90 transition-all"
          >
            VOLVER AL INICIO
          </button>
        </div>
      </div>
    );
  }

  // Show protected content
  return <>{children}</>;
}