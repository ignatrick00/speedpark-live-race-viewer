import { NextRequest, NextResponse } from 'next/server';

// In-memory flag to control lap capture
// IMPORTANT: This will reset to true on server restart
let lapCaptureEnabled = true;

/**
 * GET - Get current lap capture status
 */
export async function GET(request: NextRequest) {
  try {
    console.log(`📊 [LAP-CAPTURE-TOGGLE] Current status: ${lapCaptureEnabled ? 'ENABLED' : 'DISABLED'}`);

    return NextResponse.json({
      success: true,
      enabled: lapCaptureEnabled,
      message: lapCaptureEnabled
        ? 'Lap capture is currently active'
        : 'Lap capture is currently paused',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting lap capture status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error getting lap capture status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Toggle lap capture on/off
 * Body: { enabled: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request. "enabled" must be a boolean'
        },
        { status: 400 }
      );
    }

    const previousState = lapCaptureEnabled;
    lapCaptureEnabled = enabled;

    console.log(`🔄 [LAP-CAPTURE-TOGGLE] Changed from ${previousState ? 'ENABLED' : 'DISABLED'} to ${enabled ? 'ENABLED' : 'DISABLED'}`);

    return NextResponse.json({
      success: true,
      enabled: lapCaptureEnabled,
      previousState,
      message: lapCaptureEnabled
        ? '✅ Lap capture is now ACTIVE - races will be saved to database'
        : '⏸️ Lap capture is now PAUSED - races will NOT be saved',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error toggling lap capture:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error toggling lap capture',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Export function to check if lap capture is enabled
 * Used by lapCaptureService
 */
export function isLapCaptureEnabled(): boolean {
  return lapCaptureEnabled;
}
