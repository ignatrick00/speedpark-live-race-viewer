import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import Notification from '@/models/Notification';
import WebUser from '@/models/WebUser';

// GET - Get user's notifications
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Build query
    const query: any = { userId: user._id };
    if (unreadOnly) {
      query.read = false;
    }

    // Get notifications
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    console.log(`📬 [NOTIFICATIONS] User ${user._id} has ${notifications.length} notifications`);
    console.log(`📬 [NOTIFICATIONS] Types:`, notifications.map(n => n.type));
    const challengeNotifications = notifications.filter(n => n.type === 'duel_challenge');
    console.log(`⚔️ [NOTIFICATIONS] Duel challenges found: ${challengeNotifications.length}`);
    if (challengeNotifications.length > 0) {
      console.log(`⚔️ [NOTIFICATIONS] First challenge:`, challengeNotifications[0]);
    }

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      userId: user._id,
      read: false,
    });

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
