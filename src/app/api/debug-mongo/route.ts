import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
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
    await connectDB();
    
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    const db = client.db('karteando-cl');
    
    // 1. Contar documentos en cada colección
    const collections = {
      webusers: await db.collection('webusers').countDocuments(),
      lap_records: await db.collection('lap_records').countDocuments(), 
      driver_identities: await db.collection('driver_identities').countDocuments(),
      racesessions: await db.collection('racesessions').countDocuments(),
      userstats: await db.collection('userstats').countDocuments()
    };
    
    // 2. Obtener muestras de cada colección
    const samples = {
      webusers: await db.collection('webusers').find({})
        .project({ 'profile.firstName': 1, 'profile.lastName': 1, 'profile.alias': 1, email: 1, 'kartingLink.status': 1, 'kartingLink.driverName': 1 })
        .limit(5).toArray(),
        
      lap_records: await db.collection('lap_records').find({})
        .sort({ timestamp: -1 })
        .limit(10).toArray(),
        
      driver_identities: await db.collection('driver_identities').find({})
        .limit(5).toArray(),
        
      racesessions: await db.collection('racesessions').find({})
        .sort({ timestamp: -1 })
        .project({ sessionName: 1, 'drivers.name': 1, revenue: 1, timestamp: 1, processed: 1 })
        .limit(5).toArray()
    };
    
    // 3. Buscar específicamente usuario Diego/SpeedPark
    const diegoUser = await db.collection('webusers').findOne({
      $or: [
        { 'profile.firstName': /diego/i },
        { 'profile.lastName': /speedpark/i },
        { 'profile.alias': /diego/i },
        { email: /diego/i }
      ]
    });
    
    let diegoData = null;
    if (diegoUser) {
      const diegoLaps = await db.collection('lap_records').find({
        webUserId: diegoUser._id.toString()
      }).sort({ timestamp: -1 }).limit(5).toArray();
      
      diegoData = {
        user: diegoUser,
        lapRecords: diegoLaps,
        totalLaps: await db.collection('lap_records').countDocuments({
          webUserId: diegoUser._id.toString()
        })
      };
    }
    
    await client.close();
    
    return NextResponse.json({
      success: true,
      collections,
      samples,
      diegoData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error debugging MongoDB:', error);
    return NextResponse.json(
      { error: 'Error accessing MongoDB collections' },
      { status: 500 }
    );
  }
}