'use client';

import React, { useState } from 'react';

interface EmailVerificationNoticeProps {
  email: string;
  onClose: () => void;
}

export default function EmailVerificationNotice({ email, onClose }: EmailVerificationNoticeProps) {
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleResendEmail = async () => {
    setIsResending(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'Correo enviado exitosamente');
      } else {
        setError(data.error || 'No se pudo enviar el correo');
      }
    } catch (error) {
      setError('Error de red. Intenta más tarde.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-400/40 rounded-md backdrop-blur-sm">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-digital font-semibold text-yellow-300">
            Email no verificado
          </h3>
          <div className="mt-2 text-sm text-yellow-200/90">
            <p>
              Te enviamos un correo de verificación a <strong>{email}</strong>.
              Por favor revisa tu bandeja de entrada y spam.
            </p>
          </div>

          {message && (
            <div className="mt-3 p-2 bg-green-500/20 border border-green-400/40 rounded text-sm text-green-300">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-3 p-2 bg-red-500/20 border border-red-400/40 rounded text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleResendEmail}
              disabled={isResending}
              className="px-4 py-2 bg-yellow-500 text-midnight font-digital font-semibold rounded-md hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isResending ? 'Enviando...' : 'Reenviar correo'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-midnight/50 text-yellow-300 font-digital rounded-md hover:bg-midnight/70 border border-yellow-400/30 transition-colors text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
