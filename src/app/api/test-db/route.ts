import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing database connection...');
    
    await connectDB();
    console.log('✅ Database connected successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Database connection working',
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
        MONGODB_URI_PREFIX: process.env.MONGODB_URI?.substring(0, 25) + '...'
      }
    });
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}