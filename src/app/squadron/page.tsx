'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/Navbar';
import CreateSquadronModal from '@/components/CreateSquadronModal';

interface Squadron {
  _id: string;
  squadronId: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
  };
  division: 'Elite' | 'Masters' | 'Pro' | 'Open';
  ranking: number;
  totalPoints: number;
  fairRacingAverage: number;
  members: Array<{
    _id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
      alias?: string;
    };
    role: string;
    joinedAt: string;
    currentScore: number;
    totalRacesClean: number;
  }>;
  stats: {
    memberCount: number;
    availableSpots: number;
    isFull: boolean;
    winRate: string;
    averageFairRacing: number;
  };
}

export default function SquadronDashboard() {
  const { user, token, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [hasSquadron, setHasSquadron] = useState(false);
  const [squadron, setSquadron] = useState<Squadron | null>(null);
  const [isCaptain, setIsCaptain] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !token) {
      setLoading(false);
      return;
    }
    fetchMySquadron();
  }, [user, token, authLoading]);

  const fetchMySquadron = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch('/api/squadron/my-squadron', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setHasSquadron(data.hasSquadron);
        setSquadron(data.squadron || null);
        setIsCaptain(data.isCaptain || false);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-electric-blue mx-auto"></div>
            <p className="mt-4 text-electric-blue font-digital">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-3xl font-racing text-electric-blue mb-4">ACCESO RESTRINGIDO</h2>
            <p className="text-sky-blue mb-6">Debes iniciar sesión</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(0, 212, 255, 0.1) 2px, transparent 2px)', backgroundSize: '100px 100px'}} />
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-600/15 rounded-full blur-2xl animate-pulse"></div>
      </div>
      <Navbar />
      <div className="relative z-10">
        <div className="border-b border-electric-blue/30 bg-gradient-to-r from-midnight via-rb-blue/10 to-midnight">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-4xl font-racing text-electric-blue tracking-wider">SQUADRON COMMAND</h1>
            <p className="text-sky-blue/80 mt-2">Sistema de Escuderías</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!hasSquadron ? (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-midnight via-rb-blue/20 to-midnight border-2 border-electric-blue/50 rounded-xl p-8 text-center">
                <div className="mb-6">
                  <h2 className="text-3xl font-racing text-electric-blue mb-2">SIN ESCUDERÍA</h2>
                  <p className="text-sky-blue/80">No perteneces a ninguna escudería</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="group relative px-8 py-6 bg-gradient-to-r from-electric-blue to-cyan-400 text-midnight font-racing text-xl rounded-lg hover:shadow-lg hover:shadow-electric-blue/50 transition-all"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-electric-blue opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
                    <div className="relative">
                      🏁 CREAR NUEVA ESCUDERÍA
                    </div>
                  </button>

                  <button className="px-8 py-6 border-2 border-electric-blue/50 text-electric-blue font-racing text-xl rounded-lg hover:bg-electric-blue/10 transition-all">
                    🔍 BUSCAR ESCUDERÍAS
                  </button>
                </div>

                <div className="mt-8 grid md:grid-cols-3 gap-4 text-left">
                  <div className="p-4 bg-midnight/50 border border-electric-blue/20 rounded-lg">
                    <p className="text-electric-blue font-digital text-sm mb-1">👥 EQUIPO</p>
                    <p className="text-sky-blue/70 text-xs">Forma un equipo de 2-4 pilotos</p>
                  </div>
                  <div className="p-4 bg-midnight/50 border border-electric-blue/20 rounded-lg">
                    <p className="text-electric-blue font-digital text-sm mb-1">🏆 COMPETICIÓN</p>
                    <p className="text-sky-blue/70 text-xs">Compite en 4 divisiones</p>
                  </div>
                  <div className="p-4 bg-midnight/50 border border-electric-blue/20 rounded-lg">
                    <p className="text-electric-blue font-digital text-sm mb-1">⚡ FAIR RACING</p>
                    <p className="text-sky-blue/70 text-xs">Mantén un puntaje limpio</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-white">
              <h2 className="text-2xl font-racing text-electric-blue">{squadron?.name}</h2>
              <p className="text-sky-blue/80">{squadron?.description}</p>
            </div>
          )}
        </div>
      </div>

      <CreateSquadronModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchMySquadron();
          setIsCreateModalOpen(false);
        }}
        token={token || ''}
      />
    </div>
  );
}
