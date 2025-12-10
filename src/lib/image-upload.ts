/**
 * Client-side image upload to Cloudflare R2
 */

export interface UploadImageResponse {
  success: boolean;
  fileName?: string;
  url?: string;
  error?: string;
}

/**
 * Upload squadron logo to Cloudflare R2
 * @param imageFile - Image file from input
 * @param squadronId - Associated squadron ID
 * @param token - JWT authentication token
 * @returns Upload result with public URL
 */
export async function uploadSquadronLogo(
  imageFile: File,
  squadronId: string,
  token: string
): Promise<UploadImageResponse> {
  try {
    // Validate file
    if (!imageFile.type.startsWith('image/')) {
      return {
        success: false,
        error: 'Solo se permiten archivos de imagen',
      };
    }

    // Validate size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (imageFile.size > maxSize) {
      return {
        success: false,
        error: `Imagen muy grande (máx ${maxSize / (1024 * 1024)}MB)`,
      };
    }

    // Create form data
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('squadronId', squadronId);
    formData.append('type', 'squadron-logo');

    // Upload to API endpoint (uses local Next.js API if no worker URL configured)
    const uploadUrl = process.env.NEXT_PUBLIC_UPLOAD_URL
      ? `${process.env.NEXT_PUBLIC_UPLOAD_URL}/image`
      : '/api/upload/image';

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result: UploadImageResponse = await response.json();

    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.error || 'Error al subir la imagen',
      };
    }

    return result;
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: 'Error de conexión al subir la imagen',
    };
  }
}

/**
 * Upload with progress tracking
 */
export async function uploadSquadronLogoWithProgress(
  imageFile: File,
  squadronId: string,
  token: string,
  onProgress?: (progress: number) => void
): Promise<UploadImageResponse> {
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('squadronId', squadronId);
    formData.append('type', 'squadron-logo');

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
        const result: UploadImageResponse = JSON.parse(xhr.responseText);
        resolve(result);
      } else {
        resolve({
          success: false,
          error: 'Error al subir la imagen',
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

    const uploadUrl = process.env.NEXT_PUBLIC_UPLOAD_URL
      ? `${process.env.NEXT_PUBLIC_UPLOAD_URL}/image`
      : '/api/upload/image';
    xhr.open('POST', uploadUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}
