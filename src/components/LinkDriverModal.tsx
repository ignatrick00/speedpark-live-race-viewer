'use client';

import { useState, useEffect } from 'react';

interface LinkDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
  userFullName: string;
}

interface RecentSession {
  sessionId: string;
  sessionName: string;
  sessionDate: string;
  bestTime: number;
  bestPosition: number;
  kartNumber?: number;
  totalLaps: number;
}

interface SearchResult {
  driverRaceDataId: string;
  driverName: string;
  firstName?: string;
  lastName?: string;
  totalRaces: number;
  lastRaceDate?: string;
  isAlreadyLinked: boolean;
  recentSessions: RecentSession[];
}

export default function LinkDriverModal({
  isOpen,
  onClose,
  onSuccess,
  token,
  userFullName,
}: LinkDriverModalProps) {
  const [step, setStep] = useState<'search' | 'select-session' | 'confirm' | 'success'>('search');
  const [searchName, setSearchName] = useState(userFullName);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<SearchResult | null>(null);
  const [selectedSession, setSelectedSession] = useState<RecentSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('search');
      setSearchName(userFullName);
      setSearchResults([]);
      setSelectedDriver(null);
      setSelectedSession(null);
      setError('');
      setSearchPerformed(false);
    }
  }, [isOpen, userFullName]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (searchName.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }

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
        body: JSON.stringify({ searchName: searchName.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSearchResults(data.results);
        if (data.results.length === 0) {
          setError('No se encontraron carreras recientes con ese nombre');
        }
      } else {
        setError(data.error || 'Error al buscar');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDriver = (driver: SearchResult) => {
    if (driver.isAlreadyLinked) {
      setError('Este perfil ya está vinculado a otra cuenta');
      return;
    }
    setSelectedDriver(driver);
    setStep('select-session');
    setError('');
  };

  const handleSelectSession = (session: RecentSession) => {
    setSelectedSession(session);
    setStep('confirm');
    setError('');
  };

  const handleSubmitRequest = async () => {
    if (!selectedDriver || !selectedSession) return;

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
          driverRaceDataId: selectedDriver.driverRaceDataId,
          sessionId: selectedSession.sessionId,
          searchedName: searchName,
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
                {step === 'search' && '🔗 Vincular Perfil de Corredor'}
                {step === 'select-session' && '📅 Selecciona tu Carrera'}
                {step === 'confirm' && '✅ Confirmar Solicitud'}
                {step === 'success' && '🎉 Solicitud Enviada'}
              </h2>
              <p className="text-sky-blue/60 text-sm mt-1">
                {step === 'search' && 'Busca tu nombre como aparece en Speed Park'}
                {step === 'select-session' && 'Elige una carrera en la que participaste'}
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
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-sky-blue mb-2">
                    Nombre en la pista
                  </label>
                  <input
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="w-full bg-gray-800/50 border border-sky-blue/30 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric-blue/50"
                    disabled={isLoading}
                  />
                  <p className="text-gray-400 text-xs mt-1">
                    Ingresa tu nombre tal como aparece en los resultados de Speed Park
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-electric-blue hover:bg-electric-blue/80 text-dark-bg font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Buscando...' : '🔍 Buscar'}
                </button>
              </form>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Search Results */}
              {searchPerformed && searchResults.length > 0 && (
                <div className="space-y-3 mt-6">
                  <h3 className="text-lg font-semibold text-white">Resultados encontrados:</h3>
                  {searchResults.map((result) => (
                    <button
                      key={result.driverRaceDataId}
                      onClick={() => handleSelectDriver(result)}
                      disabled={result.isAlreadyLinked}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        result.isAlreadyLinked
                          ? 'bg-gray-800/30 border-gray-700 opacity-50 cursor-not-allowed'
                          : 'bg-gray-800/50 border-sky-blue/30 hover:border-electric-blue hover:bg-gray-800/70'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-semibold">{result.driverName}</p>
                          <p className="text-sky-blue/60 text-sm">
                            {result.totalRaces} carreras • Última: {formatDate(result.lastRaceDate!)}
                          </p>
                        </div>
                        {result.isAlreadyLinked && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                            Ya vinculado
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Session */}
          {step === 'select-session' && selectedDriver && (
            <div className="space-y-4">
              <div className="bg-gray-800/50 border border-sky-blue/30 rounded-lg p-4 mb-4">
                <p className="text-white font-semibold">{selectedDriver.driverName}</p>
                <p className="text-sky-blue/60 text-sm">Selecciona una carrera en la que participaste</p>
              </div>

              <div className="space-y-3">
                {selectedDriver.recentSessions.map((session) => (
                  <button
                    key={session.sessionId}
                    onClick={() => handleSelectSession(session)}
                    className="w-full text-left p-4 bg-gray-800/50 border border-sky-blue/30 rounded-lg hover:border-electric-blue hover:bg-gray-800/70 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-white font-medium">{session.sessionName}</p>
                      <span className="text-sky-blue/60 text-sm">{formatDate(session.sessionDate)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-400">Mejor tiempo</p>
                        <p className="text-electric-blue font-mono">{formatTime(session.bestTime)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Posición</p>
                        <p className="text-white font-semibold">#{session.bestPosition}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Kart</p>
                        <p className="text-white">{session.kartNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setStep('search')}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-all"
              >
                ← Volver
              </button>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && selectedDriver && selectedSession && (
            <div className="space-y-4">
              <div className="bg-gray-800/50 border border-electric-blue/30 rounded-lg p-6 space-y-4">
                <div>
                  <p className="text-gray-400 text-sm">Perfil de corredor</p>
                  <p className="text-white font-semibold text-lg">{selectedDriver.driverName}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Carrera seleccionada</p>
                  <p className="text-white font-medium">{selectedSession.sessionName}</p>
                  <p className="text-sky-blue/60 text-sm">{formatDate(selectedSession.sessionDate)}</p>
                </div>
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
                  onClick={() => setStep('select-session')}
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
