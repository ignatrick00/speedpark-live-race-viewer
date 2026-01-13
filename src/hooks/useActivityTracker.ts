'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './useAuth';

// Generate or retrieve session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem('analytics-session-id');

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('analytics-session-id', sessionId);
  }

  return sessionId;
}

/**
 * Hook to automatically track user activity
 * - Tracks page views on route change
 * - Sends heartbeat every 60 seconds
 * - Tracks login/logout events
 */
export function useActivityTracker() {
  const pathname = usePathname();
  const { token, isAuthenticated } = useAuth();
  const lastTrackedPath = useRef<string>('');
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  // Track page view
  const trackPageView = async (page: string) => {
    if (!page || page === lastTrackedPath.current) return;

    lastTrackedPath.current = page;
    const sessionId = getSessionId();

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      await fetch('/api/analytics/track', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
          page,
          action: 'page_view',
          metadata: {
            referrer: document.referrer || 'direct',
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight
          }
        })
      });
    } catch (error) {
      // Fail silently - don't disrupt user experience
      console.debug('Analytics tracking error:', error);
    }
  };

  // Track heartbeat (user still active)
  const trackHeartbeat = async () => {
    const sessionId = getSessionId();

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      await fetch('/api/analytics/track', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
          page: pathname || '/',
          action: 'heartbeat',
          metadata: {
            timestamp: new Date().toISOString()
          }
        })
      });
    } catch (error) {
      console.debug('Heartbeat tracking error:', error);
    }
  };

  // Track page views on route change
  useEffect(() => {
    if (pathname) {
      trackPageView(pathname);
    }
  }, [pathname]);

  // Setup heartbeat interval
  useEffect(() => {
    // Clear existing interval
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }

    // Send heartbeat every 60 seconds
    heartbeatInterval.current = setInterval(() => {
      trackHeartbeat();
    }, 60000);

    // Cleanup on unmount
    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }
    };
  }, [pathname, token]);

  // Track authentication changes
  useEffect(() => {
    const sessionId = getSessionId();

    if (isAuthenticated && token) {
      // Track login event
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionId,
          page: pathname || '/',
          action: 'login',
          metadata: {
            timestamp: new Date().toISOString()
          }
        })
      }).catch(() => {});
    }
  }, [isAuthenticated]);
}
