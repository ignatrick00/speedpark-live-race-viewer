'use client';

import { useState, useEffect, useRef } from 'react';
import { uploadSquadronLogoWithProgress } from '@/lib/image-upload';

interface EditSquadronModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
  currentName: string;
  currentDescription: string;
  currentColors: {
    primary: string;
    secondary: string;
  };
  currentRecruitmentMode: 'open' | 'invite-only';
  currentLogo?: string;
  squadronId: string;
}

export default function EditSquadronModal({
  isOpen,
  onClose,
  onSuccess,
  token,
  currentName,
  currentDescription,
  currentColors,
  currentRecruitmentMode,
  currentLogo,
  squadronId,
}: EditSquadronModalProps) {
  const [name, setName] = useState(currentName);
  const [description, setDescription] = useState(currentDescription);
  const [primaryColor, setPrimaryColor] = useState(currentColors.primary);
  const [secondaryColor, setSecondaryColor] = useState(currentColors.secondary);
  const [recruitmentMode, setRecruitmentMode] = useState<'open' | 'invite-only'>(currentRecruitmentMode);
  const [logo, setLogo] = useState(currentLogo || '');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setDescription(currentDescription);
      setPrimaryColor(currentColors.primary);
      setSecondaryColor(currentColors.secondary);
      setRecruitmentMode(currentRecruitmentMode);
      setLogo(currentLogo || '');
      setError('');
    }
  }, [isOpen, currentName, currentDescription, currentColors, currentRecruitmentMode, currentLogo]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Imagen muy grande (máx 5MB)');
      return;
    }

    setUploadingLogo(true);
    setUploadProgress(0);
    setError('');

    try {
      // Upload to R2
      const result = await uploadSquadronLogoWithProgress(
        file,
        squadronId,
        token,
        (progress) => setUploadProgress(progress)
      );

      if (!result.success) {
        setError(result.error || 'Error al subir imagen');
        return;
      }

      // Update logo in database
      const response = await fetch('/api/squadron/update-logo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ logoUrl: result.url }),
      });

      const data = await response.json();

      if (data.success) {
        setLogo(result.url!);
        setError('');
      } else {
        setError(data.error || 'Error al guardar logo');
      }
    } catch (error) {
      setError('Error de conexión');
    } finally {
      setUploadingLogo(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/squadron/update', {
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

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Error al actualizar escudería');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl bg-gradient-to-br from-midnight via-rb-blue/20 to-midnight border-2 border-electric-blue/50 rounded-xl shadow-2xl animate-glow overflow-hidden"
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

        <div className="relative z-10 p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-racing text-electric-blue tracking-wider mb-2">
                EDITAR ESCUDERÍA
              </h2>
              <p className="text-sky-blue/70 text-sm">Actualiza la información de tu equipo</p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-sky-blue hover:text-electric-blue transition-colors text-2xl disabled:opacity-50"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Squadron Name */}
            <div>
              <label className="block text-sky-blue text-sm mb-2">Nombre de la Escudería</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={3}
                maxLength={30}
                required
                className="w-full px-4 py-3 bg-midnight/80 border border-electric-blue/30 rounded-lg text-sky-blue placeholder-sky-blue/40 focus:outline-none focus:border-electric-blue font-digital"
              />
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sky-blue text-sm mb-2">Logo de la Escudería</label>
              <div className="flex items-center gap-4">
                {/* Logo Preview */}
                <div className="relative group">
                  {logo ? (
                    <img
                      src={logo}
                      alt="Logo"
                      className="w-24 h-24 rounded-lg border-2 border-electric-blue/50 object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg border-2 border-electric-blue/50 bg-midnight/50 flex items-center justify-center">
                      <span className="text-4xl">🏁</span>
                    </div>
                  )}

                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-electric-blue text-sm mb-1">{uploadProgress}%</div>
                        <div className="w-16 h-1 bg-midnight rounded-full overflow-hidden">
                          <div
                            className="h-full bg-electric-blue transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo || loading}
                    className="px-4 py-2 bg-electric-blue/20 text-electric-blue border border-electric-blue/50 rounded-lg hover:bg-electric-blue/30 transition-all disabled:opacity-50 font-racing text-sm"
                  >
                    {uploadingLogo ? 'SUBIENDO...' : logo ? '📷 CAMBIAR LOGO' : '📷 SUBIR LOGO'}
                  </button>
                  <p className="text-xs text-sky-blue/50 mt-2">
                    JPG, PNG, WebP o GIF • Máx 5MB
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sky-blue text-sm mb-2">Descripción</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full px-4 py-3 bg-midnight/80 border border-electric-blue/30 rounded-lg text-sky-blue placeholder-sky-blue/40 focus:outline-none focus:border-electric-blue font-digital resize-none"
              />
              <p className="text-xs text-sky-blue/50 mt-1">{description.length}/500 caracteres</p>
            </div>

            {/* Colors */}
            <div>
              <label className="block text-sky-blue text-sm mb-2">Colores del Equipo</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sky-blue/70 text-xs mb-2">Color Primario</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-16 h-16 rounded border-2 border-electric-blue/30 cursor-pointer"
                    />
                    <div
                      className="flex-1 h-16 rounded border-2 border-white/20"
                      style={{ backgroundColor: primaryColor }}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sky-blue/70 text-xs mb-2">Color Secundario</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-16 h-16 rounded border-2 border-electric-blue/30 cursor-pointer"
                    />
                    <div
                      className="flex-1 h-16 rounded border-2 border-white/20"
                      style={{ backgroundColor: secondaryColor }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recruitment Mode */}
            <div>
              <label className="block text-sky-blue text-sm mb-2">Modo de Reclutamiento</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRecruitmentMode('open')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    recruitmentMode === 'open'
                      ? 'border-electric-blue bg-electric-blue/20'
                      : 'border-electric-blue/30 bg-midnight/50 hover:border-electric-blue/60'
                  }`}
                >
                  <p className="text-lg mb-1">🔓 Abierto</p>
                  <p className="text-xs text-sky-blue/70">Cualquiera puede unirse</p>
                </button>
                <button
                  type="button"
                  onClick={() => setRecruitmentMode('invite-only')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    recruitmentMode === 'invite-only'
                      ? 'border-electric-blue bg-electric-blue/20'
                      : 'border-electric-blue/30 bg-midnight/50 hover:border-electric-blue/60'
                  }`}
                >
                  <p className="text-lg mb-1">🔐 Solo Invitación</p>
                  <p className="text-xs text-sky-blue/70">Requiere solicitud</p>
                </button>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-6 py-3 border border-electric-blue/50 text-electric-blue rounded-lg hover:bg-electric-blue/10 transition-all disabled:opacity-50 font-racing"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-electric-blue to-cyan-400 text-midnight font-racing rounded-lg hover:shadow-lg hover:shadow-electric-blue/50 transition-all disabled:opacity-50"
              >
                {loading ? 'GUARDANDO...' : '✓ GUARDAR'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
