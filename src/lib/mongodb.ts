import mongoose from 'mongoose';

// Debug: Log all environment variables to understand what's available
console.log('🔍 DEBUG: Available env vars:', Object.keys(process.env).filter(key => 
  key.includes('MONGO') || key.includes('NEXT') || key.includes('AMPLIFY')
));

const MONGODB_URI = process.env.MONGODB_URI || 
  'mongodb+srv://icabreraquezada:JxniGpDeCy3VRlHs@karteando.370vwxo.mongodb.net/karteando-cl?retryWrites=true&w=majority&appName=Karteando';

console.log('🔍 DEBUG: MONGODB_URI found:', MONGODB_URI ? 'YES' : 'NO');

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not defined');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ Connected to MongoDB');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('❌ Failed to connect to MongoDB:', e);
    throw e;
  }

  return cached.conn;
}

export default connectDB;