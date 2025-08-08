import { NextRequest, NextResponse } from 'next/server';
import { RealStatsLinker } from '@/lib/realStatsLinker';
import connectDB from '@/lib/mongodb';
import WebUser from '@/models/WebUser';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { email, firstName } = await request.json();
    
    console.log(`🔗 Manual linking request for ${firstName} (${email})`);
    
    // Find user
    const user = await WebUser.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Attempt linking
    const isLinked = await RealStatsLinker.linkUserWithRealStats(
      user._id.toString(),
      firstName,
      user.profile.lastName
    );
    
    if (isLinked) {
      return NextResponse.json({
        success: true,
        message: `✅ Successfully linked ${firstName} with real race statistics`,
        user: {
          id: user._id,
          email: user.email,
          firstName,
          linked: true
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `❌ No race data found for ${firstName}`,
        user: {
          id: user._id,
          email: user.email,
          firstName,
          linked: false
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Manual linking error:', error);
    return NextResponse.json(
      { error: 'Internal server error during linking' },
      { status: 500 }
    );
  }
}