import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';
import UserStats from '@/models/UserStats';
import { RealStatsLinker } from '@/lib/realStatsLinker';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No valid authorization token provided' },
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7);
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
    };
    
    // Find user
    const user = await WebUser.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if account is active
    if (user.accountStatus !== 'active') {
      return NextResponse.json(
        { error: 'Account is not active' },
        { status: 401 }
      );
    }
    
    // Get user statistics if linked
    let stats = null;
    if (user.kartingLink.status === 'linked' && user.kartingLink.personId) {
      stats = await RealStatsLinker.getUserRealStats(user._id.toString());
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        kartingLink: user.kartingLink,
        accountStatus: user.accountStatus,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      stats: stats || null,
      status: user.kartingLink.status,
      message: user.kartingLink.status === 'pending_first_race'
        ? 'Go racing to activate your statistics!'
        : user.kartingLink.status === 'linked'
        ? 'Statistics active and synced!'
        : 'Account verification in progress...',
      emailStatus: '🚧 Email verification pending implementation',
    });
    
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    console.error('Auth check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}