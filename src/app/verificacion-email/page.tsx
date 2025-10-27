'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function EmailVerificationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);

  const status = searchParams.get('status');
  const error = searchParams.get('error');
  const token = searchParams.get('token');

  useEffect(() => {
    // If verification successful and token provided, auto-login
    if (status === 'success' && token) {
      localStorage.setItem('auth-token', token);
      setTimeout(() => {
        router.push('/');
      }, 3000);
    }
    setIsProcessing(false);
  }, [status, token, router]);

  const getContent = () => {
    if (isProcessing && (status === 'success' || error)) {
      return {
        icon: '⏳',
        title: 'Procesando...',
        message: 'Verificando tu correo electrónico',
        color: 'blue',
      };
    }

    if (status === 'success') {
      return {
        icon: '✅',
        title: '¡Correo Verificado!',
        message: 'Tu correo ha sido verificado exitosamente. Serás redirigido al inicio en unos segundos...',
        color: 'green',
        action: (
          <Link
            href="/"
            className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-electric-blue to-sky-blue text-midnight font-racing text-lg tracking-wider rounded-md hover:from-electric-blue/90 hover:to-sky-blue/90 transition-all transform hover:scale-105"
          >
            IR AL INICIO
          </Link>
        ),
      };
    }

    if (status === 'already_verified') {
      return {
        icon: 'ℹ️',
        title: 'Ya Verificado',
        message: 'Este correo ya ha sido verificado anteriormente. Puedes iniciar sesión normalmente.',
        color: 'blue',
        action: (
          <Link
            href="/"
            className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-electric-blue to-sky-blue text-midnight font-racing text-lg tracking-wider rounded-md hover:from-electric-blue/90 hover:to-sky-blue/90 transition-all transform hover:scale-105"
          >
            IR AL INICIO
          </Link>
        ),
      };
    }

    if (error === 'invalid_token') {
      return {
        icon: '❌',
        title: 'Token Inválido',
        message: 'El enlace de verificación no es válido o ya fue utilizado. Por favor solicita un nuevo correo de verificación.',
        color: 'red',
        action: (
          <Link
            href="/"
            className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-red-500 to-red-400 text-white font-racing text-lg tracking-wider rounded-md hover:from-red-600 hover:to-red-500 transition-all transform hover:scale-105"
          >
            VOLVER AL INICIO
          </Link>
        ),
      };
    }

    if (error === 'expired_token') {
      return {
        icon: '⏰',
        title: 'Token Expirado',
        message: 'El enlace de verificación ha expirado (24 horas). Por favor solicita un nuevo correo de verificación desde el login.',
        color: 'yellow',
        action: (
          <Link
            href="/"
            className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-400 text-midnight font-racing text-lg tracking-wider rounded-md hover:from-yellow-600 hover:to-yellow-500 transition-all transform hover:scale-105"
          >
            VOLVER AL INICIO
          </Link>
        ),
      };
    }

    if (error === 'server_error') {
      return {
        icon: '⚠️',
        title: 'Error del Servidor',
        message: 'Hubo un error al verificar tu correo. Por favor intenta más tarde o contacta soporte.',
        color: 'red',
        action: (
          <Link
            href="/"
            className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-red-500 to-red-400 text-white font-racing text-lg tracking-wider rounded-md hover:from-red-600 hover:to-red-500 transition-all transform hover:scale-105"
          >
            VOLVER AL INICIO
          </Link>
        ),
      };
    }

    // Default: No parameters provided
    return {
      icon: '📧',
      title: 'Verificación de Correo',
      message: 'Para verificar tu correo, haz clic en el enlace que te enviamos a tu bandeja de entrada.',
      color: 'blue',
      action: (
        <Link
          href="/"
          className="mt-6 inline-block px-6 py-3 bg-gradient-to-r from-electric-blue to-sky-blue text-midnight font-racing text-lg tracking-wider rounded-md hover:from-electric-blue/90 hover:to-sky-blue/90 transition-all transform hover:scale-105"
        >
          VOLVER AL INICIO
        </Link>
      ),
    };
  };

  const content = getContent();

  const colorClasses = {
    green: {
      border: 'border-green-400/40',
      bg: 'bg-green-500/10',
      text: 'text-green-300',
      glow: 'shadow-green-500/30',
    },
    red: {
      border: 'border-red-400/40',
      bg: 'bg-red-500/10',
      text: 'text-red-300',
      glow: 'shadow-red-500/30',
    },
    yellow: {
      border: 'border-yellow-400/40',
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-300',
      glow: 'shadow-yellow-500/30',
    },
    blue: {
      border: 'border-electric-blue/40',
      bg: 'bg-electric-blue/10',
      text: 'text-electric-blue',
      glow: 'shadow-electric-blue/30',
    },
  };

  const colors = colorClasses[content.color as keyof typeof colorClasses];

  return (
    <div className="min-h-screen bg-midnight flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* Main card */}
        <div
          className={`relative p-8 bg-midnight/90 backdrop-blur-md border ${colors.border} rounded-lg shadow-2xl ${colors.glow}`}
        >
          {/* Racing stripe decoration */}
          <div className="absolute -top-1 left-0 right-0 h-2 bg-gradient-to-r from-electric-blue via-karting-gold to-electric-blue rounded-t-lg"></div>

          {/* Content */}
          <div className="text-center">
            {/* Icon */}
            <div className="text-7xl mb-6 animate-pulse">{content.icon}</div>

            {/* Title */}
            <h1 className={`text-4xl font-racing ${colors.text} mb-4 tracking-wider`}>
              {content.title}
            </h1>

            {/* Message */}
            <p className="text-lg text-sky-blue/90 font-digital mb-6 leading-relaxed">
              {content.message}
            </p>

            {/* Action button */}
            {content.action && <div>{content.action}</div>}
          </div>

          {/* Racing theme decoration */}
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-electric-blue rounded-full animate-pulse"></div>
          <div className="absolute -top-1 -left-1 w-2 h-2 bg-karting-gold rounded-full animate-pulse-slow"></div>
        </div>

        {/* Additional info */}
        <div className="mt-6 text-center text-sm text-sky-blue/60 font-digital">
          <p>
            ¿Tienes problemas? Contacta a{' '}
            <a href="mailto:soporte@karteando.cl" className="text-electric-blue hover:underline">
              soporte@karteando.cl
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function EmailVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-midnight flex items-center justify-center">
          <div className="text-electric-blue font-racing text-2xl animate-pulse">
            Cargando...
          </div>
        </div>
      }
    >
      <EmailVerificationContent />
    </Suspense>
  );
}
