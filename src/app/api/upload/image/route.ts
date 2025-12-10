import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Configure R2 client
const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(req: NextRequest) {
  try {
    // Verificar JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    try {
      jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get form data
    const formData = await req.formData();
    const file = formData.get('image') as File;
    const squadronId = formData.get('squadronId') as string;
    const type = formData.get('type') as string || 'unknown';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Missing image file' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Only JPG, PNG, WebP, and GIF images allowed'
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Image too large (max 5MB)' },
        { status: 400 }
      );
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

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    await R2.send(
      new PutObjectCommand({
        Bucket: 'karteando-assets',
        Key: key,
        Body: buffer,
        ContentType: file.type,
        CacheControl: 'public, max-age=31536000',
        Metadata: {
          squadronId: squadronId || '',
          type,
          uploadedAt: new Date().toISOString(),
        },
      })
    );

    // Return public URL
    const publicUrl = `https://pub-f9303d8c44a24d0ea6ba420b36cfb8a6.r2.dev/${key}`;

    return NextResponse.json({
      success: true,
      fileName: key.split('/').pop(),
      url: publicUrl,
    });
  } catch (error: any) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed: ' + error.message },
      { status: 500 }
    );
  }
}
