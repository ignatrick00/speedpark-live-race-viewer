'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import LoginModal from '@/components/auth/LoginModal';
import RegisterModal from '@/components/auth/RegisterModal';
import Image from 'next/image';

export default function Navbar() {
  const { user, token, logout, isLoading, isOrganizer, isCoach } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [invitationCount, setInvitationCount] = useState(0);

  // Fetch invitation count
  useEffect(() => {
    if (token) {
      fetchInvitationCount();
      // Refresh every 30 seconds
      const interval = setInterval(fetchInvitationCount, 30000);
      return () => clearInterval(interval);
    } else {
      setInvitationCount(0);
    }
  }, [token]);

  const fetchInvitationCount = async () => {
    try {
      const response = await fetch('/api/invitations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setInvitationCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching invitation count:', error);
    }
  };

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

  return (
    <>
      <nav className="relative z-20 border-b border-blue-800/30 bg-black/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-2 sm:px-2 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-shrink-0">
              <Image
                src="/images/Friendly-races/logo karteando.png"
                alt="Karteando.cl"
                width={250}
                height={140}
                className="h-24 w-auto sm:h-[140px] rounded-xl object-contain"
              />
              <div className="min-w-0">
                <p className="text-blue-300 text-sm sm:text-base font-medium">Racing Platform</p>
              </div>
            </div>

            {/* Navigation Links & Auth */}
            <div className="flex items-center space-x-2 sm:space-x-6 min-w-0">
              {/* Desktop Navigation Links */}
              <div className="hidden lg:flex items-center space-x-4 xl:space-x-6">
                <a href="/" className="text-blue-300 hover:text-cyan-400 transition-colors font-medium uppercase tracking-wider text-sm">
                  En Vivo
                </a>
                <a href="/squadron" className="text-blue-300 hover:text-cyan-400 transition-colors font-medium uppercase tracking-wider text-sm">
                  Escuderías
                </a>
                <a href="/clases" className="text-blue-300 hover:text-cyan-400 transition-colors font-medium uppercase tracking-wider text-sm">
                  Clases
                </a>
                <a href="/races" className="text-blue-300 hover:text-cyan-400 transition-colors font-medium uppercase tracking-wider text-sm">
                  Carreras
                </a>
                {user && (
                  <a href="/invitaciones" className="text-blue-300 hover:text-cyan-400 transition-colors font-medium uppercase tracking-wider text-sm relative">
                    Invitaciones
                    {invitationCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        {invitationCount}
                      </span>
                    )}
                  </a>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden p-2 text-blue-300 hover:text-cyan-400 transition-colors"
                aria-label="Toggle mobile menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showMobileMenu ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              {/* Auth Section */}
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-blue-300 font-medium text-sm hidden sm:inline">Cargando...</span>
                </div>
              ) : user ? (
                <div className="flex items-center space-x-2 sm:space-x-4">
                  {/* User info */}
                  <div className="text-right hidden md:block">
                    <p className="text-cyan-400 font-medium text-sm">
                      {user.profile.alias || `${user.profile.firstName} ${user.profile.lastName}`}
                    </p>
                  </div>

                  {/* Dashboard button */}
                  <a
                    href="/dashboard"
                    className="px-2 sm:px-4 py-1.5 sm:py-2 text-cyan-400 hover:text-white transition-all border border-cyan-400/30 rounded-lg hover:bg-cyan-400/10 hover:shadow-lg hover:shadow-cyan-400/20 font-medium text-xs sm:text-sm"
                  >
                    <span className="sm:hidden">🏆</span>
                    <span className="hidden sm:inline">🏆 Dashboard</span>
                  </a>

                  {/* User avatar */}
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-400/30 to-blue-500/30 rounded-full flex items-center justify-center border border-cyan-400/50">
                    <span className="text-cyan-400 font-bold text-xs">
                      {user.profile.firstName.charAt(0)}{user.profile.lastName.charAt(0)}
                    </span>
                  </div>

                  {/* Logout button */}
                  <button
                    onClick={handleLogout}
                    className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-blue-300 hover:text-cyan-400 border border-blue-400/30 hover:border-cyan-400/50 rounded transition-all font-medium uppercase tracking-wider"
                  >
                    <span className="sm:hidden">✕</span>
                    <span className="hidden sm:inline">Salir</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 sm:space-x-4">
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-3 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm text-cyan-400 hover:text-white border border-cyan-400/50 hover:border-cyan-400 rounded-lg transition-all hover:bg-cyan-400/10 font-medium uppercase tracking-wider"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setShowRegisterModal(true)}
                    className="px-3 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-lg transition-all hover:shadow-lg hover:shadow-cyan-400/50 font-medium uppercase tracking-wider"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu */}
          {showMobileMenu && (
            <div className="lg:hidden mt-4 pb-4 border-t border-blue-800/30 pt-4">
              <div className="flex flex-col space-y-3">
                <a href="/" className="text-blue-300 hover:text-cyan-400 transition-colors font-medium uppercase tracking-wider text-sm">
                  En Vivo
                </a>
                <a href="/squadron" className="text-blue-300 hover:text-cyan-400 transition-colors font-medium uppercase tracking-wider text-sm">
                  Escuderías
                </a>
                <a href="/clases" className="text-blue-300 hover:text-cyan-400 transition-colors font-medium uppercase tracking-wider text-sm">
                  Clases
                </a>
                <a href="/races" className="text-blue-300 hover:text-cyan-400 transition-colors font-medium uppercase tracking-wider text-sm">
                  Carreras
                </a>
                {user && (
                  <a href="/invitaciones" className="text-blue-300 hover:text-cyan-400 transition-colors font-medium uppercase tracking-wider text-sm flex items-center gap-2">
                    Invitaciones
                    {invitationCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        {invitationCount}
                      </span>
                    )}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

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
    </>
  );
}
