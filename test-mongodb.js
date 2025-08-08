const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

console.log('🔗 Testing MongoDB Atlas connection...');
console.log('URI:', MONGODB_URI ? 'Found' : 'Not found');

async function testConnection() {
  try {
    console.log('🚀 Connecting to MongoDB Atlas...');
    
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
    
    console.log('✅ Connected to MongoDB Atlas successfully!');
    console.log('📊 Database:', mongoose.connection.name);
    console.log('🏁 Connection state:', mongoose.connection.readyState);
    
    // Test creating a simple document
    const TestSchema = new mongoose.Schema({
      name: String,
      timestamp: Date,
    });
    
    const TestModel = mongoose.model('Test', TestSchema);
    
    const testDoc = new TestModel({
      name: 'Connection Test',
      timestamp: new Date(),
    });
    
    await testDoc.save();
    console.log('✅ Test document created successfully!');
    
    // Clean up
    await TestModel.deleteOne({ _id: testDoc._id });
    console.log('🧹 Test document cleaned up');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Details:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

testConnection();