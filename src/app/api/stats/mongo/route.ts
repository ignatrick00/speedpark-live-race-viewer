import { NextRequest, NextResponse } from 'next/server';
import StatsService from '@/lib/statsService';
import connectDB from '@/lib/mongodb';
import RaceSession from '@/models/RaceSession';
import { verifyAdminAccess } from '@/middleware/adminAuth';

export async function GET(request: NextRequest) {
  // Check admin access
  const adminCheck = await verifyAdminAccess(request);
  
  if (!adminCheck.isValid) {
    return NextResponse.json(
      { 
        error: 'Access denied. Admin privileges required.',
        details: adminCheck.error 
      },
      { status: 401 }
    );
  }
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'stats';
    
    await connectDB();
    
    switch (action) {
      case 'stats':
        const combinedStats = await StatsService.getCombinedStats();
        return NextResponse.json({
          success: true,
          stats: combinedStats.mongo,
          comparison: {
            json: combinedStats.json,
            mongo: combinedStats.mongo,
          }
        });
        
      case 'sessions':
        const limit = parseInt(searchParams.get('limit') || '20');
        const sessions = await StatsService.getRecentSessions(limit);
        return NextResponse.json({
          success: true,
          sessions,
          count: sessions.length
        });
        
      case 'raw':
        const rawSessions = await RaceSession.find()
          .sort({ timestamp: -1 })
          .limit(10)
          .lean();
        return NextResponse.json({
          success: true,
          sessions: rawSessions
        });
        
      case 'health':
        const health = await checkMongoHealth();
        return NextResponse.json({
          success: true,
          health
        });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: stats, sessions, raw, health' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('❌ Error in MongoDB stats API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'MongoDB stats API error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

async function checkMongoHealth() {
  try {
    const [sessionCount, todayCount, lastSession] = await Promise.all([
      RaceSession.countDocuments(),
      RaceSession.countDocuments({
        timestamp: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }),
      RaceSession.findOne().sort({ timestamp: -1 }).lean()
    ]);
    
    return {
      connected: true,
      totalSessions: sessionCount,
      todaySessions: todayCount,
      lastSession: lastSession ? {
        name: lastSession.sessionName,
        timestamp: lastSession.timestamp,
        drivers: lastSession.drivers.length,
      } : null,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}

// POST endpoint to manually trigger operations
export async function POST(request: NextRequest) {
  // Check admin access
  const adminCheck = await verifyAdminAccess(request);
  
  if (!adminCheck.isValid) {
    return NextResponse.json(
      { 
        error: 'Access denied. Admin privileges required.',
        details: adminCheck.error 
      },
      { status: 401 }
    );
  }
  try {
    const { action } = await request.json();
    
    await connectDB();
    
    switch (action) {
      case 'clear_test_data':
        // Remove test sessions (be careful with this!)
        const result = await RaceSession.deleteMany({
          sessionName: { $regex: /test|demo/i }
        });
        
        return NextResponse.json({
          success: true,
          message: `Deleted ${result.deletedCount} test sessions`
        });
        
      case 'reprocess_linking':
        // Trigger user linking for recent sessions
        const recentSessions = await RaceSession.find({
          processed: false,
          timestamp: {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }).limit(10);
        
        // This would trigger user linking (implement as needed)
        return NextResponse.json({
          success: true,
          message: `Found ${recentSessions.length} sessions for reprocessing`
        });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
    
  } catch (error) {
    console.error('❌ Error in MongoDB POST:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'MongoDB POST error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}