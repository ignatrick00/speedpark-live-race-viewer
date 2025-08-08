'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin }: RegisterModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    alias: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();

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
        formData.alias || undefined
      );
      
      if (result.success) {
        setSuccess(result.message || 'Account created successfully!');
        resetForm();
        
        // Auto-close after successful registration
        setTimeout(() => {
          onClose();
        }, 2000);
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
      alias: '',
    });
    setError('');
    setSuccess('');
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
        {success && (
          <div className="mb-4 p-3 bg-karting-gold/20 border border-karting-gold/40 rounded-md backdrop-blur-sm">
            <p className="text-karting-gold text-sm font-digital font-semibold">{success}</p>
            <p className="text-electric-blue text-xs mt-1 font-digital">🏁 Go racing to activate your statistics!</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-400/40 rounded-md backdrop-blur-sm">
            <p className="text-red-300 text-sm font-digital">{error}</p>
          </div>
        )}

        {/* Register form */}
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
            <label htmlFor="alias" className="block text-sm font-digital text-sky-blue mb-1">
              ALIAS DE CARRERA <span className="text-sky-blue/50">(Opcional)</span>
            </label>
            <input
              type="text"
              id="alias"
              name="alias"
              value={formData.alias}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-midnight border border-rb-blue/50 rounded-md text-electric-blue placeholder-sky-blue/50 font-digital focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-electric-blue transition-all"
              placeholder="Speed Racer"
            />
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

        {/* Switch to login */}
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

        {/* Racing theme decoration */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-electric-blue rounded-full animate-pulse"></div>
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-karting-gold rounded-full animate-pulse-slow"></div>
        <div className="absolute top-4 left-4 w-1 h-1 bg-rb-blue rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
    </div>
  );
}