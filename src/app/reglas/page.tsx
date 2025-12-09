'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';

export default function ReglasPage() {
  const [activeTab, setActiveTab] = useState<'puntos' | 'conduccion'>('puntos');

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-racing text-electric-blue mb-2">📋 Reglas y Sistema de Puntos</h1>
          <p className="text-gray-400">Sistema de competencia de escuderías</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('puntos')}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === 'puntos'
                ? 'text-electric-blue border-b-2 border-electric-blue'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🏆 Sistema de Puntos
          </button>
          <button
            onClick={() => setActiveTab('conduccion')}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === 'conduccion'
                ? 'text-electric-blue border-b-2 border-electric-blue'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🚦 Reglas de Conducción
          </button>
        </div>

        {/* Content */}
        {activeTab === 'puntos' ? (
          <div className="space-y-8">
            {/* Categorías de Eventos */}
            <section className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
              <h2 className="text-2xl font-racing text-electric-blue mb-6">🏁 Categorías de Eventos de Escuderías</h2>

              <div className="space-y-6">
                {/* Grand Prix Élite */}
                <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 border border-yellow-500/30 rounded-lg p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-yellow-400">🥇 Grand Prix Élite</h3>
                    <span className="text-sm text-gray-400">(División Máxima)</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Puntos ganador:</span>
                      <span className="text-white font-bold ml-2">2500 pts</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Requisito:</span>
                      <span className="text-white ml-2">Top 20 escuderías</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Frecuencia:</span>
                      <span className="text-white ml-2">4 eventos/año</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Obligatorio para:</span>
                      <span className="text-white ml-2">Top 10 escuderías</span>
                    </div>
                  </div>
                </div>

                {/* Racing Masters */}
                <div className="bg-gradient-to-r from-gray-400/10 to-gray-500/5 border border-gray-400/30 rounded-lg p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-gray-300">🥈 Racing Masters</h3>
                    <span className="text-sm text-gray-400">(División Alta)</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Puntos ganador:</span>
                      <span className="text-white font-bold ml-2">1500 pts</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Requisito:</span>
                      <span className="text-white ml-2">Top 50 escuderías</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Frecuencia:</span>
                      <span className="text-white ml-2">8 eventos/año</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Obligatorio para:</span>
                      <span className="text-white ml-2">Top 25 escuderías</span>
                    </div>
                  </div>
                </div>

                {/* Pro Championship */}
                <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-500/30 rounded-lg p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-orange-400">🥉 Pro Championship</h3>
                    <span className="text-sm text-gray-400">(División Media)</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Puntos ganador:</span>
                      <span className="text-white font-bold ml-2">800 pts</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Requisito:</span>
                      <span className="text-white ml-2">Top 100 escuderías</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Frecuencia:</span>
                      <span className="text-white ml-2">12 eventos/año</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Acceso:</span>
                      <span className="text-white ml-2">Escuderías calificadas</span>
                    </div>
                  </div>
                </div>

                {/* Open Series */}
                <div className="bg-gradient-to-r from-cyan-500/10 to-cyan-600/5 border border-cyan-500/30 rounded-lg p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-cyan-400">🏁 Open Series</h3>
                    <span className="text-sm text-gray-400">(División Básica)</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Puntos ganador:</span>
                      <span className="text-white font-bold ml-2">400 pts</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Requisito:</span>
                      <span className="text-white ml-2">Mínimo 2 pilotos</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Frecuencia:</span>
                      <span className="text-white ml-2">20+ eventos/año</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Acceso:</span>
                      <span className="text-white ml-2">Sin restricciones</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Distribución de Puntos */}
            <section className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
              <h2 className="text-2xl font-racing text-electric-blue mb-6">📊 Distribución de Puntos por Posición de Escudería</h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex justify-between items-center py-2 border-b border-slate-700">
                    <span className="text-yellow-400 font-bold">🥇 1° lugar</span>
                    <span className="text-white font-bold">100%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-700">
                    <span className="text-gray-300 font-bold">🥈 2° lugar</span>
                    <span className="text-white font-bold">65%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-700">
                    <span className="text-orange-400 font-bold">🥉 3° lugar</span>
                    <span className="text-white font-bold">45%</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-400">4° lugar</span>
                    <span className="text-white">30%</span>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex justify-between items-center py-2 border-b border-slate-700">
                    <span className="text-gray-400">5°-8° lugar</span>
                    <span className="text-white">20%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-700">
                    <span className="text-gray-400">9°-16° lugar</span>
                    <span className="text-white">10%</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-400">17° en adelante</span>
                    <span className="text-white">5%</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Cálculo de Posición */}
            <section className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
              <h2 className="text-2xl font-racing text-electric-blue mb-6">🧮 Cálculo de Posición de Escudería</h2>

              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-4">Sistema de puntos por posición individual (hasta 20 autos):</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {[
                    { pos: 1, pts: 25 }, { pos: 2, pts: 22 }, { pos: 3, pts: 20 }, { pos: 4, pts: 18 },
                    { pos: 5, pts: 16 }, { pos: 6, pts: 15 }, { pos: 7, pts: 14 }, { pos: 8, pts: 13 },
                    { pos: 9, pts: 12 }, { pos: 10, pts: 11 }, { pos: 11, pts: 10 }, { pos: 12, pts: 9 },
                    { pos: 13, pts: 8 }, { pos: 14, pts: 7 }, { pos: 15, pts: 6 }, { pos: 16, pts: 5 },
                    { pos: 17, pts: 4 }, { pos: 18, pts: 3 }, { pos: 19, pts: 2 }, { pos: 20, pts: 1 }
                  ].map(({ pos, pts }) => (
                    <div key={pos} className="bg-slate-800/50 rounded p-2 flex justify-between">
                      <span className="text-gray-400">{pos}°:</span>
                      <span className="text-white font-bold">{pts} pts</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-5">
                <h3 className="text-lg font-bold text-cyan-400 mb-3">📝 Ejemplos de Cálculo</h3>
                <div className="space-y-3 text-sm">
                  <div className="bg-slate-800/50 rounded p-3">
                    <div className="text-white font-bold mb-1">Escudería A: 4 pilotos en 2°, 5°, 8°, 12°</div>
                    <div className="text-gray-400">22 + 16 + 13 + 9 = <span className="text-green-400 font-bold">60 puntos</span></div>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3">
                    <div className="text-white font-bold mb-1">Escudería B: 3 pilotos en 1°, 3°, 7°</div>
                    <div className="text-gray-400">25 + 20 + 14 = <span className="text-yellow-400 font-bold">59 puntos</span></div>
                  </div>
                  <div className="bg-slate-800/50 rounded p-3">
                    <div className="text-white font-bold mb-1">Escudería C: 2 pilotos en 1°, 2°</div>
                    <div className="text-gray-400">25 + 22 = <span className="text-orange-400 font-bold">47 puntos</span></div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-cyan-500/30">
                  <h4 className="text-white font-bold mb-2">Criterios de desempate:</h4>
                  <ol className="list-decimal list-inside text-gray-400 space-y-1">
                    <li>Mayor puntuación total (suma directa)</li>
                    <li>Mejor posición individual (el piloto mejor ubicado de cada escudería)</li>
                  </ol>
                </div>
              </div>
            </section>

            {/* Ranking Oficial */}
            <section className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
              <h2 className="text-2xl font-racing text-electric-blue mb-6">🏆 Ranking Oficial de Escuderías</h2>

              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 text-xl">📅</span>
                  <div>
                    <div className="text-white font-bold">Período activo</div>
                    <div className="text-gray-400">Últimos 12 meses (52 semanas)</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 text-xl">🧮</span>
                  <div>
                    <div className="text-white font-bold">Cálculo</div>
                    <div className="text-gray-400">Mejores 15 resultados de la escudería en el año</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 text-xl">🔄</span>
                  <div>
                    <div className="text-white font-bold">Actualización</div>
                    <div className="text-gray-400">Cada lunes después de eventos del fin de semana</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-cyan-400 text-xl">⏳</span>
                  <div>
                    <div className="text-white font-bold">Decaimiento temporal</div>
                    <div className="text-gray-400">Resultados más antiguos pierden valor gradualmente</div>
                  </div>
                </div>
              </div>
            </section>

          </div>
        ) : (
          <div className="space-y-8">
            {/* Placeholder for Reglas de Conducción */}
            <section className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6">
              <h2 className="text-2xl font-racing text-electric-blue mb-6">🚦 Reglas de Conducción</h2>
              <div className="text-center py-12 text-gray-400">
                <div className="text-6xl mb-4">🚧</div>
                <p className="text-xl">Sección en desarrollo</p>
                <p className="text-sm mt-2">Las reglas de conducción se agregarán próximamente</p>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
