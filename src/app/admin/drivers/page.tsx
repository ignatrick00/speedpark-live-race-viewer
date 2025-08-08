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
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isLinking, setIsLinking] = useState(false);

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

  const fetchDrivers = async () => {
    try {
      const response = await fetch(`/api/drivers?action=list_all&search=${search}`);
      const data = await response.json();
      
      if (data.success) {
        setDrivers(data.drivers);
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
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

  const linkDriver = async (driverName: string, webUserId: string, personId?: string) => {
    setIsLinking(true);
    try {
      const response = await fetch('/api/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'link_driver',
          driverName,
          webUserId,
          personId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        alert(`✅ ${data.message}`);
        setSelectedDriver(null);
        setUserSearch('');
        setUsers([]);
        fetchDrivers(); // Refresh list
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

  const formatTime = (timeMs: number) => {
    if (!timeMs || timeMs === 0) return '--:--';
    const minutes = Math.floor(timeMs / 60000);
    const seconds = ((timeMs % 60000) / 1000).toFixed(3);
    return `${minutes}:${parseFloat(seconds).toFixed(3).padStart(6, '0')}`;
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
        
        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar corredor por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && fetchDrivers()}
            className="bg-gray-800 text-white p-3 rounded-lg border border-gray-600 focus:border-cyan-400 focus:outline-none w-full max-w-md"
          />
          <button
            onClick={fetchDrivers}
            className="ml-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
          >
            Buscar
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-cyan-400">{drivers.length}</div>
            <div className="text-sm text-gray-400">Total Corredores</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-400">
              {drivers.filter(d => d.isLinked).length}
            </div>
            <div className="text-sm text-gray-400">Vinculados</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
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
                {drivers.map((driver, index) => (
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
                        <button
                          onClick={() => unlinkDriver(driver.driverName)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs transition-colors"
                        >
                          Desvincular
                        </button>
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
                  <h3 className="text-sm font-medium text-gray-300">Usuarios encontrados:</h3>
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
                      name.toLowerCase().includes(selectedDriver.driverName.toLowerCase()) ||
                      selectedDriver.driverName.toLowerCase().includes(name.toLowerCase())
                    );
                    
                    return (
                      <div key={user._id} className={`bg-gray-700 p-3 rounded flex items-center justify-between ${hasMatch ? 'ring-2 ring-green-400' : ''}`}>
                        <div className="flex-1">
                          <div className="font-medium text-white">
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
                          {hasMatch && (
                            <div className="text-xs text-green-400 font-bold mt-1">
                              ✨ POSIBLE COINCIDENCIA
                            </div>
                          )}
                          {/* Mostrar todos los nombres posibles */}
                          <div className="text-xs text-gray-600 mt-1">
                            Nombres: {possibleNames.join(', ')}
                          </div>
                        </div>
                        <button
                          onClick={() => linkDriver(selectedDriver.driverName, user._id)}
                          disabled={isLinking}
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            hasMatch 
                              ? 'bg-green-600 hover:bg-green-700 ring-2 ring-green-400' 
                              : 'bg-blue-600 hover:bg-blue-700'
                          } disabled:bg-gray-600`}
                        >
                          {isLinking ? 'Vinculando...' : hasMatch ? '✨ VINCULAR' : 'Vincular'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

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
                    setUserSearch('');
                    setUsers([]);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}