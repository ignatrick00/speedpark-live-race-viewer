/**
 * Client-side video upload to Cloudflare Worker
 */

export interface UploadVideoResponse {
  success: boolean;
  fileName?: string;
  url?: string;
  error?: string;
}

/**
 * Upload incident video to Cloudflare R2 via Worker
 * @param videoFile - Video file from input
 * @param reportId - Associated incident report ID
 * @param token - JWT authentication token
 * @returns Upload result with public URL
 */
export async function uploadIncidentVideo(
  videoFile: File,
  reportId: string,
  token: string
): Promise<UploadVideoResponse> {
  try {
    // Validate file
    if (!videoFile.type.startsWith('video/')) {
      return {
        success: false,
        error: 'Solo se permiten archivos de video',
      };
    }

    // Validate size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (videoFile.size > maxSize) {
      return {
        success: false,
        error: `Archivo muy grande (máx ${maxSize / (1024 * 1024)}MB)`,
      };
    }

    // Create form data
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('reportId', reportId);

    // Upload to Cloudflare Worker
    const uploadUrl = process.env.NEXT_PUBLIC_UPLOAD_URL || 'https://upload.karteando.cl/video';

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result: UploadVideoResponse = await response.json();

    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.error || 'Error al subir el video',
      };
    }

    return result;
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: 'Error de conexión al subir el video',
    };
  }
}

/**
 * Upload with progress tracking
 */
export async function uploadIncidentVideoWithProgress(
  videoFile: File,
  reportId: string,
  token: string,
  onProgress?: (progress: number) => void
): Promise<UploadVideoResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('reportId', reportId);

    const xhr = new XMLHttpRequest();

    // Progress tracking
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = (e.loaded / e.total) * 100;
        onProgress(Math.round(progress));
      }
    });

    // Load
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const result: UploadVideoResponse = JSON.parse(xhr.responseText);
        resolve(result);
      } else {
        resolve({
          success: false,
          error: 'Error al subir el video',
        });
      }
    });

    // Error
    xhr.addEventListener('error', () => {
      resolve({
        success: false,
        error: 'Error de conexión',
      });
    });

    const uploadUrl = process.env.NEXT_PUBLIC_UPLOAD_URL || 'https://upload.karteando.cl/video';
    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}
