import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET() {
  try {
    console.log('🔗 Testing MongoDB Atlas connection...');
    
    await connectDB();
    
    console.log('✅ Connected to MongoDB Atlas successfully!');
    
    // Test creating a simple document
    const TestSchema = new mongoose.Schema({
      name: String,
      timestamp: Date,
    });
    
    const TestModel = mongoose.models.MongoTest || mongoose.model('MongoTest', TestSchema);
    
    const testDoc = new TestModel({
      name: 'Connection Test from Next.js',
      timestamp: new Date(),
    });
    
    await testDoc.save();
    console.log('✅ Test document created successfully!');
    
    // Clean up
    await TestModel.deleteOne({ _id: testDoc._id });
    console.log('🧹 Test document cleaned up');
    
    return NextResponse.json({
      success: true,
      message: '✅ MongoDB Atlas connection working perfectly!',
      database: mongoose.connection.name,
      connectionState: mongoose.connection.readyState,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'MongoDB connection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}