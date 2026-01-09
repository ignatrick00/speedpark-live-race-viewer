import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RaceSessionV0 from '@/models/RaceSessionV0';
import WebUser from '@/models/WebUser';

export const dynamic = 'force-dynamic';

/**
 * GET /api/race-sessions-v0/[sessionId]
 * Get details of a specific race session including webUserId for linked drivers
 */
export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    await connectDB();

    const { sessionId } = params;

    console.log(`📊 [RACE-SESSION-DETAIL] Fetching session: ${sessionId}`);

    // Find the session by sessionId
    const session = await RaceSessionV0.findOne({ sessionId }).lean();

    if (!session) {
      console.log(`⚠️ [RACE-SESSION-DETAIL] Session not found: ${sessionId}`);
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    console.log(`✅ [RACE-SESSION-DETAIL] Session found: ${session.sessionName}`);
    console.log(`📈 [RACE-SESSION-DETAIL] Drivers: ${session.drivers?.length || 0}`);

    // Add webUserId to each driver
    const driverNames = session.drivers?.map((d: any) => d.driverName) || [];
    const webUsers = await WebUser.find({
      'kartingLink.driverName': { $in: driverNames },
      'kartingLink.status': 'linked',
      'accountStatus': { $ne: 'deleted' }
    }).select('_id kartingLink.driverName').lean();

    const driverToUserIdMap = new Map(
      webUsers.map((u: any) => [u.kartingLink.driverName, u._id.toString()])
    );

    // Enrich drivers with webUserId
    const enrichedDrivers = session.drivers?.map((driver: any) => ({
      ...driver,
      webUserId: driverToUserIdMap.get(driver.driverName) || null
    })) || [];

    return NextResponse.json({
      success: true,
      session: {
        ...session,
        drivers: enrichedDrivers
      }
    });

  } catch (error: any) {
    console.error('❌ [RACE-SESSION-DETAIL] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch session details',
        message: error.message
      },
      { status: 500 }
    );
  }
}
