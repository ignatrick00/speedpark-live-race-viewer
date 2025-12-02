'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  role?: 'user' | 'organizer' | 'admin';
  profile: {
    firstName: string;
    lastName: string;
    alias?: string;
    fullName?: string;
  };
  squadron?: {
    squadronId: string;
    role: 'captain' | 'member';
    joinedAt: Date;
  };
  kartingLink: {
    personId?: string;
    linkedAt?: Date;
    status: 'pending_first_race' | 'linked' | 'verification_failed';
    speedParkProfile?: any;
  };
  accountStatus: 'active' | 'suspended' | 'deleted';
  createdAt: Date;
  lastLoginAt?: Date;
}

interface UserStats {
  totalRaces: number;
  totalRevenue: number;
  bestTime: number;
  averageTime: number;
  totalLaps: number;
  firstPlaces: number;
  secondPlaces: number;
  thirdPlaces: number;
  podiumFinishes: number;
  firstRaceAt?: Date;
  lastRaceAt?: Date;
  racesThisMonth: number;
  racesToday: number;
  recentSessions: Array<{
    sessionId: string;
    sessionName: string;
    position: number;
    bestTime: number;
    timestamp: Date;
    revenue: number;
  }>;
  monthlyStats: Array<{
    year: number;
    month: number;
    races: number;
    revenue: number;
    bestTime: number;
    podiums: number;
  }>;
}

interface AuthContextType {
  user: User | null;
  stats: UserStats | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOrganizer: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  register: (email: string, password: string, firstName: string, lastName: string, alias?: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('auth-token');
        if (storedToken) {
          setToken(storedToken);
          await fetchUserData(storedToken);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('auth-token');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Fetch user data with token
  const fetchUserData = async (authToken: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setStats(data.stats);
      } else {
        throw new Error('Invalid token');
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      localStorage.removeItem('auth-token');
      setToken(null);
      setUser(null);
      setStats(null);
      throw error;
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setToken(data.token);
        setUser(data.user);
        setStats(null); // Will be loaded if user is linked
        localStorage.setItem('auth-token', data.token);
        
        return { 
          success: true, 
          message: data.note || 'Login successful' 
        };
      } else {
        return { 
          success: false, 
          error: data.error || 'Error de inicio de sesión' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: 'Error de red durante el inicio de sesión' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (email: string, password: string, firstName: string, lastName: string, alias?: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password, 
          firstName, 
          lastName, 
          alias: alias || undefined 
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Check if email verification is required
        if (data.requiresEmailVerification) {
          // Don't set token or user if email verification is required
          return {
            success: true,
            requiresEmailVerification: true,
            message: data.message || 'Cuenta creada. Por favor verifica tu correo.',
            email: data.user?.email,
          };
        }

        // Normal flow - email verification disabled or not required
        setToken(data.token);
        setUser(data.user);
        setStats(null);
        localStorage.setItem('auth-token', data.token);

        return {
          success: true,
          requiresEmailVerification: false,
          message: data.message || 'Cuenta creada exitosamente'
        };
      } else {
        return {
          success: false,
          error: data.error || 'Error de registro'
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: 'Error de red durante el registro' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint (for future token blacklisting)
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local state regardless of API call success
      setToken(null);
      setUser(null);
      setStats(null);
      localStorage.removeItem('auth-token');
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    if (token) {
      try {
        await fetchUserData(token);
      } catch (error) {
        console.error('Failed to refresh user data:', error);
      }
    }
  };

  const value: AuthContextType = {
    user,
    stats,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    isAdmin: !!user && user.email === 'icabreraquezada@gmail.com',
    isOrganizer: !!user && (user.role === 'organizer' || user.role === 'admin' || user.email === 'icabreraquezada@gmail.com'),
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;