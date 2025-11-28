'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import EmailVerificationNotice from './EmailVerificationNotice';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export default function LoginModal({ isOpen, onClose, onSwitchToRegister }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowEmailVerification(false);
    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        setEmail('');
        setPassword('');
        onClose();
        // Redirect to dashboard after successful login
        router.push('/dashboard');
      } else {
        // Check if error is due to unverified email
        if (result.error === 'Email no verificado') {
          setShowEmailVerification(true);
          setError('');
        } else {
          setError(result.error || 'Login failed');
        }
      }
    } catch (error) {
      setError('Network error during login');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError('');
    setShowEmailVerification(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight bg-opacity-90">
      <div className="relative w-full max-w-md p-8 mx-4 bg-midnight/90 backdrop-blur-md border border-electric-blue/40 rounded-lg shadow-2xl animate-glow">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-sky-blue/60 hover:text-electric-blue transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-3xl font-racing text-electric-blue mb-2 tracking-wider">
            BIENVENIDO
          </h2>
          <p className="text-sky-blue/80 font-digital text-sm">
            Accede a tus estadísticas de carrera
          </p>
        </div>

        {/* Email verification notice */}
        {showEmailVerification && (
          <EmailVerificationNotice
            email={email}
            onClose={() => setShowEmailVerification(false)}
          />
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-400/40 rounded-md backdrop-blur-sm">
            <p className="text-red-300 text-sm font-digital">{error}</p>
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-digital text-sky-blue mb-1">
              CORREO
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-midnight border border-rb-blue/50 rounded-md text-electric-blue placeholder-sky-blue/50 font-digital focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-electric-blue transition-all"
              placeholder="piloto@karteando.cl"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-digital text-sky-blue mb-1">
              CONTRASEÑA
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-midnight border border-rb-blue/50 rounded-md text-electric-blue placeholder-sky-blue/50 font-digital focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-electric-blue transition-all"
              placeholder="Ingresa tu contraseña"
            />
          </div>

          {/* Forgot password link */}
          <div className="text-right">
            <a
              href="/forgot-password"
              className="text-sm text-sky-blue/80 hover:text-electric-blue font-digital transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-electric-blue to-sky-blue text-midnight font-racing text-lg tracking-wider rounded-md hover:from-electric-blue/90 hover:to-sky-blue/90 focus:outline-none focus:ring-2 focus:ring-electric-blue focus:ring-offset-2 focus:ring-offset-midnight disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading ? 'ACCEDIENDO...' : 'ENTRAR AL CIRCUITO'}
          </button>
        </form>

        {/* Switch to register */}
        <div className="mt-6 text-center">
          <p className="text-sky-blue/70 font-digital text-sm">
            ¿Nuevo piloto?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-electric-blue hover:text-karting-gold font-digital font-semibold transition-colors"
            >
              REGÍSTRATE
            </button>
          </p>
        </div>

        {/* Racing theme decoration */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-electric-blue rounded-full animate-pulse"></div>
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-karting-gold rounded-full animate-pulse-slow"></div>
        <div className="absolute top-4 left-4 w-1 h-1 bg-rb-blue rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
    </div>
  );
}