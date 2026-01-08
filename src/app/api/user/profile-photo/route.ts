import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';

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

/**
 * POST /api/user/profile-photo
 * Upload user profile photo to Cloudflare R2
 */
export async function POST(req: NextRequest) {
  try {
    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get form data
    const formData = await req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Missing image file' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Solo se permiten imágenes JPG, PNG y WebP'
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Imagen muy grande (máx 5MB)' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const key = `users/${decoded.userId}/profile-${timestamp}.${ext}`;

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
          userId: decoded.userId,
          type: 'profile-photo',
          uploadedAt: new Date().toISOString(),
        },
      })
    );

    // Public URL
    const publicUrl = `https://pub-f9303d8c44a24d0ea6ba420b36cfb8a6.r2.dev/${key}`;

    // Update user's profile in database
    await connectDB();
    const user = await WebUser.findById(decoded.userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    user.profile.photoUrl = publicUrl;
    await user.save();

    return NextResponse.json({
      success: true,
      fileName: key.split('/').pop(),
      url: publicUrl,
    });
  } catch (error: any) {
    console.error('Profile photo upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al subir la imagen: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/profile-photo
 * Remove user profile photo
 */
export async function DELETE(req: NextRequest) {
  try {
    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    await connectDB();
    const user = await WebUser.findById(decoded.userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Remove photo URL from profile
    user.profile.photoUrl = null;
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Profile photo removed successfully',
    });
  } catch (error: any) {
    console.error('Remove profile photo error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove profile photo' },
      { status: 500 }
    );
  }
}
