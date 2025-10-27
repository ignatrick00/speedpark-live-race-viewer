/**
 * Cloudflare Worker para upload directo a R2
 * Deploy: wrangler deploy
 * URL: https://upload.karteando.cl/video
 */

export interface Env {
  EVIDENCE_BUCKET: R2Bucket; // R2 Binding
  JWT_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      // Verificar JWT token
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response('Unauthorized', { status: 401 });
      }

      const token = authHeader.substring(7);
      // TODO: Verify JWT token with env.JWT_SECRET

      // Get form data
      const formData = await request.formData();
      const file = formData.get('video') as File;
      const reportId = formData.get('reportId') as string;

      if (!file || !reportId) {
        return new Response('Missing file or reportId', { status: 400 });
      }

      // Validate file type
      if (!file.type.startsWith('video/')) {
        return new Response('Only video files allowed', { status: 400 });
      }

      // Validate file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        return new Response('File too large (max 100MB)', { status: 400 });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `incident-${reportId}-${timestamp}.${file.name.split('.').pop()}`;
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

      // Return public URL (configure R2 bucket with custom domain)
      const publicUrl = `https://cdn.karteando.cl/${key}`;

      return new Response(
        JSON.stringify({
          success: true,
          fileName,
          url: publicUrl,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Upload error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Upload failed',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  },
};
