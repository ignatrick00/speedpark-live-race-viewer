/**
 * Cloudflare Worker para upload de videos e imágenes a R2
 * Deploy: wrangler deploy
 * URL: https://upload.karteando.cl/{video|image}
 */

export interface Env {
  EVIDENCE_BUCKET: R2Bucket; // R2 Binding para videos
  ASSETS_BUCKET: R2Bucket;   // R2 Binding para imágenes/assets
  JWT_SECRET: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/video') {
      return handleVideoUpload(request, env);
    } else if (path === '/image') {
      return handleImageUpload(request, env);
    } else {
      return new Response('Not found', { status: 404 });
    }
  },
};

async function handleVideoUpload(request: Request, env: Env): Promise<Response> {
  try {
    // Verificar JWT token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    const token = authHeader.substring(7);
    // TODO: Verify JWT token with env.JWT_SECRET

    // Get form data
    const formData = await request.formData();
    const file = formData.get('video') as File;
    const reportId = formData.get('reportId') as string;

    if (!file || !reportId) {
      return jsonResponse({ success: false, error: 'Missing file or reportId' }, 400);
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      return jsonResponse({ success: false, error: 'Only video files allowed' }, 400);
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      return jsonResponse({ success: false, error: 'File too large (max 100MB)' }, 400);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const fileName = `incident-${reportId}-${timestamp}.${ext}`;
    const key = `incidents/${fileName}`;

    // Upload to R2
    await env.EVIDENCE_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        reportId,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Return public URL from R2
    const publicUrl = `https://pub-01d1e4417bf145da8d0ece085c44a8e8.r2.dev/${key}`;

    return jsonResponse({
      success: true,
      fileName,
      url: publicUrl,
    });
  } catch (error) {
    console.error('Video upload error:', error);
    return jsonResponse({ success: false, error: 'Upload failed' }, 500);
  }
}

async function handleImageUpload(request: Request, env: Env): Promise<Response> {
  try {
    // Verificar JWT token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    const token = authHeader.substring(7);
    // TODO: Verify JWT token with env.JWT_SECRET

    // Get form data
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const squadronId = formData.get('squadronId') as string;
    const type = formData.get('type') as string || 'unknown';

    if (!file) {
      return jsonResponse({ success: false, error: 'Missing image file' }, 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return jsonResponse({
        success: false,
        error: 'Only JPG, PNG, WebP, and GIF images allowed'
      }, 400);
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return jsonResponse({ success: false, error: 'Image too large (max 5MB)' }, 400);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    let key: string;

    if (type === 'squadron-logo' && squadronId) {
      key = `squadrons/${squadronId}/logo-${timestamp}.${ext}`;
    } else {
      key = `uploads/${type}-${timestamp}.${ext}`;
    }

    // Upload to R2
    await env.ASSETS_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000', // Cache 1 year
      },
      customMetadata: {
        squadronId: squadronId || '',
        type,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Return public URL from R2
    const publicUrl = `https://pub-f9303d8c44a24d0ea6ba420b36cfb8a6.r2.dev/${key}`;

    return jsonResponse({
      success: true,
      fileName: key.split('/').pop(),
      url: publicUrl,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    return jsonResponse({ success: false, error: 'Upload failed' }, 500);
  }
}

function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
