'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setEmail('');
      } else {
        setError(data.error || 'Error al enviar el correo de recuperación');
      }
    } catch (error) {
      setError('Error de red. Por favor, intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-midnight px-4">
      <div className="relative w-full max-w-md p-8 bg-midnight/90 backdrop-blur-md border border-electric-blue/40 rounded-lg shadow-2xl animate-glow">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-racing text-electric-blue mb-2 tracking-wider">
            RECUPERAR CONTRASEÑA
          </h1>
          <p className="text-sky-blue/80 font-digital text-sm">
            Ingresa tu correo para restablecer tu contraseña
          </p>
        </div>

        {/* Success message */}
        {success && (
          <div className="mb-4 p-4 bg-karting-gold/20 border border-karting-gold/40 rounded-md backdrop-blur-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-karting-gold" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-digital font-semibold text-karting-gold mb-2">
                  Correo Enviado
                </h3>
                <p className="text-sm text-sky-blue/90">
                  Revisa tu correo electrónico para continuar con el proceso de recuperación.
                </p>
                <p className="text-xs text-sky-blue/70 mt-2">
                  Si no recibes el correo en unos minutos, revisa tu carpeta de spam.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-400/40 rounded-md backdrop-blur-sm">
            <p className="text-red-300 text-sm font-digital">{error}</p>
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-digital text-sky-blue mb-1">
                CORREO ELECTRÓNICO
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-electric-blue to-sky-blue text-midnight font-racing text-lg tracking-wider rounded-md hover:from-electric-blue/90 hover:to-sky-blue/90 focus:outline-none focus:ring-2 focus:ring-electric-blue focus:ring-offset-2 focus:ring-offset-midnight disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? 'ENVIANDO...' : 'ENVIAR ENLACE DE RECUPERACIÓN'}
            </button>
          </form>
        )}

        {/* Back to home link */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sky-blue/70 hover:text-electric-blue font-digital text-sm transition-colors inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            VOLVER AL INICIO
          </Link>
        </div>

        {/* Racing theme decoration */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-electric-blue rounded-full animate-pulse"></div>
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-karting-gold rounded-full animate-pulse-slow"></div>
        <div className="absolute top-4 left-4 w-1 h-1 bg-rb-blue rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
    </div>
  );
}
