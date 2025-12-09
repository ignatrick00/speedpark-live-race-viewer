import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import RaceSessionV0 from '@/models/RaceSessionV0';
import Squadron from '@/models/Squadron';
import WebUser from '@/models/WebUser';
import mongoose from 'mongoose';

// Schema para buscar en la colección antigua
const DriverRaceDataSchema = new mongoose.Schema({}, { strict: false, collection: 'driver_race_data' });
const DriverRaceData = mongoose.models.DriverRaceData || mongoose.model('DriverRaceData', DriverRaceDataSchema);

export const dynamic = 'force-dynamic';

/**
 * GET /api/race-results-v0?sessionId=...
 * Obtener carrera completa con todos los pilotos y vueltas
 */
export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    console.log(`🏁 [RACE-RESULTS-V0] Fetching race: ${sessionId}`);

    // Buscar carrera completa
    const race = await RaceSessionV0.findOne({ sessionId }).lean();

    if (!race) {
      return NextResponse.json(
        { success: false, error: 'Race not found' },
        { status: 404 }
      );
    }

    console.log(`📊 [RACE-RESULTS-V0] Found race with ${race.drivers.length} drivers`);

    // Buscar escuderías para todos los pilotos
    const driversWithSquadrons = await Promise.all(
      race.drivers.map(async (driver) => {
        let squadronName = null;
        let userId = driver.linkedUserId || driver.webUserId; // Priorizar linkedUserId

        // Si no tiene webUserId, intentar buscar por nombre o alias (case-insensitive)
        if (!userId) {
          // 1. Buscar en WebUser por alias o speedParkProfile
          let webUser = await WebUser.findOne({
            $or: [
              { 'profile.alias': { $regex: new RegExp(`^${driver.driverName}$`, 'i') } },
              { 'kartingLink.speedParkProfile.driverName': { $regex: new RegExp(`^${driver.driverName}$`, 'i') } },
              { 'kartingLink.speedParkProfile.aliases': { $regex: new RegExp(`^${driver.driverName}$`, 'i') } }
            ],
            'kartingLink.status': 'linked'
          }).select('_id').lean();

          // 2. Si no se encuentra, buscar en driver_race_data (estructura antigua)
          if (!webUser) {
            const driverData = await DriverRaceData.findOne({
              driverName: { $regex: new RegExp(`^${driver.driverName}$`, 'i') },
              linkingStatus: 'linked',
              webUserId: { $exists: true, $ne: null }
            }).select('webUserId').lean();

            if (driverData && driverData.webUserId) {
              userId = driverData.webUserId;
              console.log(`🔗 Found webUserId via driver_race_data for ${driver.driverName}: ${userId}`);
            }
          } else {
            userId = webUser._id.toString();
            console.log(`🔗 Found webUserId for ${driver.driverName}: ${userId}`);
          }
        }

        if (userId) {
          try {
            // Convertir string a ObjectId
            const userObjectId = new mongoose.Types.ObjectId(userId);

            const squadron = await Squadron.findOne({
              members: userObjectId,
              isActive: true
            }).select('name').lean();

            if (squadron) {
              squadronName = squadron.name;
              console.log(`✅ Found squadron for ${driver.driverName}: ${squadronName}`);
            } else {
              console.log(`⚠️ No squadron found for ${driver.driverName} (userId: ${userId})`);
            }
          } catch (error) {
            console.log(`❌ Error finding squadron for ${driver.driverName}:`, error);
          }
        } else {
          console.log(`⚠️ Driver ${driver.driverName} - No webUserId and not found by name`);
        }

        return {
          ...driver,
          squadronName
        };
      })
    );

    // Formatear datos para frontend
    const formattedRace = {
      sessionId: race.sessionId,
      sessionName: race.sessionName,
      sessionDate: race.sessionDate.toISOString(),
      sessionType: race.sessionType,
      totalDrivers: race.totalDrivers,
      totalLaps: race.totalLaps,
      drivers: driversWithSquadrons
        .map(driver => ({
          driverName: driver.driverName,
          finalPosition: driver.finalPosition,
          kartNumber: driver.kartNumber,
          totalLaps: driver.totalLaps,
          bestTime: driver.bestTime,
          lastTime: driver.lastTime,
          averageTime: driver.averageTime,
          gapToLeader: driver.gapToLeader,
          squadronName: driver.squadronName,
          webUserId: driver.webUserId,
          laps: driver.laps.map(lap => ({
            lapNumber: lap.lapNumber,
            time: lap.time,
            position: lap.position,
            timestamp: lap.timestamp,
            gapToLeader: lap.gapToLeader,
            isPersonalBest: lap.isPersonalBest
          }))
        }))
        .sort((a, b) => a.finalPosition - b.finalPosition) // Ordenar por posición
    };

    return NextResponse.json({
      success: true,
      race: formattedRace,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [RACE-RESULTS-V0] Error fetching race results:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch race results V0',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
