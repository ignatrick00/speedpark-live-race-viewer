'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';

interface Driver {
  driverName: string;
  totalSessions: number;
  totalLaps: number;
  bestPosition: number;
  bestTime: number;
  lastRace: string;
  firstRace: string;
  linkedUserId?: string;
  personId?: string;
  isLinked: boolean;
  parsedName?: {
    firstName: string;
    lastName?: string;
  };
  webUser?: {
    profile: {
      firstName: string;
      lastName: string;
      alias?: string;
    };
    email: string;
    role?: string;      // ← Legacy field for backward compatibility
    roles?: string[];   // ← New array field
  };
}

interface User {
  _id: string;
  profile: {
    firstName: string;
    lastName: string;
    alias?: string;
  };
  email: string;
  kartingLink: {
    status: string;
    driverName?: string;
  };
}

export default function DriversAdminPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<'sms-timing' | 'web-users'>('sms-timing');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [webUsers, setWebUsers] = useState<any[]>([]);
  const [webUsersStats, setWebUsersStats] = useState({ total: 0, linked: 0, notLinked: 0 });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [webUsersLoading, setWebUsersLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [linkFilter, setLinkFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState({ isCoach: false, isOrganizer: false });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ driverName: '', email: '', role: '' });
  const [editingPrivileges, setEditingPrivileges] = useState<{ driver: Driver | null, roles: { isCoach: boolean, isOrganizer: boolean } } | null>(null);
  const [isSavingRoles, setIsSavingRoles] = useState(false);
  const [restoringUserId, setRestoringUserId] = useState<string | null>(null);

  // Verificar acceso de administrador
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        router.push('/');
        return;
      }
      
      // Solo permitir acceso a icabreraquezada@gmail.com
      if (user.email !== 'icabreraquezada@gmail.com') {
        alert('❌ Acceso denegado. Solo administradores pueden acceder a esta página.');
        router.push('/dashboard');
        return;
      }
      
      fetchDrivers();
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (userSearch.length >= 2) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [userSearch]);

  useEffect(() => {
    if (view === 'web-users') {
      fetchWebUsers();
    }
  }, [view, search]);

  const fetchDrivers = async () => {
    try {
      const response = await fetch(`/api/drivers?action=list_all&search=${search}`);
      const data = await response.json();

      if (data.success) {
        console.log('🔍 FRONTEND - Total drivers recibidos:', data.drivers.length);
        console.log('🔍 FRONTEND - Drivers vinculados:', data.drivers.filter((d: Driver) => d.isLinked).length);
        console.log('🔍 FRONTEND - Primeros 3 drivers:', data.drivers.slice(0, 3));

        // Buscar drivers con linkedUserId
        const linked = data.drivers.filter((d: Driver) => d.linkedUserId);
        console.log('🔍 FRONTEND - Drivers con linkedUserId:', linked);

        setDrivers(data.drivers);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWebUsers = async () => {
    try {
      setWebUsersLoading(true);
      const response = await fetch(`/api/drivers?action=list_web_users&search=${search}`);
      const data = await response.json();

      if (data.success) {
        setWebUsers(data.users);
        setWebUsersStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching web users:', error);
    } finally {
      setWebUsersLoading(false);
    }
  };

  const searchUsers = async () => {
    try {
      const response = await fetch(`/api/drivers?action=search_users&search=${userSearch}`);
      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const linkDriver = async () => {
    if (!selectedDriver || !selectedUser) return;

    setIsLinking(true);
    try {
      const response = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'link_driver',
          driverName: selectedDriver.driverName,
          webUserId: selectedUser._id,
          personId: undefined,
          roles: selectedRoles
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ FRONTEND - Vinculación exitosa:', data);

        // Mostrar modal de éxito personalizado
        setSuccessMessage({
          driverName: selectedDriver.driverName,
          email: selectedUser.email,
          role: data.assignedRole || 'user'
        });
        setShowSuccessModal(true);

        // Limpiar estado
        setSelectedDriver(null);
        setSelectedUser(null);
        setUserSearch('');
        setUsers([]);
        setSelectedRoles({ isCoach: false, isOrganizer: false });

        // Esperar un momento antes de refrescar para que la DB se actualice
        setTimeout(() => {
          console.log('🔄 FRONTEND - Refrescando lista de drivers...');
          fetchDrivers();
        }, 500);
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Error linking driver: ${error}`);
    } finally {
      setIsLinking(false);
    }
  };

  const unlinkDriver = async (driverName: string) => {
    if (!confirm(`¿Seguro que quieres desvincular a ${driverName}?`)) {
      return;
    }

    try {
      const response = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unlink_driver',
          driverName
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${data.message}`);
        fetchDrivers(); // Refresh list
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Error unlinking driver: ${error}`);
    }
  };

  // Helper para normalizar roles (migración de role → roles)
  const getUserRoles = (webUser?: Driver['webUser']): string[] => {
    if (!webUser) return ['user'];
    // Si tiene el campo nuevo 'roles', usarlo
    if (webUser.roles && Array.isArray(webUser.roles)) {
      return webUser.roles.length > 0 ? webUser.roles : ['user'];
    }
    // Si solo tiene el campo legacy 'role', convertirlo a array
    if (webUser.role) {
      return [webUser.role];
    }
    return ['user'];
  };

  const openPrivilegesModal = (driver: Driver) => {
    // Pre-cargar roles basados en los roles actuales del usuario
    const currentRoles = getUserRoles(driver.webUser);
    setEditingPrivileges({
      driver,
      roles: {
        isCoach: currentRoles.includes('coach'),
        isOrganizer: currentRoles.includes('organizer')
      }
    });
  };

  const savePrivileges = async () => {
    if (!editingPrivileges?.driver) return;

    setIsSavingRoles(true);
    try {
      const response = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_roles',
          webUserId: editingPrivileges.driver.linkedUserId,
          roles: editingPrivileges.roles
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Roles actualizados: ${data.assignedRole}`);
        setEditingPrivileges(null);
        fetchDrivers(); // Refresh list
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Error updating roles: ${error}`);
    } finally {
      setIsSavingRoles(false);
    }
  };

  const formatTime = (timeMs: number) => {
    if (!timeMs || timeMs === 0) return '--:--';
    const minutes = Math.floor(timeMs / 60000);
    const seconds = ((timeMs % 60000) / 1000).toFixed(3);
    return `${minutes}:${parseFloat(seconds).toFixed(3).padStart(6, '0')}`;
  };

  const handleRestoreAccount = async (userId: string, userEmail: string) => {
    if (!confirm(`¿Estás seguro de restaurar la cuenta de ${userEmail}?`)) {
      return;
    }

    try {
      setRestoringUserId(userId);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/restore-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Cuenta restaurada exitosamente: ${userEmail}`);
        fetchWebUsers(); // Reload list
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error restoring account:', error);
      alert('❌ Error al restaurar cuenta');
    } finally {
      setRestoringUserId(null);
    }
  };

  // Mostrar loading o verificar acceso
  if (isLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <AdminNavbar currentPage="Cargando..." />
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-center pt-20">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>{isLoading ? 'Verificando acceso...' : 'Cargando corredores...'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Verificar acceso de administrador
  if (user.email !== 'icabreraquezada@gmail.com') {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <AdminNavbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold text-red-400 mb-4">Acceso Denegado</h1>
            <p className="text-gray-400 mb-6">Solo administradores pueden acceder a esta página.</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <AdminNavbar currentPage="Administrador de Corredores - Vinculación manual y gestión de pilotos" />
      
      <div className="max-w-6xl mx-auto p-6">

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-700">
          <button
            onClick={() => setView('sms-timing')}
            className={`px-6 py-3 font-bold transition-all ${
              view === 'sms-timing'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            📊 Corredores SMS-Timing
          </button>
          <button
            onClick={() => setView('web-users')}
            className={`px-6 py-3 font-bold transition-all ${
              view === 'web-users'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            👥 Usuarios Web
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder={view === 'sms-timing' ? "Buscar corredor por nombre..." : "Buscar usuario por email, nombre o alias..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (view === 'sms-timing' ? fetchDrivers() : fetchWebUsers())}
            className="bg-gray-800 text-white p-3 rounded-lg border border-gray-600 focus:border-cyan-400 focus:outline-none w-full max-w-md"
          />
          <button
            onClick={view === 'sms-timing' ? fetchDrivers : fetchWebUsers}
            className="ml-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
          >
            Buscar
          </button>
        </div>

        {/* SMS-Timing Drivers View */}
        {view === 'sms-timing' && (
          <>
            {/* Stats with Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div
            className={`bg-gray-800 p-4 rounded-lg cursor-pointer transition-all ${linkFilter === 'all' ? 'ring-2 ring-cyan-400' : 'hover:bg-gray-700'}`}
            onClick={() => setLinkFilter('all')}
          >
            <div className="text-2xl font-bold text-cyan-400">{drivers.length}</div>
            <div className="text-sm text-gray-400">Total Corredores</div>
          </div>
          <div
            className={`bg-gray-800 p-4 rounded-lg cursor-pointer transition-all ${linkFilter === 'linked' ? 'ring-2 ring-green-400' : 'hover:bg-gray-700'}`}
            onClick={() => setLinkFilter('linked')}
          >
            <div className="text-2xl font-bold text-green-400">
              {drivers.filter(d => d.isLinked).length}
            </div>
            <div className="text-sm text-gray-400">Vinculados</div>
          </div>
          <div
            className={`bg-gray-800 p-4 rounded-lg cursor-pointer transition-all ${linkFilter === 'unlinked' ? 'ring-2 ring-red-400' : 'hover:bg-gray-700'}`}
            onClick={() => setLinkFilter('unlinked')}
          >
            <div className="text-2xl font-bold text-red-400">
              {drivers.filter(d => !d.isLinked).length}
            </div>
            <div className="text-sm text-gray-400">Sin Vincular</div>
          </div>
        </div>

        {/* Drivers Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700">
                <tr>
                  <th className="text-left p-3">Nombre SMS-Timing</th>
                  <th className="text-left p-3">Apellido</th>
                  <th className="text-left p-3">Alias</th>
                  <th className="text-left p-3">Usuario Web</th>
                  <th className="text-center p-3">Sesiones</th>
                  <th className="text-center p-3">Vueltas</th>
                  <th className="text-center p-3">Mejor Pos</th>
                  <th className="text-right p-3">Mejor Tiempo</th>
                  <th className="text-center p-3">Última Carrera</th>
                  <th className="text-center p-3">Estado</th>
                  <th className="text-center p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {drivers
                  .filter(driver => {
                    if (linkFilter === 'linked') return driver.isLinked;
                    if (linkFilter === 'unlinked') return !driver.isLinked;
                    return true; // 'all'
                  })
                  .map((driver, index) => (
                  <tr key={index} className="border-b border-gray-700 hover:bg-gray-700/50">
                    <td className="p-3">
                      <div className="font-medium text-white">{driver.driverName}</div>
                      {driver.personId && (
                        <div className="text-xs text-gray-400">PersonID: {driver.personId}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="text-white">
                        {/* Priorizar apellido del usuario web, si no, usar del nombre SMS-Timing */}
                        {driver.webUser?.profile.lastName || 
                         driver.parsedName?.lastName || (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </div>
                      {/* Si hay diferencia, mostrar ambos */}
                      {driver.webUser?.profile.lastName && 
                       driver.parsedName?.lastName && 
                       driver.webUser.profile.lastName !== driver.parsedName.lastName && (
                        <div className="text-xs text-yellow-400 mt-1">
                          SMS: {driver.parsedName.lastName}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="text-cyan-400 font-bold">
                        {/* Mostrar alias del usuario web si está vinculado */}
                        {driver.webUser?.profile.alias ? (
                          driver.webUser.profile.alias
                        ) : driver.parsedName?.firstName !== driver.driverName.split(' ')[0] ? (
                          <span className="text-orange-400" title="Posible apodo extraído del nombre SMS">
                            {driver.driverName.split(' ').slice(-1)[0]}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {driver.webUser ? (
                        <div>
                          <div className="font-medium text-white">
                            {driver.webUser.profile.firstName} {driver.webUser.profile.lastName}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {driver.webUser.email}
                          </div>
                          {(() => {
                            const userRoles = getUserRoles(driver.webUser);
                            const hasSpecialRoles = userRoles.some(r => r !== 'user');
                            return hasSpecialRoles && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {userRoles.includes('admin') && (
                                  <span className="inline-block px-2 py-0.5 bg-red-600 text-white text-xs rounded font-medium">
                                    🔑 Admin
                                  </span>
                                )}
                                {userRoles.includes('organizer') && (
                                  <span className="inline-block px-2 py-0.5 bg-purple-600 text-white text-xs rounded font-medium">
                                    🎯 Organizador
                                  </span>
                                )}
                                {userRoles.includes('coach') && (
                                  <span className="inline-block px-2 py-0.5 bg-yellow-600 text-white text-xs rounded font-medium">
                                    🏎️ Coach
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-center">
                          <div className="text-sm">Sin vincular</div>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center text-cyan-400 font-medium">
                      {driver.totalSessions}
                    </td>
                    <td className="p-3 text-center text-green-400">
                      {driver.totalLaps}
                    </td>
                    <td className="p-3 text-center">
                      <span className="bg-purple-600 px-2 py-1 rounded text-xs">
                        P{driver.bestPosition}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-yellow-400">
                      {formatTime(driver.bestTime)}
                    </td>
                    <td className="p-3 text-center text-sm text-gray-400">
                      {new Date(driver.lastRace).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-center">
                      {driver.isLinked ? (
                        <span className="bg-green-600 px-2 py-1 rounded text-xs">✅ Vinculado</span>
                      ) : (
                        <span className="bg-red-600 px-2 py-1 rounded text-xs">❌ Sin vincular</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {driver.isLinked ? (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => openPrivilegesModal(driver)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs transition-colors"
                            title="Editar roles y privilegios"
                          >
                            🎯 Privilegios
                          </button>
                          <button
                            onClick={() => unlinkDriver(driver.driverName)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
                          >
                            Desvincular
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedDriver(driver)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
                        >
                          Vincular
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Linking Modal */}
        {selectedDriver && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-cyan-400 mb-4">
                🔗 Vincular Corredor: {selectedDriver.driverName}
              </h2>
              
              {/* User Search */}
              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-2">
                  Buscar usuario por nombre, apellido, alias o email:
                </label>
                <input
                  type="text"
                  placeholder={`Buscar usuario... (Intenta con "${selectedDriver.driverName}")`}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="bg-gray-700 text-white p-3 rounded border border-gray-600 focus:border-cyan-400 focus:outline-none w-full"
                />
                <div className="mt-2 text-xs text-gray-400">
                  💡 Sugerencia: Busca por "{selectedDriver.driverName}" o partes del nombre como "{selectedDriver.driverName.split(' ')[0]}"
                </div>
              </div>

              {/* Users List */}
              {users.length > 0 && (
                <div className="mb-4 space-y-2 max-h-60 overflow-y-auto">
                  <h3 className="text-sm font-medium text-gray-300">Usuarios encontrados (click para seleccionar):</h3>
                  {users.map((user) => {
                    // Crear lista de posibles nombres para matching
                    const possibleNames = [
                      user.profile.firstName,
                      user.profile.lastName,
                      `${user.profile.firstName} ${user.profile.lastName}`,
                      user.profile.alias
                    ].filter(Boolean);

                    // Verificar si algún nombre coincide con el driver seleccionado
                    const hasMatch = possibleNames.some(name =>
                      name && (
                        name.toLowerCase().includes(selectedDriver.driverName.toLowerCase()) ||
                        selectedDriver.driverName.toLowerCase().includes(name.toLowerCase())
                      )
                    );

                    const isSelected = selectedUser?._id === user._id;

                    return (
                      <div
                        key={user._id}
                        onClick={() => setSelectedUser(user)}
                        className={`bg-gray-700 p-3 rounded cursor-pointer transition-all ${
                          isSelected
                            ? 'ring-4 ring-cyan-400 bg-cyan-900/30'
                            : hasMatch
                            ? 'ring-2 ring-green-400 hover:bg-gray-600'
                            : 'hover:bg-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-white">
                              {isSelected && <span className="mr-2">✅</span>}
                              {user.profile.firstName} {user.profile.lastName}
                              {user.profile.alias && (
                                <span className="ml-2 text-cyan-400 font-bold">({user.profile.alias})</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-400">{user.email}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Estado: {user.kartingLink.status}
                              {user.kartingLink.driverName && (
                                <span className="ml-2 text-yellow-400">
                                  → Vinculado a: {user.kartingLink.driverName}
                                </span>
                              )}
                            </div>
                            {hasMatch && !isSelected && (
                              <div className="text-xs text-green-400 font-bold mt-1">
                                ✨ POSIBLE COINCIDENCIA
                              </div>
                            )}
                            {isSelected && (
                              <div className="text-xs text-cyan-400 font-bold mt-1">
                                ✅ USUARIO SELECCIONADO
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Role Selection */}
              <div className="mb-4 bg-gray-700 p-4 rounded-lg border border-cyan-400/30">
                <h3 className="text-sm font-medium text-cyan-400 mb-3 flex items-center gap-2">
                  🎯 Asignar Roles (opcional):
                </h3>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedRoles.isCoach}
                      onChange={(e) => setSelectedRoles({ ...selectedRoles, isCoach: e.target.checked })}
                      className="mt-1 w-5 h-5 text-yellow-600 bg-gray-600 border-gray-500 rounded focus:ring-yellow-500 focus:ring-2"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white group-hover:text-yellow-400 transition-colors">
                        🏎️ Coach
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Acceso a panel de análisis y métricas de rendimiento
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedRoles.isOrganizer}
                      onChange={(e) => setSelectedRoles({ ...selectedRoles, isOrganizer: e.target.checked })}
                      className="mt-1 w-5 h-5 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white group-hover:text-purple-400 transition-colors">
                        🎯 Organizador
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Puede crear y administrar campeonatos (incluye permisos de Coach)
                      </div>
                    </div>
                  </label>
                </div>

                {(selectedRoles.isCoach || selectedRoles.isOrganizer) && (
                  <div className="mt-3 p-3 bg-cyan-900/30 border border-cyan-400/30 rounded-lg">
                    <div className="text-xs text-cyan-300 font-medium">
                      ℹ️ Roles seleccionados:
                    </div>
                    <div className="text-xs text-gray-300 mt-1">
                      {selectedRoles.isOrganizer && '🎯 Organizador (acceso completo)'}
                      {!selectedRoles.isOrganizer && selectedRoles.isCoach && '🏎️ Coach (análisis y métricas)'}
                    </div>
                  </div>
                )}
              </div>

              {/* Driver Info */}
              <div className="bg-gray-700 p-4 rounded mb-4">
                <h3 className="font-medium text-white mb-2">Info del Corredor:</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Sesiones:</span>
                    <span className="ml-2 text-cyan-400">{selectedDriver.totalSessions}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Vueltas:</span>
                    <span className="ml-2 text-green-400">{selectedDriver.totalLaps}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Mejor Tiempo:</span>
                    <span className="ml-2 text-yellow-400">{formatTime(selectedDriver.bestTime)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Mejor Posición:</span>
                    <span className="ml-2 text-purple-400">P{selectedDriver.bestPosition}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedDriver(null);
                    setSelectedUser(null);
                    setUserSearch('');
                    setUsers([]);
                    setSelectedRoles({ isCoach: false, isOrganizer: false });
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={linkDriver}
                  disabled={!selectedUser || isLinking}
                  className={`px-6 py-2 rounded font-medium transition-colors ${
                    selectedUser && !isLinking
                      ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isLinking ? '⏳ Vinculando...' : selectedUser ? '✅ Guardar Vinculación' : '⚠️ Selecciona un usuario'}
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        )}

        {/* Web Users View */}
        {view === 'web-users' && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-cyan-400">{webUsersStats.total}</div>
                <div className="text-sm text-gray-400">Total Usuarios Web</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-400">{webUsersStats.linked}</div>
                <div className="text-sm text-gray-400">Vinculados</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-400">{webUsersStats.notLinked}</div>
                <div className="text-sm text-gray-400">Sin Vincular</div>
              </div>
            </div>

            {/* Web Users Table */}
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              {webUsersLoading ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="animate-spin text-4xl mb-4">⏳</div>
                  Cargando usuarios...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="text-left p-3">Email</th>
                        <th className="text-left p-3">Nombre</th>
                        <th className="text-left p-3">Apellido</th>
                        <th className="text-left p-3">Alias</th>
                        <th className="text-center p-3">Vinculación</th>
                        <th className="text-left p-3">Driver Vinculado</th>
                        <th className="text-center p-3">Estado Cuenta</th>
                        <th className="text-center p-3">Registrado</th>
                        <th className="text-center p-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {webUsers.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-8 text-gray-400">
                            No se encontraron usuarios web
                          </td>
                        </tr>
                      ) : (
                        webUsers.map((user) => (
                          <tr key={user._id} className="border-t border-gray-700 hover:bg-gray-700/50">
                            <td className="p-3 text-cyan-400">{user.email}</td>
                            <td className="p-3">{user.firstName || '-'}</td>
                            <td className="p-3">{user.lastName || '-'}</td>
                            <td className="p-3 text-gray-400 italic">{user.alias || '-'}</td>
                            <td className="p-3 text-center">
                              {user.isLinked ? (
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                                  ✅ Vinculado
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                                  ❌ Sin vincular
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              {user.linkedDriverName ? (
                                <span className="text-cyan-400">{user.linkedDriverName}</span>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {user.accountStatus === 'deleted' ? (
                                <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-bold">
                                  🗑️ ELIMINADA
                                </span>
                              ) : user.accountStatus === 'suspended' ? (
                                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-bold">
                                  ⏸️ SUSPENDIDA
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                                  ✅ Activa
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center text-gray-400 text-xs">
                              {new Date(user.createdAt).toLocaleDateString('es-CL')}
                            </td>
                            <td className="p-3 text-center">
                              {user.accountStatus === 'deleted' && (
                                <button
                                  onClick={() => handleRestoreAccount(user._id, user.email)}
                                  disabled={restoringUserId === user._id}
                                  className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/50 rounded text-xs font-bold transition-all disabled:opacity-50"
                                >
                                  {restoringUserId === user._id ? '...' : '♻️ Restaurar'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 max-w-md w-full border-2 border-cyan-400 shadow-2xl">
              <div className="text-center">
                {/* Icono de éxito animado */}
                <div className="mb-6">
                  <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                    <span className="text-4xl">✅</span>
                  </div>
                </div>

                {/* Título */}
                <h2 className="text-2xl font-bold text-white mb-4">
                  ¡Vinculación Exitosa!
                </h2>

                {/* Detalles */}
                <div className="bg-gray-700/50 rounded-lg p-4 mb-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Corredor:</span>
                    <span className="text-cyan-400 font-bold">{successMessage.driverName}</span>
                  </div>
                  <div className="h-px bg-gray-600"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Usuario:</span>
                    <span className="text-white font-medium text-sm">{successMessage.email}</span>
                  </div>
                  <div className="h-px bg-gray-600"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Rol asignado:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      successMessage.role === 'admin' ? 'bg-red-600 text-white' :
                      successMessage.role === 'organizer' ? 'bg-purple-600 text-white' :
                      successMessage.role === 'coach' ? 'bg-yellow-600 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {successMessage.role === 'admin' && '🔑 Administrador'}
                      {successMessage.role === 'organizer' && '🎯 Organizador'}
                      {successMessage.role === 'coach' && '🏎️ Coach'}
                      {successMessage.role === 'user' && '👤 Usuario'}
                    </span>
                  </div>
                </div>

                {/* Botón cerrar */}
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Privileges Edit Modal */}
        {editingPrivileges && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 max-w-md w-full border-2 border-purple-400 shadow-2xl">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🎯</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Editar Privilegios
                </h2>
                <p className="text-gray-400 text-sm">
                  {editingPrivileges.driver?.driverName}
                </p>
                {editingPrivileges.driver?.webUser && (
                  <p className="text-cyan-400 text-sm mt-1">
                    {editingPrivileges.driver.webUser.email}
                  </p>
                )}
              </div>

              {/* Role Selection */}
              <div className="mb-6">
                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer group bg-gray-700/50 p-4 rounded-lg hover:bg-gray-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={editingPrivileges.roles.isCoach}
                      onChange={(e) => setEditingPrivileges({
                        ...editingPrivileges,
                        roles: { ...editingPrivileges.roles, isCoach: e.target.checked }
                      })}
                      className="mt-1 w-5 h-5 text-yellow-600 bg-gray-600 border-gray-500 rounded focus:ring-yellow-500 focus:ring-2"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white group-hover:text-yellow-400 transition-colors">
                        🏎️ Coach
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Acceso a panel de análisis y métricas de rendimiento
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group bg-gray-700/50 p-4 rounded-lg hover:bg-gray-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={editingPrivileges.roles.isOrganizer}
                      onChange={(e) => setEditingPrivileges({
                        ...editingPrivileges,
                        roles: { ...editingPrivileges.roles, isOrganizer: e.target.checked }
                      })}
                      className="mt-1 w-5 h-5 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500 focus:ring-2"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white group-hover:text-purple-400 transition-colors">
                        🎯 Organizador
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Puede crear y administrar campeonatos (incluye permisos de Coach)
                      </div>
                    </div>
                  </label>
                </div>

                {(editingPrivileges.roles.isCoach || editingPrivileges.roles.isOrganizer) && (
                  <div className="mt-4 p-3 bg-purple-900/30 border border-purple-400/30 rounded-lg">
                    <div className="text-xs text-purple-300 font-medium">
                      ℹ️ Rol que se asignará:
                    </div>
                    <div className="text-sm text-white mt-1 font-bold">
                      {editingPrivileges.roles.isOrganizer && '🎯 Organizador (acceso completo)'}
                      {!editingPrivileges.roles.isOrganizer && editingPrivileges.roles.isCoach && '🏎️ Coach (análisis y métricas)'}
                    </div>
                  </div>
                )}

                {!editingPrivileges.roles.isCoach && !editingPrivileges.roles.isOrganizer && (
                  <div className="mt-4 p-3 bg-gray-700/50 border border-gray-600 rounded-lg">
                    <div className="text-xs text-gray-400">
                      ⚠️ Sin roles seleccionados, se asignará rol de usuario estándar
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingPrivileges(null)}
                  disabled={isSavingRoles}
                  className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={savePrivileges}
                  disabled={isSavingRoles}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSavingRoles ? '⏳ Guardando...' : '✅ Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}