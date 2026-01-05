'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

/**
 * Redirect to dashboard with userId parameter
 * This allows viewing a friend's full dashboard experience
 */
export default function UserProfileRedirect() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const userId = params?.userId as string;

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/');
      } else if (userId) {
        // Redirect to dashboard with userId parameter
        router.push(`/dashboard?userId=${userId}`);
      }
    }
  }, [userId, isAuthenticated, isLoading, router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-midnight via-racing-black to-midnight flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-electric-blue text-xl font-racing">Cargando perfil...</p>
      </div>
    </div>
  );
}
