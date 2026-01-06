'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  onSuccess?: () => void;
}

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin, onSuccess }: RegisterModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const { register } = useAuth();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setIsLoading(false);
      return;
    }

    try {
      const result = await register(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
        undefined // No alias - se obtiene automáticamente al vincular con el timing
      );
      
      if (result.success) {
        setSuccess(result.message || 'Account created successfully!');

        // Check if email verification is required
        if (result.requiresEmailVerification) {
          setRequiresVerification(true);
          setRegisteredEmail(result.email || formData.email);
          // Don't reset form or close modal - keep it open to show verification message
        } else {
          // Auto-login successful
          resetForm();
          onClose();

          // Call custom success callback if provided
          if (onSuccess) {
            onSuccess();
          } else {
            // Default: redirect to dashboard
            router.push('/dashboard');
          }
        }
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (error) {
      setError('Network error during registration');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
    });
    setError('');
    setSuccess('');
    setRequiresVerification(false);
    setRegisteredEmail('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-midnight bg-opacity-90">
      <div className="relative w-full max-w-md p-8 mx-4 bg-midnight/90 backdrop-blur-md border border-electric-blue/40 rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto animate-glow">
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
            ÚNETE AL CIRCUITO
          </h2>
          <p className="text-sky-blue/80 font-digital text-sm">
            Regístrate para seguir tu rendimiento
          </p>
        </div>

        {/* Success message */}
        {success && !requiresVerification && (
          <div className="mb-4 p-3 bg-karting-gold/20 border border-karting-gold/40 rounded-md backdrop-blur-sm">
            <p className="text-karting-gold text-sm font-digital font-semibold">{success}</p>
            <p className="text-electric-blue text-xs mt-1 font-digital">🏁 Go racing to activate your statistics!</p>
          </div>
        )}

        {/* Email verification required message */}
        {requiresVerification && (
          <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-400/40 rounded-md backdrop-blur-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-digital font-semibold text-yellow-300 mb-2">
                  📧 Verifica tu correo
                </h3>
                <p className="text-sm text-yellow-200/90 mb-2">
                  Te enviamos un correo de verificación a <strong>{registeredEmail}</strong>
                </p>
                <p className="text-xs text-yellow-200/70">
                  Por favor revisa tu bandeja de entrada (y spam) y haz clic en el enlace de verificación para activar tu cuenta.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-3 px-4 py-2 bg-yellow-500 text-midnight font-digital font-semibold rounded-md hover:bg-yellow-400 transition-colors text-sm"
                >
                  ENTENDIDO
                </button>
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

        {/* Register form - hide when verification is required */}
        {!requiresVerification && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-sm font-digital text-sky-blue mb-1">
                NOMBRE *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-midnight border border-rb-blue/50 rounded-md text-electric-blue placeholder-sky-blue/50 font-digital focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-electric-blue transition-all"
                placeholder="Ignacio"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-digital text-sky-blue mb-1">
                APELLIDO *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-midnight border border-rb-blue/50 rounded-md text-electric-blue placeholder-sky-blue/50 font-digital focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-electric-blue transition-all"
                placeholder="Cabrera"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-digital text-sky-blue mb-1">
              CORREO *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-midnight border border-rb-blue/50 rounded-md text-electric-blue placeholder-sky-blue/50 font-digital focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-electric-blue transition-all"
              placeholder="piloto@karteando.cl"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-digital text-sky-blue mb-1">
              CONTRASEÑA *
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-midnight border border-rb-blue/50 rounded-md text-electric-blue placeholder-sky-blue/50 font-digital focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-electric-blue transition-all"
              placeholder="Mín. 6 caracteres"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-digital text-sky-blue mb-1">
              CONFIRMAR CONTRASEÑA *
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 bg-midnight border border-rb-blue/50 rounded-md text-electric-blue placeholder-sky-blue/50 font-digital focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-electric-blue transition-all"
              placeholder="Repite tu contraseña"
            />
          </div>

          <div className="bg-rb-blue/10 p-3 rounded-md border border-rb-blue/30 backdrop-blur-sm">
            <p className="text-xs text-sky-blue/80 font-digital">
              🚧 <strong>NOTA:</strong> Verificación de correo pendiente. 
              Cuenta activa inmediatamente.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-electric-blue to-sky-blue text-midnight font-racing text-lg tracking-wider rounded-md hover:from-electric-blue/90 hover:to-sky-blue/90 focus:outline-none focus:ring-2 focus:ring-electric-blue focus:ring-offset-2 focus:ring-offset-midnight disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading ? 'REGISTRANDO...' : 'UNIRSE AL CIRCUITO'}
          </button>
        </form>
        )}

        {/* Switch to login */}
        {!requiresVerification && (
        <div className="mt-6 text-center">
          <p className="text-sky-blue/70 font-digital text-sm">
            ¿Ya tienes cuenta?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-electric-blue hover:text-karting-gold font-digital font-semibold transition-colors"
            >
              ACCEDER
            </button>
          </p>
        </div>
        )}

        {/* Racing theme decoration */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-electric-blue rounded-full animate-pulse"></div>
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-karting-gold rounded-full animate-pulse-slow"></div>
        <div className="absolute top-4 left-4 w-1 h-1 bg-rb-blue rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
    </div>
  );
}