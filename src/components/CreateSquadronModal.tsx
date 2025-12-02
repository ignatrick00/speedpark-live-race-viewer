'use client';

import { useState } from 'react';

interface CreateSquadronModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
}

const PRESET_COLORS = [
  { name: 'Electric Blue', primary: '#00D4FF', secondary: '#0057B8' },
  { name: 'Gold Rush', primary: '#FFD700', secondary: '#FF8C00' },
  { name: 'Cyber Red', primary: '#FF0055', secondary: '#8B0000' },
  { name: 'Neon Green', primary: '#39FF14', secondary: '#00FF00' },
  { name: 'Purple Haze', primary: '#9D00FF', secondary: '#4B0082' },
  { name: 'Hot Pink', primary: '#FF1493', secondary: '#C71585' },
];

export default function CreateSquadronModal({ isOpen, onClose, onSuccess, token }: CreateSquadronModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#00D4FF');
  const [secondaryColor, setSecondaryColor] = useState('#0057B8');
  const [recruitmentMode, setRecruitmentMode] = useState<'open' | 'invite-only'>('open');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');

  // Validación de nombre en tiempo real
  const handleNameChange = (value: string) => {
    setName(value);
    if (value.length < 3) {
      setNameError('Mínimo 3 caracteres');
    } else if (value.length > 30) {
      setNameError('Máximo 30 caracteres');
    } else {
      setNameError('');
    }
  };

  const handlePresetColor = (preset: typeof PRESET_COLORS[0]) => {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (nameError) return;
    if (name.length < 3 || name.length > 30) {
      setNameError('El nombre debe tener entre 3 y 30 caracteres');
      return;
    }

    setIsLoading(true);
    setError('');

    console.log('🏁 Creating squadron:', { name, description, colors: { primary: primaryColor, secondary: secondaryColor }, recruitmentMode });

    try {
      const response = await fetch('/api/squadron/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description,
          colors: {
            primary: primaryColor,
            secondary: secondaryColor,
          },
          recruitmentMode,
        }),
      });

      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Response data:', data);

      if (response.ok && data.success) {
        console.log('✅ Squadron created successfully');
        // Resetear form
        setName('');
        setDescription('');
        setPrimaryColor('#00D4FF');
        setSecondaryColor('#0057B8');
        setRecruitmentMode('open');
        onSuccess();
        onClose();
      } else {
        console.error('❌ Error creating squadron:', data.error);
        setError(data.error || 'Error al crear la escudería');
      }
    } catch (error) {
      console.error('❌ Connection error:', error);
      setError('Error de conexión: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName('');
      setDescription('');
      setError('');
      setNameError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={handleClose}>
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-gradient-to-br from-midnight via-rb-blue/20 to-midnight border-2 border-electric-blue/50 rounded-xl shadow-2xl animate-glow overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(0, 212, 255, 0.3) 2px, transparent 2px)',
            backgroundSize: '50px 50px',
          }}
        />

        <div className="relative z-10 p-6 md:p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-racing text-electric-blue tracking-wider mb-2">
                CREAR ESCUDERÍA
              </h2>
              <p className="text-sky-blue/80 text-sm">
                Forma tu equipo de carreras competitivo
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-sky-blue/60 hover:text-electric-blue transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-400/40 rounded-md">
              <p className="text-red-300 text-sm font-digital">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-digital text-sky-blue mb-2">
                NOMBRE DE ESCUDERÍA *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                maxLength={30}
                className="w-full px-4 py-3 bg-midnight/80 border border-electric-blue/30 rounded-lg text-white placeholder-sky-blue/50 font-digital focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-electric-blue transition-all"
                placeholder="Velocity Racing"
              />
              <div className="flex justify-between mt-1">
                {nameError && (
                  <p className="text-red-400 text-xs font-digital">{nameError}</p>
                )}
                <p className="text-sky-blue/60 text-xs font-digital ml-auto">
                  {name.length}/30
                </p>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-digital text-sky-blue mb-2">
                DESCRIPCIÓN (Opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full px-4 py-3 bg-midnight/80 border border-electric-blue/30 rounded-lg text-white placeholder-sky-blue/50 font-digital focus:outline-none focus:ring-2 focus:ring-electric-blue focus:border-electric-blue transition-all resize-none"
                placeholder="Escudería enfocada en velocidad y trabajo en equipo..."
              />
              <p className="text-sky-blue/60 text-xs font-digital mt-1 text-right">
                {description.length}/500
              </p>
            </div>

            {/* Colores */}
            <div>
              <label className="block text-sm font-digital text-sky-blue mb-3">
                COLORES DE ESCUDERÍA
              </label>

              {/* Presets */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handlePresetColor(preset)}
                    className="group relative p-3 bg-midnight/50 border border-electric-blue/20 rounded-lg hover:border-electric-blue/50 transition-all"
                  >
                    <div className="flex gap-2 items-center">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white/20"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white/20"
                        style={{ backgroundColor: preset.secondary }}
                      />
                    </div>
                    <p className="text-xs text-sky-blue/60 mt-1 font-digital">{preset.name}</p>
                  </button>
                ))}
              </div>

              {/* Color pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-digital text-sky-blue/80 mb-2">
                    Color Primario
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-16 h-12 bg-midnight border-2 border-electric-blue/30 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-3 py-2 bg-midnight/80 border border-electric-blue/30 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue"
                      placeholder="#00D4FF"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-digital text-sky-blue/80 mb-2">
                    Color Secundario
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-16 h-12 bg-midnight border-2 border-electric-blue/30 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 px-3 py-2 bg-midnight/80 border border-electric-blue/30 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue"
                      placeholder="#0057B8"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-4 p-4 bg-midnight/50 border rounded-lg" style={{ borderColor: primaryColor }}>
                <p className="text-xs font-digital text-sky-blue/60 mb-2">VISTA PREVIA</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full border-2"
                    style={{
                      background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                      borderColor: primaryColor,
                    }}
                  />
                  <div>
                    <p className="font-racing text-xl" style={{ color: primaryColor }}>
                      {name || 'Tu Escudería'}
                    </p>
                    <p className="text-sm" style={{ color: secondaryColor }}>
                      División Open
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modo de reclutamiento */}
            <div>
              <label className="block text-sm font-digital text-sky-blue mb-3">
                MODO DE RECLUTAMIENTO
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRecruitmentMode('open')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    recruitmentMode === 'open'
                      ? 'border-electric-blue bg-electric-blue/10'
                      : 'border-electric-blue/20 hover:border-electric-blue/40'
                  }`}
                >
                  <p className="font-digital text-electric-blue mb-1">🌐 ABIERTA</p>
                  <p className="text-xs text-sky-blue/70">
                    Cualquiera puede unirse
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setRecruitmentMode('invite-only')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    recruitmentMode === 'invite-only'
                      ? 'border-electric-blue bg-electric-blue/10'
                      : 'border-electric-blue/20 hover:border-electric-blue/40'
                  }`}
                >
                  <p className="font-digital text-electric-blue mb-1">🔒 SOLO INVITACIÓN</p>
                  <p className="text-xs text-sky-blue/70">
                    Solo por invitación del capitán
                  </p>
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 px-6 py-3 border-2 border-electric-blue/30 text-electric-blue font-bold rounded-lg hover:bg-electric-blue/10 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading || !!nameError || name.length < 3}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-electric-blue to-cyan-400 text-midnight font-bold rounded-lg hover:shadow-lg hover:shadow-electric-blue/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creando...' : 'Crear Escudería'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
