import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import WebUser from '@/models/WebUser';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/driver-by-name?name=Juan%20Perez
 * Find web user ID by SMS-Timing driver name (public endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const driverName = searchParams.get('name');

    if (!driverName) {
      return NextResponse.json(
        { success: false, error: 'Driver name is required' },
        { status: 400 }
      );
    }

    // Find user by exact match on linkedDriverName
    const user = await WebUser.findOne({
      'kartingLink.driverName': driverName,
      'kartingLink.status': 'linked',
      'accountStatus': { $ne: 'deleted' }
    }).select('_id profile.firstName profile.lastName kartingLink.driverName').lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Driver not found or not linked' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: user._id.toString(),
      driverName: user.kartingLink.driverName,
      profile: {
        firstName: user.profile.firstName,
        lastName: user.profile.lastName
      }
    });

  } catch (error: any) {
    console.error('Error finding driver by name:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to find driver' },
      { status: 500 }
    );
  }
}
