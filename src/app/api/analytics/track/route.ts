import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import UserActivity from '@/models/UserActivity';
import { getClientIP, getGeolocation } from '@/lib/geolocation';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

/**
 * POST /api/analytics/track
 * Track user activity (page views, actions, etc)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, page, action = 'page_view', metadata = {} } = body;

    if (!sessionId || !page) {
      return NextResponse.json(
        { success: false, error: 'sessionId and page are required' },
        { status: 400 }
      );
    }

    // Get IP and user agent
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Check if user is authenticated
    const authHeader = request.headers.get('authorization');
    let userId = null;
    let isAuthenticated = false;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        userId = decoded.userId;
        isAuthenticated = true;
      } catch (error) {
        // Invalid token, continue as anonymous
      }
    }

    // Get geolocation (async, non-blocking)
    const geolocationPromise = getGeolocation(ipAddress);

    // Save activity to database
    await connectDB();

    const activity = new UserActivity({
      userId,
      sessionId,
      ipAddress,
      userAgent,
      isAuthenticated,
      page,
      action,
      timestamp: new Date(),
      metadata
    });

    // Wait for geolocation and save
    const geolocation = await geolocationPromise;
    if (geolocation && Object.keys(geolocation).length > 0) {
      activity.geolocation = geolocation;
    }

    await activity.save();

    return NextResponse.json({
      success: true,
      activityId: activity._id
    });

  } catch (error) {
    console.error('❌ [ANALYTICS] Error tracking activity:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to track activity',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
