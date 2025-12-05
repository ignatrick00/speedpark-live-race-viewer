'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import RaceBrowserV0 from '@/components/RaceBrowserV0';
import TopDriversV0Day from '@/components/TopDriversDayV0';
import TopDriversV0Week from '@/components/TopDriversWeekV0';
import TopDriversV0Month from '@/components/TopDriversMonthV0';
import TopDriversV0AllTime from '@/components/TopDriversAllTimeV0';
import KartRecordsSelectorV0 from '@/components/KartRecordsSelectorV0';

export default function RankingPage() {
  const [lapCaptureEnabled, setLapCaptureEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchToggleStatus();
  }, []);

  const fetchToggleStatus = async () => {
    try {
      const response = await fetch('/api/lap-capture/toggle');
      const data = await response.json();
      if (data.success) {
        setLapCaptureEnabled(data.enabled);
      }
    } catch (error) {
      console.error('Error fetching toggle status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/lap-capture/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !lapCaptureEnabled }),
      });

      const data = await response.json();
      if (data.success) {
        setLapCaptureEnabled(data.enabled);
      }
    } catch (error) {
      console.error('Error toggling lap capture:', error);
      alert('Error al cambiar el estado del guardado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-midnight via-racing-black to-midnight">
        {/* Header with Toggle Control */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-4xl md:text-5xl font-racing text-gold mb-2">
              🏁 RANKING & CARRERAS
            </h1>
            <p className="text-sky-blue/70">
              Navegador de carreras con control de guardado automático
            </p>
          </div>

          {/* Lap Capture Control Panel */}
          <div className={`mb-6 p-6 rounded-xl border-2 transition-all ${
            lapCaptureEnabled
              ? 'bg-green-900/20 border-green-500/50'
              : 'bg-red-900/20 border-red-500/50'
          }`}>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">
                    {lapCaptureEnabled ? '✅' : '⏸️'}
                  </span>
                  <h2 className={`text-2xl font-racing ${
                    lapCaptureEnabled ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {lapCaptureEnabled ? 'GUARDADO ACTIVO' : 'GUARDADO PAUSADO'}
                  </h2>
                </div>
                <p className={`text-sm ${
                  lapCaptureEnabled ? 'text-green-300/70' : 'text-red-300/70'
                }`}>
                  {lapCaptureEnabled
                    ? 'Las vueltas de carreras se están guardando automáticamente en la base de datos'
                    : '⚠️ ATENCIÓN: Las vueltas NO se están guardando. Activa el guardado para registrar carreras.'}
                </p>
              </div>

              <button
                onClick={handleToggle}
                disabled={loading}
                className={`px-6 py-3 rounded-lg font-racing text-lg transition-all disabled:opacity-50 ${
                  lapCaptureEnabled
                    ? 'bg-red-600/30 border-2 border-red-500/50 text-red-300 hover:bg-red-600/40'
                    : 'bg-green-600/30 border-2 border-green-500/50 text-green-300 hover:bg-green-600/40'
                }`}
              >
                {loading ? '⏳ CARGANDO...' : lapCaptureEnabled ? '⏸️ PAUSAR GUARDADO' : '▶️ ACTIVAR GUARDADO'}
              </button>
            </div>

            {/* Additional Info */}
            {!lapCaptureEnabled && (
              <div className="mt-4 p-4 bg-red-950/50 border border-red-500/30 rounded-lg">
                <p className="text-red-300 text-sm font-semibold mb-2">
                  💡 Modo de Prueba Activo
                </p>
                <p className="text-red-300/70 text-xs">
                  Útil para monitorear carreras sin guardar datos o para testing.
                  Las carreras seguirán apareciendo en tiempo real pero no se almacenarán en la base de datos.
                </p>
              </div>
            )}
          </div>

          {/* Best Times Tables - 8 tables total */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Left Column: Drivers */}
            <div className="space-y-6">
              <h2 className="text-2xl font-racing text-gold">👤 Mejores Pilotos</h2>
              <TopDriversV0Day />
              <TopDriversV0Week />
              <TopDriversV0Month />
              <TopDriversV0AllTime />
            </div>

            {/* Right Column: Karts - Selector para elegir kart específico */}
            <div className="space-y-6">
              <h2 className="text-2xl font-racing text-gold">🏎️ Records por Kart</h2>
              <KartRecordsSelectorV0 />
            </div>
          </div>

          {/* Race Browser V0 Component - Uses new race-centered structure */}
          <RaceBrowserV0 />
        </div>
      </div>
    </>
  );
}
