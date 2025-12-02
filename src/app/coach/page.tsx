'use client';

import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';

export default function CoachPage() {
  const { user, isCoach, isLoading } = useAuth();

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-midnight via-racing-black to-midnight flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin text-6xl mb-4">🏁</div>
            <p className="text-sky-blue/70">Cargando...</p>
          </div>
        </div>
      </>
    );
  }

  if (!isCoach) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-midnight via-racing-black to-midnight flex items-center justify-center">
          <div className="max-w-md mx-auto text-center p-8">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-3xl font-racing text-gold mb-4">ACCESO RESTRINGIDO</h1>
            <p className="text-sky-blue/70 mb-6">
              Esta página es solo para usuarios con rol de Coach.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-electric-blue/20 border border-electric-blue/50 text-electric-blue rounded-lg hover:bg-electric-blue/30 transition-all font-racing"
            >
              VOLVER AL INICIO
            </a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-midnight via-racing-black to-midnight p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-5xl">🏎️</span>
              <h1 className="text-4xl md:text-5xl font-racing text-gold">
                PANEL DE COACH
              </h1>
            </div>
            <p className="text-sky-blue/70 text-lg">
              Herramientas para entrenadores y análisis de rendimiento
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-midnight via-electric-blue/20 to-midnight border-2 border-electric-blue/50 rounded-xl p-6">
              <div className="text-3xl mb-2">👥</div>
              <h3 className="text-xl font-racing text-electric-blue mb-1">
                PILOTOS ACTIVOS
              </h3>
              <p className="text-4xl font-digital text-white">12</p>
              <p className="text-sky-blue/50 text-sm mt-2">En esta temporada</p>
            </div>

            <div className="bg-gradient-to-br from-midnight via-gold/20 to-midnight border-2 border-gold/50 rounded-xl p-6">
              <div className="text-3xl mb-2">🏁</div>
              <h3 className="text-xl font-racing text-gold mb-1">
                CARRERAS TOTALES
              </h3>
              <p className="text-4xl font-digital text-white">48</p>
              <p className="text-sky-blue/50 text-sm mt-2">Últimos 30 días</p>
            </div>

            <div className="bg-gradient-to-br from-midnight via-green-500/20 to-midnight border-2 border-green-500/50 rounded-xl p-6">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="text-xl font-racing text-green-400 mb-1">
                MEJORA PROMEDIO
              </h3>
              <p className="text-4xl font-digital text-white">+2.4%</p>
              <p className="text-sky-blue/50 text-sm mt-2">Tiempo de vuelta</p>
            </div>
          </div>

          {/* Main Sections */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Análisis de Pilotos */}
            <div className="bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 backdrop-blur-sm border-2 border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🎯</span>
                <h2 className="text-2xl font-racing text-white">
                  ANÁLISIS DE PILOTOS
                </h2>
              </div>
              <p className="text-slate-400 mb-4">
                Revisa el rendimiento individual de cada piloto y observa su progreso.
              </p>
              <button className="w-full px-4 py-3 bg-electric-blue/20 border border-electric-blue/50 text-electric-blue rounded-lg hover:bg-electric-blue/30 transition-all font-racing">
                VER ANÁLISIS DETALLADO
              </button>
            </div>

            {/* Gestión de Entrenamientos */}
            <div className="bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 backdrop-blur-sm border-2 border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📋</span>
                <h2 className="text-2xl font-racing text-white">
                  ENTRENAMIENTOS
                </h2>
              </div>
              <p className="text-slate-400 mb-4">
                Programa y gestiona sesiones de entrenamiento para tus pilotos.
              </p>
              <button className="w-full px-4 py-3 bg-gold/20 border border-gold/50 text-gold rounded-lg hover:bg-gold/30 transition-all font-racing">
                GESTIONAR ENTRENAMIENTOS
              </button>
            </div>

            {/* Comparación de Tiempos */}
            <div className="bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 backdrop-blur-sm border-2 border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">⏱️</span>
                <h2 className="text-2xl font-racing text-white">
                  COMPARACIÓN DE TIEMPOS
                </h2>
              </div>
              <p className="text-slate-400 mb-4">
                Compara tiempos de vuelta entre pilotos y analiza diferencias.
              </p>
              <button className="w-full px-4 py-3 bg-purple-500/20 border border-purple-500/50 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all font-racing">
                COMPARAR PILOTOS
              </button>
            </div>

            {/* Reportes */}
            <div className="bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 backdrop-blur-sm border-2 border-slate-700/50 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">📈</span>
                <h2 className="text-2xl font-racing text-white">
                  REPORTES
                </h2>
              </div>
              <p className="text-slate-400 mb-4">
                Genera reportes detallados de rendimiento y progreso.
              </p>
              <button className="w-full px-4 py-3 bg-green-500/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-500/30 transition-all font-racing">
                GENERAR REPORTES
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8 bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 backdrop-blur-sm border-2 border-slate-700/50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🕐</span>
              <h2 className="text-2xl font-racing text-white">
                ACTIVIDAD RECIENTE
              </h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-midnight/50 rounded-lg border border-slate-700/30">
                <div>
                  <p className="text-white font-medium">Juan Pérez mejoró su mejor tiempo</p>
                  <p className="text-slate-500 text-sm">Hace 2 horas • Categoría Cadete</p>
                </div>
                <span className="text-green-400 font-digital">-0.8s</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-midnight/50 rounded-lg border border-slate-700/30">
                <div>
                  <p className="text-white font-medium">Nueva sesión de entrenamiento programada</p>
                  <p className="text-slate-500 text-sm">Hace 5 horas • Escudería Rokkies</p>
                </div>
                <span className="text-electric-blue font-racing">📅</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-midnight/50 rounded-lg border border-slate-700/30">
                <div>
                  <p className="text-white font-medium">Reporte mensual generado</p>
                  <p className="text-slate-500 text-sm">Hace 1 día • 8 pilotos analizados</p>
                </div>
                <span className="text-gold font-racing">📊</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
