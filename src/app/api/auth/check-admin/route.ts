import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/middleware/adminAuth';

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await verifyAdminAccess(request);
    
    if (!adminCheck.isValid) {
      return NextResponse.json(
        { 
          isAdmin: false, 
          error: adminCheck.error 
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      isAdmin: true,
      user: {
        email: adminCheck.user?.email,
        userId: adminCheck.user?.userId,
      },
      message: 'Admin access granted'
    });
    
  } catch (error) {
    console.error('❌ Admin check error:', error);
    return NextResponse.json(
      { 
        isAdmin: false, 
        error: 'Admin verification failed' 
      },
      { status: 500 }
    );
  }
}