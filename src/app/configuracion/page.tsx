'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Image from 'next/image';

interface ProfileData {
  email: string;
  firstName: string;
  lastName: string;
  linkedDriverName: string | null;
  linkedStatus: 'pending_first_race' | 'linked' | 'verification_failed';
  photoUrl: string | null;
  birthDate: string | null;
  whatsappNumber: string | null;
}

export default function ConfiguracionPage() {
  const { user, token, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form fields
  const [birthDate, setBirthDate] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Messages
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  // Load profile data
  useEffect(() => {
    if (token && isAuthenticated) {
      loadProfile();
    }
  }, [token, isAuthenticated]);

  const loadProfile = async (forceReload = false) => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success && data.profile) {
        console.log('👤 Profile loaded:', {
          photoUrl: data.profile.photoUrl,
          forceReload
        });

        setProfileData(data.profile);
        setBirthDate(data.profile.birthDate ? new Date(data.profile.birthDate).toISOString().split('T')[0] : '');

        // Add timestamp if forceReload is true to bypass browser cache
        if (data.profile.photoUrl) {
          const photoUrl = forceReload
            ? `${data.profile.photoUrl}?t=${Date.now()}`
            : data.profile.photoUrl;
          console.log('🖼️ Setting photo preview to:', photoUrl);
          setPhotoPreview(photoUrl);
        } else {
          console.log('❌ No photo URL in profile');
          setPhotoPreview(null);
        }
      } else {
        setErrorMessage('Error al cargar perfil');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setErrorMessage('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Solo se permiten imágenes');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Imagen muy grande (máx 5MB)');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setErrorMessage('');

      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch('/api/user/profile-photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      console.log('📸 Upload response:', data);

      if (data.success) {
        console.log('✅ Photo uploaded successfully:', data.url);
        setSuccessMessage('Foto actualizada exitosamente');
        setSelectedFile(null);

        // Reload profile with forceReload=true to bypass cache
        await loadProfile(true);

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        console.error('❌ Upload failed:', data.error);
        setErrorMessage(data.error || 'Error al subir foto');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setErrorMessage('Error de conexión al subir foto');
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm('¿Estás seguro de eliminar tu foto de perfil?')) return;

    try {
      setUploading(true);
      setErrorMessage('');

      const response = await fetch('/api/user/profile-photo', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Foto eliminada exitosamente');
        setPhotoPreview(null);
        setSelectedFile(null);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(data.error || 'Error al eliminar foto');
      }
    } catch (error) {
      console.error('Remove photo error:', error);
      setErrorMessage('Error de conexión');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          birthDate: birthDate || null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('Perfil actualizado exitosamente');
        loadProfile();
      } else {
        setErrorMessage(data.error || 'Error al actualizar perfil');
      }
    } catch (error) {
      console.error('Save profile error:', error);
      setErrorMessage('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE_MY_ACCOUNT') {
      setErrorMessage('Confirmación incorrecta');
      return;
    }

    try {
      setDeleting(true);
      setErrorMessage('');

      const response = await fetch('/api/user/profile', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          confirmation: 'DELETE_MY_ACCOUNT',
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Cuenta eliminada exitosamente. Serás redirigido a la página principal.');
        logout();
        router.push('/');
      } else {
        setErrorMessage(data.error || 'Error al eliminar cuenta');
      }
    } catch (error) {
      console.error('Delete account error:', error);
      setErrorMessage('Error de conexión');
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-electric-blue text-lg font-medium">CARGANDO...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !profileData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-midnight text-white">
      <Navbar />

      {/* Background Effects */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(0, 212, 255, 0.15) 2px, transparent 2px)',
            backgroundSize: '80px 80px'
          }}
        />
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-electric-blue/5 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-rb-blue/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto p-6">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="font-bold text-4xl md:text-6xl mb-3 tracking-wider bg-gradient-to-r from-electric-blue via-sky-blue to-karting-gold bg-clip-text text-transparent">
            ⚙️ CONFIGURACIÓN
          </h1>
          <p className="text-sky-blue/70">Gestiona tu perfil y preferencias</p>
        </header>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-500/10 border-2 border-green-500/40 rounded-xl p-4">
            <p className="text-green-400 text-center font-semibold">✅ {successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 bg-red-500/10 border-2 border-red-500/40 rounded-xl p-4">
            <p className="text-red-400 text-center font-semibold">❌ {errorMessage}</p>
          </div>
        )}

        {/* Profile Photo Section */}
        <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-electric-blue mb-6 flex items-center gap-2">
            📸 Foto de Perfil
          </h2>

          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Photo Preview */}
            <div className="relative">
              {photoPreview ? (
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-electric-blue/50">
                  <Image
                    key={photoPreview}
                    src={photoPreview}
                    alt="Profile photo"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-cyan-400/30 to-blue-500/30 border-4 border-electric-blue/50 flex items-center justify-center">
                  <span className="text-cyan-400 font-bold text-4xl">
                    {profileData.firstName.charAt(0)}{profileData.lastName.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="photoInput"
              />
              <label
                htmlFor="photoInput"
                className="inline-block px-6 py-3 bg-electric-blue/20 hover:bg-electric-blue/30 text-electric-blue border border-electric-blue/50 rounded-lg transition-all cursor-pointer font-medium mb-3"
              >
                📁 Seleccionar Foto
              </label>

              {selectedFile && (
                <button
                  onClick={handleUploadPhoto}
                  disabled={uploading}
                  className="ml-3 px-6 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/50 rounded-lg transition-all font-medium disabled:opacity-50"
                >
                  {uploading ? 'Subiendo...' : '✅ Subir Foto'}
                </button>
              )}

              {photoPreview && !selectedFile && (
                <button
                  onClick={handleRemovePhoto}
                  disabled={uploading}
                  className="ml-3 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded-lg transition-all font-medium disabled:opacity-50"
                >
                  🗑️ Eliminar Foto
                </button>
              )}

              <p className="text-sky-blue/60 text-sm mt-2">
                Formatos: JPG, PNG, WebP | Tamaño máx: 5MB
              </p>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-gradient-to-br from-racing-black/90 to-racing-black/70 border border-electric-blue/20 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-electric-blue mb-6 flex items-center gap-2">
            👤 Información Personal
          </h2>

          <div className="space-y-4">
            {/* Email (readonly) */}
            <div>
              <label className="block text-sky-blue/70 text-sm uppercase tracking-wider font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                value={profileData.email}
                readOnly
                className="w-full bg-black/30 border border-cyan-400/30 rounded-lg px-4 py-3 text-white font-medium cursor-not-allowed opacity-70"
              />
            </div>

            {/* Name (readonly) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sky-blue/70 text-sm uppercase tracking-wider font-medium mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  value={profileData.firstName}
                  readOnly
                  className="w-full bg-black/30 border border-cyan-400/30 rounded-lg px-4 py-3 text-white font-medium cursor-not-allowed opacity-70"
                />
              </div>
              <div>
                <label className="block text-sky-blue/70 text-sm uppercase tracking-wider font-medium mb-2">
                  Apellido
                </label>
                <input
                  type="text"
                  value={profileData.lastName}
                  readOnly
                  className="w-full bg-black/30 border border-cyan-400/30 rounded-lg px-4 py-3 text-white font-medium cursor-not-allowed opacity-70"
                />
              </div>
            </div>

            {/* Linked Driver Name (readonly) */}
            <div>
              <label className="block text-sky-blue/70 text-sm uppercase tracking-wider font-medium mb-2">
                Nombre Vinculado en SMS-Timing
              </label>
              {profileData.linkedStatus === 'linked' && profileData.linkedDriverName ? (
                <>
                  <input
                    type="text"
                    value={profileData.linkedDriverName}
                    readOnly
                    className="w-full bg-black/30 border border-cyan-400/30 rounded-lg px-4 py-3 text-white font-medium cursor-not-allowed opacity-70"
                  />
                  <p className="text-green-400 text-sm mt-1 flex items-center gap-2">
                    ✅ Este es tu nombre oficial en el sistema de carreras Speed Park
                  </p>
                </>
              ) : (
                <>
                  <div className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 text-yellow-400 font-medium">
                    No vinculado
                  </div>
                  <p className="text-sky-blue/60 text-sm mt-1">
                    Ve al <a href="/dashboard" className="text-electric-blue underline hover:text-cyan-400">Dashboard</a> para vincular tu perfil de piloto
                  </p>
                </>
              )}
            </div>

            {/* Birth Date (editable) */}
            <div>
              <label className="block text-sky-blue/70 text-sm uppercase tracking-wider font-medium mb-2">
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full bg-black/30 border border-cyan-400/30 rounded-lg px-4 py-3 text-white font-medium focus:border-electric-blue focus:outline-none"
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-electric-blue to-sky-blue text-white rounded-lg transition-all hover:shadow-lg hover:shadow-electric-blue/50 font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {saving ? 'GUARDANDO...' : '💾 GUARDAR CAMBIOS'}
          </button>
        </div>

        {/* Danger Zone */}
        <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 border-2 border-red-500/40 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-red-400 mb-4 flex items-center gap-2">
            ⚠️ Zona de Peligro
          </h2>
          <p className="text-sky-blue/70 mb-4">
            Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, esté seguro.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded-lg transition-all font-bold uppercase tracking-wider"
          >
            🗑️ ELIMINAR MI CUENTA
          </button>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-racing-black border-2 border-red-500/50 rounded-xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-red-400 mb-4 text-center">
              ⚠️ CONFIRMACIÓN DE ELIMINACIÓN
            </h3>
            <p className="text-sky-blue/80 mb-6 text-center">
              Esta acción es <strong className="text-red-400">IRREVERSIBLE</strong>.
              Para confirmar, escribe <code className="text-white bg-black/50 px-2 py-1 rounded">DELETE_MY_ACCOUNT</code>
            </p>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Escribe: DELETE_MY_ACCOUNT"
              className="w-full bg-black/50 border border-red-500/30 rounded-lg px-4 py-3 text-white font-mono mb-4 focus:border-red-500 focus:outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all font-bold"
              >
                CANCELAR
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmation !== 'DELETE_MY_ACCOUNT'}
                className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'ELIMINANDO...' : 'ELIMINAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
