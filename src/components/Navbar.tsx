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
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [invitationCount, setInvitationCount] = useState(0);
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [hasSeenDropdown, setHasSeenDropdown] = useState(false);

  // Fetch invitation, friend request, and notification counts
  useEffect(() => {
    if (token) {
      fetchCounts();
      // Refresh every 30 seconds
      const interval = setInterval(fetchCounts, 30000);
      return () => clearInterval(interval);
    } else {
      setInvitationCount(0);
      setFriendRequestCount(0);
      setNotificationCount(0);
    }
  }, [token]);

  const fetchCounts = async () => {
    try {
      // Fetch invitations count
      const invitationsResponse = await fetch('/api/invitations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Fetch friend requests count
      const friendsResponse = await fetch('/api/friends', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Fetch unread notifications count
      const notificationsResponse = await fetch('/api/notifications?unreadOnly=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      let newInvitationCount = 0;
      let newFriendRequestCount = 0;
      let newNotificationCount = 0;

      if (invitationsResponse.ok) {
        const data = await invitationsResponse.json();
        newInvitationCount = data.count || 0;

        // 🔍 DEBUG: Log invitations
        if (newInvitationCount > 0) {
          console.log('📧 [NAVBAR] Invitaciones pendientes:', data.invitations);
          console.log('📊 [NAVBAR] Total invitaciones:', newInvitationCount);
        }
      }

      if (friendsResponse.ok) {
        const data = await friendsResponse.json();
        newFriendRequestCount = data.count?.requestsReceived || 0;

        // 🔍 DEBUG: Log friend requests
        if (newFriendRequestCount > 0) {
          console.log('👥 [NAVBAR] Solicitudes de amistad recibidas:', data.requestsReceived);
          console.log('📊 [NAVBAR] Total solicitudes:', newFriendRequestCount);
        }
      }

      if (notificationsResponse.ok) {
        const data = await notificationsResponse.json();
        newNotificationCount = data.unreadCount || 0;

        // 🔍 DEBUG: Log unread notifications
        if (newNotificationCount > 0) {
          console.log('🔔 [NAVBAR] Notificaciones sin leer:', data.notifications);
          console.log('📊 [NAVBAR] Total sin leer:', newNotificationCount);

          // Log each notification details
          data.notifications.forEach((notif: any, index: number) => {
            console.log(`🔔 [NAVBAR] Notificación #${index + 1}:`, {
              id: notif._id,
              type: notif.type,
              title: notif.title,
              message: notif.message,
              read: notif.read,
              createdAt: notif.createdAt,
              metadata: notif.metadata
            });
          });
        }
      }

      const previousTotal = invitationCount + friendRequestCount + notificationCount;
      const newTotal = newInvitationCount + newFriendRequestCount + newNotificationCount;

      // 🔍 DEBUG: Log all counts
      console.log('📬 [NAVBAR] Contadores actualizados:', {
        invitations: newInvitationCount,
        friendRequests: newFriendRequestCount,
        notifications: newNotificationCount,
        total: newTotal
      });

      // If total count increases, reset the seen state to show badge on button again
      if (newTotal > previousTotal) {
        setHasSeenDropdown(false);
      }

      setInvitationCount(newInvitationCount);
      setFriendRequestCount(newFriendRequestCount);
      setNotificationCount(newNotificationCount);
    } catch (error) {
      console.error('Error fetching counts:', error);
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
        <div className="w-full px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo - Clickable */}
            <a href="/" className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-shrink-0 hover:opacity-80 transition-opacity">
              <Image
                src="/images/Friendly-races/logo karteando.png"
                alt="Karteando.cl"
                width={250}
                height={140}
                className="h-16 w-auto sm:h-[140px] rounded-xl object-contain"
              />
              <div className="min-w-0 flex flex-col">
                <p className="text-sm sm:text-lg font-racing italic tracking-wider uppercase bg-gradient-to-r from-electric-blue to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(0,212,255,0.5)] leading-tight">
                  Racing Platform
                </p>
                <p className="text-xs sm:text-sm font-racing tracking-wide uppercase text-sky-blue/70 leading-tight">
                  Competitive Karting
                </p>
              </div>
            </a>

            {/* Desktop Navigation Links - Centered */}
            <div className="hidden lg:flex items-center space-x-8 xl:space-x-12 absolute left-1/2 transform -translate-x-1/2">
              <a href="/" className="text-blue-300 hover:text-cyan-400 transition-colors font-medium uppercase tracking-wider text-sm">
                En Pista
              </a>
              <a href="/clases" className="text-blue-300 hover:text-cyan-400 transition-colors font-medium uppercase tracking-wider text-sm">
                Clases
              </a>
              <a
                href="/races"
                className="relative px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold uppercase tracking-wider text-sm rounded-lg hover:scale-110 hover:shadow-2xl hover:shadow-red-500/50 transition-all duration-300 animate-pulse"
              >
                🔥 COMPETIR 🔥
              </a>
              <a href="/ranking" className="text-blue-300 hover:text-cyan-400 transition-colors font-medium uppercase tracking-wider text-sm">
                Ranking
              </a>
            </div>

            {/* Auth Section */}
            <div className="flex items-center space-x-2 sm:space-x-6 min-w-0">

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
                  {/* User Dropdown Button */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowUserDropdown(!showUserDropdown);
                        if (!showUserDropdown) {
                          setHasSeenDropdown(true);
                        }
                      }}
                      className="px-2 sm:px-4 py-1.5 sm:py-2 text-cyan-400 hover:text-white transition-all border border-cyan-400/30 rounded-lg hover:bg-cyan-400/10 hover:shadow-lg hover:shadow-cyan-400/20 font-medium text-xs sm:text-sm flex items-center gap-2 relative"
                    >
                      <span className="sm:hidden">🏆</span>
                      <span className="hidden sm:inline">🏆 {user.profile.alias || user.profile.firstName}</span>
                      {(invitationCount + friendRequestCount + notificationCount) > 0 && !hasSeenDropdown && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                          {invitationCount + friendRequestCount + notificationCount}
                        </span>
                      )}
                      <svg className={`w-4 h-4 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {showUserDropdown && (
                      <div className="absolute right-0 mt-2 w-48 bg-black/95 backdrop-blur-sm border border-cyan-400/30 rounded-lg shadow-xl shadow-cyan-400/20 overflow-hidden z-50">
                        <a
                          href="/squadron"
                          className="block px-4 py-3 text-blue-300 hover:text-cyan-400 hover:bg-cyan-400/10 transition-colors font-medium uppercase tracking-wider text-sm border-b border-blue-800/30"
                        >
                          Escuderías
                        </a>
                        <a
                          href="/amigos"
                          className="block px-4 py-3 text-blue-300 hover:text-cyan-400 hover:bg-cyan-400/10 transition-colors font-medium uppercase tracking-wider text-sm border-b border-blue-800/30 relative"
                        >
                          Amigos
                          {friendRequestCount > 0 && hasSeenDropdown && (
                            <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                              {friendRequestCount}
                            </span>
                          )}
                        </a>
                        <a
                          href="/inbox"
                          className="block px-4 py-3 text-blue-300 hover:text-cyan-400 hover:bg-cyan-400/10 transition-colors font-medium uppercase tracking-wider text-sm border-b border-blue-800/30 relative"
                        >
                          Inbox
                          {(invitationCount + notificationCount) > 0 && hasSeenDropdown && (
                            <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                              {invitationCount + notificationCount}
                            </span>
                          )}
                        </a>
                        <a
                          href="/dashboard"
                          className="block px-4 py-3 text-blue-300 hover:text-cyan-400 hover:bg-cyan-400/10 transition-colors font-medium uppercase tracking-wider text-sm border-b border-blue-800/30"
                        >
                          Dashboard
                        </a>
                        <a
                          href="/herramientas"
                          className="block px-4 py-3 text-blue-300 hover:text-cyan-400 hover:bg-cyan-400/10 transition-colors font-medium uppercase tracking-wider text-sm border-b border-blue-800/30"
                        >
                          Herramientas
                        </a>
                        <a
                          href="/configuracion"
                          className="block px-4 py-3 text-blue-300 hover:text-cyan-400 hover:bg-cyan-400/10 transition-colors font-medium uppercase tracking-wider text-sm"
                        >
                          Configuración
                        </a>
                      </div>
                    )}
                  </div>

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
                  En Pista
                </a>
                <a href="/clases" className="text-blue-300 hover:text-cyan-400 transition-colors font-medium uppercase tracking-wider text-sm">
                  Clases
                </a>
                <a
                  href="/races"
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold uppercase tracking-wider text-sm rounded-lg text-center hover:shadow-2xl hover:shadow-red-500/50 transition-all duration-300 animate-pulse"
                >
                  🔥 COMPETIR 🔥
                </a>
                <a href="/ranking" className="text-blue-300 hover:text-cyan-400 transition-colors font-medium uppercase tracking-wider text-sm">
                  Ranking
                </a>
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
