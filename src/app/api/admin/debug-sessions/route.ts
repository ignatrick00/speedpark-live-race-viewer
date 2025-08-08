import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RaceSession from '@/models/RaceSession';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    console.log('🔍 Debugging race sessions...');
    
    // Get all sessions
    const allSessions = await RaceSession.find({}).sort({ timestamp: -1 }).limit(10);
    
    console.log(`📊 Found ${allSessions.length} total sessions`);
    
    // Look for Diego specifically
    const diegoSessions = await RaceSession.find({
      'drivers.name': 'Diego'
    }).sort({ timestamp: -1 });
    
    console.log(`🎯 Found ${diegoSessions.length} sessions with Diego`);
    
    // Get all unique driver names
    const uniqueDrivers = new Set();
    allSessions.forEach(session => {
      session.drivers.forEach((driver: any) => {
        uniqueDrivers.add(driver.name);
      });
    });
    
    return NextResponse.json({
      success: true,
      totalSessions: allSessions.length,
      diegoSessions: diegoSessions.length,
      uniqueDrivers: Array.from(uniqueDrivers).sort(),
      recentSessions: allSessions.slice(0, 3).map(s => ({
        name: s.sessionName,
        timestamp: s.timestamp,
        drivers: s.drivers.map((d: any) => d.name)
      })),
      diegoSessionsDetails: diegoSessions.map(s => ({
        name: s.sessionName,
        timestamp: s.timestamp,
        diegoData: s.drivers.find((d: any) => d.name === 'Diego')
      }))
    });
    
  } catch (error) {
    console.error('❌ Debug sessions error:', error);
    return NextResponse.json(
      { error: 'Debug error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}