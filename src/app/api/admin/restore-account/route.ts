import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ADMIN_EMAIL = 'icabreraquezada@gmail.com';

/**
 * POST /api/admin/restore-account
 * Restore a deleted user account (admin only)
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

    await connectDB();

    // Verify admin permissions
    const adminUser = await WebUser.findById(decoded.userId);
    if (!adminUser || adminUser.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get user ID to restore
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Find the user
    const user = await WebUser.findById(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already active
    if (user.accountStatus === 'active') {
      return NextResponse.json(
        { success: false, error: 'Account is already active' },
        { status: 400 }
      );
    }

    // Restore account
    user.accountStatus = 'active';
    await user.save();

    console.log(`✅ [RESTORE-ACCOUNT] Admin ${adminUser.email} restored account ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Account restored successfully',
      user: {
        _id: user._id,
        email: user.email,
        accountStatus: user.accountStatus,
      },
    });
  } catch (error: any) {
    console.error('❌ [RESTORE-ACCOUNT] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to restore account' },
      { status: 500 }
    );
  }
}
