import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import DriverIdentity from '@/models/DriverIdentity';
import WebUser from '@/models/WebUser';
import LapRecord from '@/models/LapRecord';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'list_all';
    const search = searchParams.get('search') || '';
    
    if (action === 'list_all') {
      // Obtener todos los corredores únicos de los registros de vueltas
      const drivers = await LapRecord.aggregate([
        {
          $group: {
            _id: '$driverName',
            totalSessions: { $addToSet: '$sessionId' },
            totalLaps: { $sum: 1 },
            bestPosition: { $min: '$position' },
            bestTime: { $min: { $cond: [{ $gt: ['$lastTime', 0] }, '$lastTime', null] } },
            lastRace: { $max: '$timestamp' },
            firstRace: { $min: '$timestamp' },
            linkedUserId: { $first: '$webUserId' },
            personId: { $first: '$personId' }
          }
        },
        {
          $lookup: {
            from: 'webusers',
            let: { userId: { $toObjectId: '$linkedUserId' } },
            pipeline: [
              { $match: { $expr: { $eq: ['$_id', '$$userId'] } } },
              { 
                $project: { 
                  'profile.firstName': 1,
                  'profile.lastName': 1,
                  'profile.alias': 1,
                  email: 1
                }
              }
            ],
            as: 'webUser'
          }
        },
        {
          $project: {
            driverName: '$_id',
            totalSessions: { $size: '$totalSessions' },
            totalLaps: 1,
            bestPosition: 1,
            bestTime: 1,
            lastRace: 1,
            firstRace: 1,
            linkedUserId: 1,
            personId: 1,
            isLinked: { $ne: ['$linkedUserId', null] },
            webUser: { $arrayElemAt: ['$webUser', 0] },
            // Extraer nombre y apellido del driverName
            parsedName: {
              $let: {
                vars: {
                  nameParts: { $split: ['$_id', ' '] }
                },
                in: {
                  firstName: { $arrayElemAt: ['$$nameParts', 0] },
                  lastName: {
                    $cond: {
                      if: { $gt: [{ $size: '$$nameParts' }, 1] },
                      then: { 
                        $reduce: {
                          input: { $slice: ['$$nameParts', 1, { $size: '$$nameParts' }] },
                          initialValue: '',
                          in: { 
                            $concat: [
                              '$$value',
                              { $cond: { if: { $eq: ['$$value', ''] }, then: '', else: ' ' } },
                              '$$this'
                            ]
                          }
                        }
                      },
                      else: null
                    }
                  }
                }
              }
            }
          }
        },
        { $sort: { lastRace: -1 } }
      ]);
      
      // Si hay búsqueda, filtrar
      let filteredDrivers = drivers;
      if (search) {
        filteredDrivers = drivers.filter(driver => 
          driver.driverName.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      return NextResponse.json({
        success: true,
        drivers: filteredDrivers,
        total: filteredDrivers.length
      });
    }
    
    if (action === 'search_users') {
      // Buscar usuarios registrados para linking
      const users = await WebUser.find({
        $or: [
          { 'profile.firstName': { $regex: search, $options: 'i' } },
          { 'profile.lastName': { $regex: search, $options: 'i' } },
          { 'profile.alias': { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      })
      .select('profile.firstName profile.lastName profile.alias email kartingLink')
      .limit(10);
      
      return NextResponse.json({
        success: true,
        users
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('❌ Error in drivers API:', error);
    return NextResponse.json(
      { error: 'Error fetching drivers data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { action, driverName, webUserId, personId } = await request.json();
    
    if (action === 'link_driver' && driverName && webUserId) {
      console.log(`🔗 Linking driver "${driverName}" to user ${webUserId}`);
      
      // Verificar que el usuario existe
      const user = await WebUser.findById(webUserId);
      if (!user) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }
      
      // Actualizar todos los registros de vueltas de este corredor
      const updateResult = await LapRecord.updateMany(
        { driverName: { $regex: new RegExp(`^${driverName}$`, 'i') } },
        { 
          webUserId,
          personId: personId || undefined,
          linkingConfidence: 'high',
          linkingMethod: 'manual_link'
        }
      );
      
      // Actualizar estado del usuario
      await WebUser.findByIdAndUpdate(webUserId, {
        'kartingLink.status': 'linked',
        'kartingLink.driverName': driverName,
        'kartingLink.linkedAt': new Date()
      });
      
      // Crear o actualizar identidad del corredor
      await DriverIdentity.findOneAndUpdate(
        { 
          $or: [
            { webUserId },
            { primaryName: { $regex: new RegExp(`^${driverName}$`, 'i') } }
          ]
        },
        {
          webUserId,
          personId: personId || undefined,
          primaryName: driverName,
          linkingStatus: 'confirmed',
          confidence: 100,
          manuallyVerified: true,
          verificationDate: new Date(),
          $push: {
            nameHistory: {
              name: driverName,
              firstSeen: new Date(),
              lastSeen: new Date(),
              sessionCount: 0,
              confidence: 'confirmed',
              source: 'manual_entry'
            }
          }
        },
        { upsert: true, new: true }
      );
      
      console.log(`✅ Driver linked: ${driverName} -> ${user.email} (${updateResult.modifiedCount} records updated)`);
      
      return NextResponse.json({
        success: true,
        message: `Driver ${driverName} linked to ${user.email}`,
        recordsUpdated: updateResult.modifiedCount
      });
    }
    
    if (action === 'unlink_driver' && driverName) {
      console.log(`🔓 Unlinking driver "${driverName}"`);
      
      // Remover linking de todos los registros
      const updateResult = await LapRecord.updateMany(
        { driverName: { $regex: new RegExp(`^${driverName}$`, 'i') } },
        { 
          $unset: { 
            webUserId: 1,
            personId: 1 
          },
          linkingConfidence: 'low',
          linkingMethod: 'exact_match'
        }
      );
      
      // Actualizar identidad del corredor
      await DriverIdentity.findOneAndUpdate(
        { primaryName: { $regex: new RegExp(`^${driverName}$`, 'i') } },
        {
          $unset: { webUserId: 1 },
          linkingStatus: 'unlinked',
          confidence: 20,
          manuallyVerified: false
        }
      );
      
      console.log(`✅ Driver unlinked: ${driverName} (${updateResult.modifiedCount} records updated)`);
      
      return NextResponse.json({
        success: true,
        message: `Driver ${driverName} unlinked`,
        recordsUpdated: updateResult.modifiedCount
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action or missing parameters' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('❌ Error in drivers POST:', error);
    return NextResponse.json(
      { error: 'Error processing driver linking' },
      { status: 500 }
    );
  }
}