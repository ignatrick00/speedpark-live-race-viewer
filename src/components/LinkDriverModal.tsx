'use client';

import { useState, useEffect } from 'react';
import DatePickerCalendar from './DatePickerCalendar';

interface LinkDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
  userFullName: string;
}

interface RaceSession {
  sessionId: string;
  sessionName: string;
  sessionDate: string;
  participantCount: number;
}

interface DriverSearchResult {
  driverName: string;
  totalRaces: number;
  lastRaceDate: string;
  bestTime: number;
}

interface Driver {
  driverRaceDataId: string;
  driverName: string;
  firstName?: string;
  lastName?: string;
  isAlreadyLinked: boolean;
  totalRaces: number;
  sessionData: {
    sessionId: string;
    sessionName: string;
    sessionDate: string;
    bestTime: number;
    bestPosition: number;
    finalPosition?: number;
    kartNumber?: number;
    totalLaps: number;
  };
}

export default function LinkDriverModal({
  isOpen,
  onClose,
  onSuccess,
  token,
  userFullName,
}: LinkDriverModalProps) {
  const [step, setStep] = useState<'search' | 'select-driver-name' | 'select-race' | 'select-driver' | 'confirm' | 'success'>('search');
  const [searchMode, setSearchMode] = useState<'name' | 'date'>('name'); // Two separate search modes
  const [driverName, setDriverName] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to today
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [driverSearchResults, setDriverSearchResults] = useState<DriverSearchResult[]>([]);
  const [selectedDriverName, setSelectedDriverName] = useState<string>('');
  const [sessions, setSessions] = useState<RaceSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<RaceSession | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('search');
      setSearchMode('name');
      setDriverName('');
      const now = new Date();
      setSelectedDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`);
      setDriverSearchResults([]);
      setSelectedDriverName('');
      setSessions([]);
      setSelectedSession(null);
      setDrivers([]);
      setSelectedDriver(null);
      setError('');
      setSearchPerformed(false);
      // DO NOT auto-load - only show results after user clicks search
    }
  }, [isOpen]);

  // Search for driver NAMES (not races)
  const searchDriverNames = async () => {
    if (!driverName.trim()) {
      setError('Ingresa un nombre para buscar');
      return;
    }

    setIsLoading(true);
    setError('');
    setSearchPerformed(true);

    try {
      const response = await fetch('/api/linkage/search-drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ driverName: driverName.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDriverSearchResults(data.drivers);
        if (data.drivers.length === 0) {
          setError('No se encontraron corredores con ese nombre');
        }
      } else {
        setError(data.error || 'Error al buscar corredores');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  // Search for RACES by date
  const searchRacesByDate = async () => {
    setIsLoading(true);
    setError('');
    setSearchPerformed(true);

    try {
      const response = await fetch('/api/linkage/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ selectedDate }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSessions(data.sessions);
        if (data.sessions.length === 0) {
          setError('No se encontraron carreras en esta fecha');
        }
      } else {
        setError(data.error || 'Error al buscar carreras');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  // Get races where a specific driver participated
  const loadDriverRaces = async (driverName: string) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/linkage/driver-races', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ driverName }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSessions(data.sessions);
        if (data.sessions.length === 0) {
          setError('No se encontraron carreras para este corredor');
        } else {
          setStep('select-race');
        }
      } else {
        setError(data.error || 'Error al cargar carreras del corredor');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchMode === 'name') {
      searchDriverNames();
    } else {
      searchRacesByDate();
    }
  };

  const handleSelectDriverName = async (driver: DriverSearchResult) => {
    // When searching by name, directly confirm linkage with this driver name
    setSelectedDriverName(driver.driverName);

    // Create a mock driver object for confirmation
    const mockDriver: Driver = {
      driverRaceDataId: '',
      driverName: driver.driverName,
      firstName: undefined,
      lastName: undefined,
      isAlreadyLinked: false,
      totalRaces: driver.totalRaces,
      sessionData: {
        sessionId: '',
        sessionName: `${driver.totalRaces} carreras totales`,
        sessionDate: driver.lastRaceDate,
        bestTime: driver.bestTime,
        bestPosition: 0,
        finalPosition: undefined,
        kartNumber: undefined,
        totalLaps: 0,
      }
    };

    setSelectedDriver(mockDriver);
    setStep('confirm');
  };

  const handleSelectSession = async (session: RaceSession) => {
    setSelectedSession(session);
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/linkage/session-drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId: session.sessionId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDrivers(data.participants);
        setStep('select-driver');
      } else {
        setError(data.error || 'Error al cargar corredores');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDriver = (driver: Driver) => {
    if (driver.isAlreadyLinked) {
      setError('Este perfil ya está vinculado a otra cuenta');
      return;
    }
    setSelectedDriver(driver);
    setStep('confirm');
    setError('');
  };

  const handleSubmitRequest = async () => {
    if (!selectedDriver) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/linkage/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          driverName: selectedDriver.driverName,
          sessionId: selectedSession?.sessionId || null, // Optional when linking by name
          searchedName: selectedDriver.driverName,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStep('success');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 3000);
      } else {
        setError(data.error || 'Error al enviar solicitud');
        setStep('search');
      }
    } catch (err) {
      setError('Error de conexión');
      setStep('search');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toFixed(3);
    return `${minutes}:${seconds.padStart(6, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-electric-blue/30 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-md border-b border-electric-blue/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-electric-blue">
                {step === 'search' && (searchMode === 'name' ? '👤 Buscar Corredor' : '📅 Buscar Carrera')}
                {step === 'select-driver-name' && '👤 Selecciona un Corredor'}
                {step === 'select-race' && '🏁 Selecciona una Carrera'}
                {step === 'select-driver' && '👤 Selecciona tu Nombre'}
                {step === 'confirm' && '✅ Confirmar Solicitud'}
                {step === 'success' && '🎉 Solicitud Enviada'}
              </h2>
              <p className="text-sky-blue/60 text-sm mt-1">
                {step === 'search' && (searchMode === 'name' ? 'Busca por el nombre del corredor' : 'Selecciona la fecha de la carrera')}
                {step === 'select-driver-name' && 'Selecciona el corredor que buscas'}
                {step === 'select-race' && 'Selecciona la carrera donde participaste'}
                {step === 'select-driver' && '¿Cuál de estos corredores eres tú?'}
                {step === 'confirm' && 'Revisa los datos antes de enviar'}
                {step === 'success' && 'Un administrador revisará tu solicitud'}
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Search */}
          {step === 'search' && (
            <div className="space-y-4">
              {/* Search Mode Tabs */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSearchMode('name');
                    setSearchPerformed(false);
                    setError('');
                  }}
                  className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
                    searchMode === 'name'
                      ? 'bg-electric-blue text-dark-bg border-electric-blue font-semibold'
                      : 'bg-gray-800/50 text-white border-sky-blue/30 hover:border-electric-blue/60'
                  }`}
                >
                  👤 Buscar por Nombre
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchMode('date');
                    setSearchPerformed(false);
                    setError('');
                  }}
                  className={`flex-1 px-4 py-3 rounded-lg border transition-all ${
                    searchMode === 'date'
                      ? 'bg-electric-blue text-dark-bg border-electric-blue font-semibold'
                      : 'bg-gray-800/50 text-white border-sky-blue/30 hover:border-electric-blue/60'
                  }`}
                >
                  📅 Buscar por Fecha
                </button>
              </div>

              <form onSubmit={handleSearch} className="space-y-4">
                {/* MODE 1: Search by Driver Name */}
                {searchMode === 'name' && (
                  <div>
                    <label className="block text-sm font-medium text-sky-blue mb-2">
                      Nombre del corredor
                    </label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="Ej: Ayrton Senna, Michael Schumacher..."
                      className="w-full bg-gray-800/50 border border-sky-blue/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric-blue/50"
                      disabled={isLoading}
                    />
                    <p className="text-sky-blue/60 text-xs mt-2">
                      Busca corredores por su nombre
                    </p>
                  </div>
                )}

                {/* MODE 2: Search by Date */}
                {searchMode === 'date' && (
                  <div>
                    <label className="block text-sm font-medium text-sky-blue mb-2">
                      Selecciona una fecha
                    </label>
                    <DatePickerCalendar
                      selectedDate={selectedDate}
                      onDateChange={setSelectedDate}
                      maxDate={(() => {
                        const now = new Date();
                        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                      })()}
                    />
                    <p className="text-sky-blue/60 text-xs mt-2">
                      Muestra todas las carreras de esta fecha
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Buscando...' : searchMode === 'name' ? '🔍 Buscar Nombre' : '🔍 Buscar Carreras'}
                </button>
              </form>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Driver Names List (for name search mode) */}
              {searchPerformed && searchMode === 'name' && driverSearchResults.length > 0 && (
                <div className="space-y-3 mt-6">
                  <h3 className="text-lg font-semibold text-white">
                    Selecciona el corredor que quieres vincular:
                  </h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {driverSearchResults.map((driver, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectDriverName(driver)}
                        className="w-full text-left p-4 bg-gray-800/50 border border-sky-blue/30 rounded-lg hover:border-electric-blue hover:bg-gray-800/70 transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-white font-medium text-lg">{driver.driverName}</p>
                          <span className="text-sky-blue/60 text-sm">{driver.totalRaces} carreras</span>
                        </div>
                        {driver.bestTime > 0 && (
                          <p className="text-electric-blue text-sm font-mono">
                            Mejor tiempo: {formatTime(driver.bestTime)}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sessions List (for date search mode) */}
              {searchPerformed && searchMode === 'date' && sessions.length > 0 && (
                <div className="space-y-3 mt-6">
                  <h3 className="text-lg font-semibold text-white">
                    Carreras encontradas ({sessions.length}):
                  </h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {sessions.map((session) => (
                      <button
                        key={session.sessionId}
                        onClick={() => handleSelectSession(session)}
                        className="w-full text-left p-4 bg-gray-800/50 border border-sky-blue/30 rounded-lg hover:border-electric-blue hover:bg-gray-800/70 transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-white font-medium">{session.sessionName}</p>
                          <span className="text-sky-blue/60 text-sm">{formatDate(session.sessionDate)}</span>
                        </div>
                        <p className="text-gray-400 text-sm">
                          {session.participantCount} {session.participantCount === 1 ? 'participante' : 'participantes'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Driver (only for date search mode) */}
          {step === 'select-driver' && selectedSession && (
            <div className="space-y-4">
              <div className="bg-gray-800/50 border border-sky-blue/30 rounded-lg p-4 mb-4">
                <p className="text-white font-semibold">{selectedSession.sessionName}</p>
                <p className="text-sky-blue/60 text-sm">{formatDate(selectedSession.sessionDate)}</p>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {drivers.map((driver) => (
                  <button
                    key={driver.driverRaceDataId}
                    onClick={() => handleSelectDriver(driver)}
                    disabled={driver.isAlreadyLinked}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      driver.isAlreadyLinked
                        ? 'bg-gray-800/30 border-gray-700 opacity-50 cursor-not-allowed'
                        : 'bg-gray-800/50 border-sky-blue/30 hover:border-electric-blue hover:bg-gray-800/70'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-white font-semibold">{driver.driverName}</p>
                        <p className="text-sky-blue/60 text-sm">{driver.totalRaces} carreras totales</p>
                      </div>
                      {driver.isAlreadyLinked && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                          Ya vinculado
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-400">Mejor tiempo</p>
                        <p className="text-electric-blue font-mono">{formatTime(driver.sessionData.bestTime)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Posición</p>
                        <p className="text-white font-semibold">#{driver.sessionData.bestPosition}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Kart</p>
                        <p className="text-white">{driver.sessionData.kartNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep('search')}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-all"
              >
                ← Volver a búsqueda
              </button>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && selectedDriver && (
            <div className="space-y-4">
              <div className="bg-gray-800/50 border border-electric-blue/30 rounded-lg p-6 space-y-4">
                <div>
                  <p className="text-gray-400 text-sm">Perfil de corredor</p>
                  <p className="text-white font-semibold text-lg">{selectedDriver.driverName}</p>
                </div>

                {selectedSession ? (
                  // Showing session details when coming from date search
                  <>
                    <div>
                      <p className="text-gray-400 text-sm">Carrera seleccionada</p>
                      <p className="text-white font-medium">{selectedSession.sessionName}</p>
                      <p className="text-sky-blue/60 text-sm">{formatDate(selectedSession.sessionDate)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                      <div>
                        <p className="text-gray-400 text-sm">Tu mejor tiempo</p>
                        <p className="text-electric-blue font-mono text-lg">{formatTime(selectedDriver.sessionData.bestTime)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Tu posición</p>
                        <p className="text-white font-semibold text-lg">#{selectedDriver.sessionData.bestPosition}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  // Showing stats when coming from name search
                  <div className="pt-4 border-t border-gray-700">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm">Total de carreras</p>
                        <p className="text-white font-semibold text-lg">{selectedDriver.totalRaces}</p>
                      </div>
                      {selectedDriver.sessionData.bestTime > 0 && (
                        <div>
                          <p className="text-gray-400 text-sm">Mejor tiempo histórico</p>
                          <p className="text-electric-blue font-mono text-lg">{formatTime(selectedDriver.sessionData.bestTime)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-400 text-sm">
                  ⚠️ Un administrador revisará tu solicitud antes de aprobarla. Recibirás una notificación cuando sea procesada.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (selectedSession) {
                      // Coming from date search - go back to driver selection
                      setStep('select-driver');
                    } else {
                      // Coming from name search - go back to search
                      setStep('search');
                    }
                  }}
                  disabled={isLoading}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg transition-all disabled:opacity-50"
                >
                  ← Volver
                </button>
                <button
                  onClick={handleSubmitRequest}
                  disabled={isLoading}
                  className="flex-1 bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Enviando...' : '✅ Enviar Solicitud'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-electric-blue mb-2">¡Solicitud Enviada!</h3>
              <p className="text-sky-blue/80 mb-6">
                Un administrador revisará tu solicitud pronto.<br />
                Te notificaremos cuando sea aprobada.
              </p>
              <div className="bg-gray-800/50 border border-sky-blue/30 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Esta ventana se cerrará automáticamente...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
