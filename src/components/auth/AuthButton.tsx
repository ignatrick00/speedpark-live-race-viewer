'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';

export default function AuthButton() {
  const { user, logout, isLoading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const handleLogout = () => {
    logout();
  };

  const switchToRegister = () => {
    setShowLoginModal(false);
    setShowRegisterModal(true);
  };

  const switchToLogin = () => {
    setShowRegisterModal(false);
    setShowLoginModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-4 h-4 border-2 border-electric-blue border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sky-blue/70 font-digital text-sm">LOADING...</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center space-x-4">
        {/* User info */}
        <div className="text-right">
          <p className="text-electric-blue font-digital font-semibold text-sm">
            {user.profile.alias || `${user.profile.firstName} ${user.profile.lastName}`}
          </p>
          <p className="text-xs text-sky-blue/70 font-digital">
            {user.kartingLink.status === 'pending_first_race' 
              ? '🏁 FIRST RACE PENDING'
              : user.kartingLink.status === 'linked'
              ? '📊 STATS ACTIVE'
              : '⚠️ SYNC PENDING'
            }
          </p>
        </div>

        {/* User avatar placeholder */}
        <div className="w-8 h-8 bg-gradient-to-br from-electric-blue/30 to-rb-blue/30 rounded-full flex items-center justify-center border border-electric-blue/50">
          <span className="text-electric-blue font-racing text-xs font-bold">
            {user.profile.firstName.charAt(0)}{user.profile.lastName.charAt(0)}
          </span>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="px-3 py-1 text-sm text-sky-blue/70 hover:text-electric-blue border border-rb-blue/50 hover:border-electric-blue/70 rounded font-digital transition-all"
        >
          EXIT
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <button
        onClick={() => setShowLoginModal(true)}
        className="px-4 py-2 text-electric-blue hover:text-karting-gold font-digital font-medium transition-colors border border-transparent hover:border-electric-blue/30 rounded"
      >
        ACCESS
      </button>
      
      <button
        onClick={() => setShowRegisterModal(true)}
        className="px-4 py-2 bg-gradient-to-r from-electric-blue to-sky-blue text-midnight font-racing font-bold rounded hover:from-electric-blue/90 hover:to-sky-blue/90 transition-all transform hover:scale-105 active:scale-95"
      >
        JOIN TRACK
      </button>

      {/* Modals */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToRegister={switchToRegister}
      />
      
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={switchToLogin}
      />
    </div>
  );
}