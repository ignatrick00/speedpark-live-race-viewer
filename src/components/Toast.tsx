'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'info', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: 'from-green-500/90 to-emerald-600/90 border-green-400',
    error: 'from-red-500/90 to-red-600/90 border-red-400',
    info: 'from-blue-500/90 to-blue-600/90 border-blue-400',
  };

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className={`bg-gradient-to-r ${colors[type]} border-2 rounded-xl px-6 py-4 shadow-2xl min-w-[300px] max-w-md`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl text-white">{icons[type]}</span>
          <p className="text-white font-medium flex-1">{message}</p>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
