'use client';

import { useState } from 'react';
import InvitePilotModal from './InvitePilotModal';
import JoinRequestsModal from './JoinRequestsModal';
import EditSquadronModal from './EditSquadronModal';
import SentInvitationsCard from './SentInvitationsCard';

interface Member {
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
}

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
  members: Member[];
  stats: {
    memberCount: number;
    availableSpots: number;
    isFull: boolean;
    winRate: string;
    averageFairRacing: number;
  };
}

interface SquadronDashboardViewProps {
  squadron: Squadron;
  isCaptain: boolean;
  onLeave: () => void;
  onTransferCaptain: (newCaptainId: string) => void;
  token: string;
}

export default function SquadronDashboardView({
  squadron,
  isCaptain,
  onLeave,
  onTransferCaptain,
  token,
}: SquadronDashboardViewProps) {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleLeave = async () => {
    if (!confirm('¿Estás seguro de que quieres abandonar esta escudería?')) return;

    setIsLeaving(true);
    setError('');
    try {
      const response = await fetch('/api/squadron/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        // Reload page to clear all cached data
        window.location.reload();
      } else {
        setError(data.error || 'Error al abandonar la escudería');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsLeaving(false);
    }
  };

  const handleDeleteSquadron = async () => {
    if (!confirm(`¿Estás seguro de que quieres ELIMINAR PERMANENTEMENTE la escudería "${squadron.name}"?\n\nEsta acción NO SE PUEDE DESHACER y todos los miembros serán expulsados.`)) return;

    setIsDeleting(true);
    setError('');
    try {
      const response = await fetch('/api/squadron/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        // Reload page to clear all cached data
        window.location.reload();
      } else {
        setError(data.error || 'Error al eliminar la escudería');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`¿Expulsar a ${memberName} de la escudería?`)) return;

    setIsRemoving(true);
    setError('');
    try {
      const response = await fetch('/api/squadron/remove-member', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ memberId }),
      });
      const data = await response.json();

      if (data.success) {
        onTransferCaptain(''); // Trigger refresh
      } else {
        setError(data.error || 'Error al expulsar miembro');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleTransferCaptain = async () => {
    if (!selectedMember) return;

    setIsTransferring(true);
    setError('');
    try {
      const response = await fetch('/api/squadron/transfer-captain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ newCaptainId: selectedMember }),
      });
      const data = await response.json();

      if (data.success) {
        setShowTransferModal(false);
        onTransferCaptain(selectedMember);
      } else {
        setError(data.error || 'Error al transferir capitanía');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setIsTransferring(false);
    }
  };

  const getDivisionIcon = (division: string) => {
    switch (division) {
      case 'Elite':
        return '👑';
      case 'Masters':
        return '⭐';
      case 'Pro':
        return '🔥';
      case 'Open':
        return '🚀';
      default:
        return '📊';
    }
  };

  const getMemberDisplayName = (member: Member) => {
    if (member.profile?.alias) return member.profile.alias;
    if (member.profile?.firstName && member.profile?.lastName) {
      return `${member.profile.firstName} ${member.profile.lastName}`;
    }
    return member.email.split('@')[0];
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {/* Sent Invitations Card */}
      <SentInvitationsCard token={token} isCaptain={isCaptain} />

      {/* Header Card */}
      <div className="bg-gradient-to-br from-midnight via-rb-blue/20 to-midnight border-2 border-electric-blue/50 rounded-xl p-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(0, 212, 255, 0.3) 2px, transparent 2px)',
            backgroundSize: '50px 50px',
          }}
        />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              {/* Squadron Colors */}
              <div className="flex gap-2">
                <div
                  className="w-12 h-12 rounded-lg border-2 border-white/30"
                  style={{ backgroundColor: squadron.colors.primary }}
                />
                <div
                  className="w-12 h-12 rounded-lg border-2 border-white/30"
                  style={{ backgroundColor: squadron.colors.secondary }}
                />
              </div>

              <div>
                <h2 className="text-3xl font-racing text-electric-blue">{squadron.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-lg">
                    {getDivisionIcon(squadron.division)} {squadron.division}
                  </span>
                  <span className="text-sky-blue/70 text-sm">
                    Ranking #{squadron.ranking}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              {isCaptain && (
                <>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="px-3 py-1 bg-electric-blue/20 text-electric-blue border border-electric-blue/50 rounded-lg text-sm font-racing hover:bg-electric-blue/30 transition-all"
                  >
                    ✏️ EDITAR
                  </button>
                  <span className="px-3 py-1 bg-gold/20 text-gold border border-gold/50 rounded-lg text-sm font-racing">
                    👑 CAPITÁN
                  </span>
                </>
              )}
            </div>
          </div>

          <p className="text-sky-blue/80 mb-6">{squadron.description}</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-midnight/50 rounded-lg p-4 border border-electric-blue/20">
              <p className="text-sky-blue/50 text-xs mb-1">PUNTOS TOTALES</p>
              <p className="text-2xl font-digital text-gold">{squadron.totalPoints}</p>
            </div>
            <div className="bg-midnight/50 rounded-lg p-4 border border-electric-blue/20">
              <p className="text-sky-blue/50 text-xs mb-1">FAIR RACING</p>
              <p className="text-2xl font-digital text-electric-blue">
                {squadron.fairRacingAverage.toFixed(0)}
              </p>
            </div>
            <div className="bg-midnight/50 rounded-lg p-4 border border-electric-blue/20">
              <p className="text-sky-blue/50 text-xs mb-1">WIN RATE</p>
              <p className="text-2xl font-digital text-sky-blue">{squadron.stats.winRate}</p>
            </div>
            <div className="bg-midnight/50 rounded-lg p-4 border border-electric-blue/20">
              <p className="text-sky-blue/50 text-xs mb-1">MIEMBROS</p>
              <p className="text-2xl font-digital text-electric-blue">
                {squadron.stats.memberCount}/4
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Members Section */}
      <div className="bg-gradient-to-br from-midnight via-rb-blue/20 to-midnight border-2 border-electric-blue/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-racing text-electric-blue">MIEMBROS DEL EQUIPO</h3>
          {isCaptain && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowRequestsModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all"
              >
                📨 Solicitudes
              </button>
              {squadron.members.length < 4 && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-electric-blue to-cyan-400 text-midnight font-bold rounded-lg hover:shadow-lg hover:shadow-electric-blue/50 transition-all"
                >
                  + Invitar Piloto
                </button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3">
          {squadron.members.map((member) => (
            <div
              key={member._id}
              className="bg-midnight/50 border border-electric-blue/20 rounded-lg p-4 flex items-center justify-between hover:border-electric-blue/40 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-electric-blue to-cyan-400 flex items-center justify-center text-midnight font-racing text-xl">
                  {getMemberDisplayName(member)[0].toUpperCase()}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg text-sky-blue font-digital">
                      {getMemberDisplayName(member)}
                    </p>
                    {member.role === 'captain' && (
                      <span className="text-gold text-sm">👑</span>
                    )}
                  </div>
                  <p className="text-sky-blue/50 text-sm">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-sky-blue/50">Fair Racing</p>
                  <p className="text-xl font-digital text-electric-blue">
                    {member.currentScore}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-sky-blue/50">Carreras Limpias</p>
                  <p className="text-xl font-digital text-gold">
                    {member.totalRacesClean}
                  </p>
                </div>
                {isCaptain && member.role !== 'captain' && (
                  <button
                    onClick={() => handleRemoveMember(member._id, getMemberDisplayName(member))}
                    disabled={isRemoving}
                    className="px-3 py-2 bg-red-500/20 border border-red-500/50 text-red-300 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 text-sm"
                  >
                    🚫 Expulsar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Captain Controls */}
      {isCaptain && (
        <div className="bg-gradient-to-br from-midnight via-gold/10 to-midnight border-2 border-gold/50 rounded-xl p-6">
          <h3 className="text-2xl font-racing text-gold mb-4">👑 PANEL DE CAPITÁN</h3>

          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => setShowTransferModal(true)}
              disabled={squadron.members.length < 2}
              className="px-6 py-3 bg-gold/20 border border-gold/50 text-gold font-racing rounded-lg hover:bg-gold/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ↔️ TRANSFERIR CAPITANÍA
            </button>

            <button className="px-6 py-3 bg-electric-blue/20 border border-electric-blue/50 text-electric-blue font-racing rounded-lg hover:bg-electric-blue/30 transition-all">
              ✉️ INVITAR PILOTO
            </button>
          </div>
        </div>
      )}

      {/* Leave Squadron */}
      <div className="bg-gradient-to-br from-midnight via-red-900/10 to-midnight border-2 border-red-500/30 rounded-xl p-6">
        <h3 className="text-xl font-racing text-red-400 mb-2">ZONA PELIGROSA</h3>
        <p className="text-sky-blue/70 text-sm mb-4">
          {isCaptain
            ? 'Como capitán, puedes abandonar la escudería (si eres el único) o eliminarla permanentemente.'
            : 'Si abandonas, deberás unirte a otra escudería o crear una nueva.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleLeave}
            disabled={isLeaving || isDeleting || (isCaptain && squadron.members.length > 1)}
            className="px-6 py-3 bg-red-500/20 border border-red-500 text-red-300 font-racing rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLeaving ? 'ABANDONANDO...' : '🚪 ABANDONAR'}
          </button>
          {isCaptain && (
            <button
              onClick={handleDeleteSquadron}
              disabled={isDeleting || isLeaving}
              className="px-6 py-3 bg-red-700/30 border-2 border-red-600 text-red-200 font-racing rounded-lg hover:bg-red-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'ELIMINANDO...' : '💀 ELIMINAR ESCUDERÍA'}
            </button>
          )}
        </div>
      </div>

      {/* Transfer Captain Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-gradient-to-br from-midnight via-gold/20 to-midnight border-2 border-gold/50 rounded-xl p-6">
            <h3 className="text-2xl font-racing text-gold mb-4">TRANSFERIR CAPITANÍA</h3>
            <p className="text-sky-blue/70 text-sm mb-4">
              Selecciona el nuevo capitán de la escudería:
            </p>

            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
              {squadron.members
                .filter((m) => m.role !== 'captain')
                .map((member) => (
                  <button
                    key={member._id}
                    onClick={() => setSelectedMember(member._id)}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      selectedMember === member._id
                        ? 'border-gold bg-gold/20'
                        : 'border-electric-blue/30 bg-midnight/50 hover:border-electric-blue/60'
                    }`}
                  >
                    <p className="text-sky-blue font-digital">{getMemberDisplayName(member)}</p>
                    <p className="text-sky-blue/50 text-xs">{member.email}</p>
                  </button>
                ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTransferModal(false)}
                disabled={isTransferring}
                className="flex-1 px-4 py-2 border border-electric-blue/50 text-electric-blue rounded-lg hover:bg-electric-blue/10 transition-all"
              >
                CANCELAR
              </button>
              <button
                onClick={handleTransferCaptain}
                disabled={!selectedMember || isTransferring}
                className="flex-1 px-4 py-2 bg-gold text-midnight font-racing rounded-lg hover:bg-gold/90 transition-all disabled:opacity-50"
              >
                {isTransferring ? 'TRANSFIRIENDO...' : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Pilot Modal */}
      <InvitePilotModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={() => {
          setShowInviteModal(false);
          onTransferCaptain(''); // Trigger refresh
        }}
        token={token}
      />

      {/* Join Requests Modal */}
      <JoinRequestsModal
        isOpen={showRequestsModal}
        onClose={() => setShowRequestsModal(false)}
        onSuccess={() => {
          onTransferCaptain(''); // Trigger refresh
        }}
        token={token}
      />

      {/* Edit Squadron Modal */}
      <EditSquadronModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => {
          setShowEditModal(false);
          onTransferCaptain(''); // Trigger refresh
        }}
        token={token}
        currentName={squadron.name}
        currentDescription={squadron.description}
        currentColors={squadron.colors}
        currentRecruitmentMode={squadron.recruitmentMode}
      />
    </div>
  );
}
