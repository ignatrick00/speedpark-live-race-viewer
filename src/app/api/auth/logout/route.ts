import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Since we're using JWT tokens (stateless), logout is handled client-side
    // by removing the token from localStorage/cookies
    // 
    // In a future implementation, we could maintain a token blacklist
    // or implement refresh tokens for more secure logout
    
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
      note: 'JWT token should be removed from client storage',
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error during logout' },
      { status: 500 }
    );
  }
}