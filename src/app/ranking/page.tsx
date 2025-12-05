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

          {/* Driver Best Times - 2 columns */}
          <div className="mb-8">
            <h2 className="text-2xl font-racing text-gold mb-4">👤 Mejores Pilotos</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopDriversV0Day />
              <TopDriversV0Week />
              <TopDriversV0Month />
              <TopDriversV0AllTime />
            </div>
          </div>

          {/* Kart Records - Selector */}
          <div className="mb-8">
            <h2 className="text-2xl font-racing text-gold mb-4">🏎️ Records por Kart</h2>
            <KartRecordsSelectorV0 />
          </div>

          {/* Race Browser V0 Component - Uses new race-centered structure */}
          <div className="mb-8">
            <RaceBrowserV0 />
          </div>
        </div>
      </div>
    </>
  );
}
