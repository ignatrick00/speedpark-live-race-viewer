import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * GET /api/user/profile
 * Get current user's profile information
 */
export async function GET(req: NextRequest) {
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

    const user = await WebUser.findById(decoded.userId).select(
      'email profile accountStatus kartingLink'
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        email: user.email,
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        linkedDriverName: user.kartingLink.driverName,
        linkedStatus: user.kartingLink.status,
        photoUrl: user.profile.photoUrl,
        birthDate: user.profile.birthDate,
        whatsappNumber: user.profile.whatsappNumber,
      },
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/profile
 * Update user's profile information
 */
export async function PATCH(req: NextRequest) {
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

    const body = await req.json();
    const { birthDate } = body;

    await connectDB();

    const user = await WebUser.findById(decoded.userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Update allowed fields (alias removed - cannot be changed)
    if (birthDate !== undefined) {
      user.profile.birthDate = birthDate ? new Date(birthDate) : null;
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        email: user.email,
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        linkedDriverName: user.kartingLink.driverName,
        linkedStatus: user.kartingLink.status,
        photoUrl: user.profile.photoUrl,
        birthDate: user.profile.birthDate,
        whatsappNumber: user.profile.whatsappNumber,
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/profile
 * Delete user account (soft delete - mark as deleted)
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

    // Get confirmation from request body
    const body = await req.json();
    if (body.confirmation !== 'DELETE_MY_ACCOUNT') {
      return NextResponse.json(
        { success: false, error: 'Invalid confirmation' },
        { status: 400 }
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

    // Soft delete: mark account as deleted
    user.accountStatus = 'deleted';
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete account error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
