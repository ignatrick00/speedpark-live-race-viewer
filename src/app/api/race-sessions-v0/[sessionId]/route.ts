import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RaceSessionV0 from '@/models/RaceSessionV0';

export const dynamic = 'force-dynamic';

/**
 * GET /api/race-sessions-v0/[sessionId]
 * Get details of a specific race session
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

    return NextResponse.json({
      success: true,
      session
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
