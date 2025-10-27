'use client';

import { useState, useRef } from 'react';
import { uploadIncidentVideoWithProgress } from '@/lib/video-upload';

interface VideoUploadProps {
  reportId: string;
  token: string;
  onUploadComplete: (url: string) => void;
  onError?: (error: string) => void;
}

export default function VideoUpload({ reportId, token, onUploadComplete, onError }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Solo se permiten archivos de video');
      return;
    }

    // Validate size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`Archivo muy grande (máx ${maxSize / (1024 * 1024)}MB)`);
      return;
    }

    // Create preview
    const url = URL.createObjectURL(file);
    setPreview(url);
    setError(null);
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const result = await uploadIncidentVideoWithProgress(
        file,
        reportId,
        token,
        (p) => setProgress(p)
      );

      if (result.success && result.url) {
        onUploadComplete(result.url);
        setPreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        const errorMsg = result.error || 'Error al subir el video';
        setError(errorMsg);
        onError?.(errorMsg);
      }
    } catch (err) {
      const errorMsg = 'Error inesperado al subir el video';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          disabled={uploading}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="mt-2 text-xs text-gray-500">
          Video de evidencia (máx 100MB, formatos: MP4, WebM, MOV)
        </p>
      </div>

      {preview && (
        <div className="space-y-2">
          <video
            src={preview}
            controls
            className="w-full max-h-64 bg-black rounded-lg"
          />
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg
              hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
          >
            {uploading ? 'Subiendo...' : 'Subir Video'}
          </button>
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-center text-gray-600">{progress}%</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}
