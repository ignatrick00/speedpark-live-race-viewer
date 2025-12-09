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
  const [squadrons, setSquadrons] = useState<any[]>([]);
  const [loadingSquadrons, setLoadingSquadrons] = useState(true);

  useEffect(() => {
    fetchToggleStatus();
    fetchSquadronRanking();
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

  const fetchSquadronRanking = async () => {
    try {
      const response = await fetch('/api/squadron/ranking');
      const data = await response.json();
      if (data.success) {
        setSquadrons(data.squadrons);
      }
    } catch (error) {
      console.error('Error fetching squadron ranking:', error);
    } finally {
      setLoadingSquadrons(false);
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

          {/* Squadron Ranking */}
          <div className="mb-8">
            <h2 className="text-2xl font-racing text-gold mb-4">🏆 Ranking de Escuadrones</h2>
            {loadingSquadrons ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sky-blue/70">Cargando ranking...</p>
              </div>
            ) : squadrons.length === 0 ? (
              <div className="bg-racing-black/50 border border-gold/20 rounded-xl p-8 text-center">
                <p className="text-sky-blue/70">No hay escuadrones registrados</p>
              </div>
            ) : (
              <div className="bg-racing-black/50 border border-gold/20 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gold/10 border-b border-gold/20">
                        <th className="px-6 py-4 text-left text-gold font-racing">Pos</th>
                        <th className="px-6 py-4 text-left text-gold font-racing">Escuadrón</th>
                        <th className="px-6 py-4 text-center text-gold font-racing">Miembros</th>
                        <th className="px-6 py-4 text-right text-gold font-racing">Puntos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {squadrons.map((squadron, index) => (
                        <tr
                          key={squadron._id}
                          className={`border-b border-gold/10 hover:bg-gold/5 transition-colors ${
                            index === 0 ? 'bg-yellow-500/10' :
                            index === 1 ? 'bg-gray-400/10' :
                            index === 2 ? 'bg-orange-600/10' :
                            ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {index === 0 && <span className="text-3xl">🥇</span>}
                              {index === 1 && <span className="text-3xl">🥈</span>}
                              {index === 2 && <span className="text-3xl">🥉</span>}
                              {index > 2 && (
                                <span className="text-xl font-bold text-sky-blue/70">{squadron.position}°</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {squadron.logo && (
                                <img
                                  src={squadron.logo}
                                  alt={squadron.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              )}
                              <div>
                                <p className="font-bold text-white text-lg">{squadron.name}</p>
                                {squadron.tag && (
                                  <p className="text-sm text-sky-blue/70">[{squadron.tag}]</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-3 py-1 bg-electric-blue/20 text-electric-blue rounded-full text-sm font-bold">
                              {squadron.memberCount} pilotos
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`text-2xl font-bold ${
                              index === 0 ? 'text-yellow-400' :
                              index === 1 ? 'text-gray-300' :
                              index === 2 ? 'text-orange-400' :
                              'text-electric-blue'
                            }`}>
                              {squadron.totalPoints.toLocaleString()} pts
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
