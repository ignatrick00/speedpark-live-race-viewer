import connectDB from './mongodb';
import LapRecord from '@/models/LapRecord';
import DriverIdentityService from './driverIdentityService';
import DriverRaceDataService from './driverRaceDataService';
import BestDriverTime from '@/models/BestDriverTimes';
import BestKartTime from '@/models/BestKartTimes';

interface SMSDriverData {
  N: string; // Name
  P: number; // Position
  K: number; // Kart number
  L: number; // Lap count
  B: number; // Best time
  T: number; // Last/current time
  A: number; // Average time
  G: string; // Gap to leader
}

interface SMSData {
  N: string; // Session name
  D: SMSDriverData[]; // Drivers array
}

export class LapCaptureService {
  
  private static previousSessionData: Map<string, SMSDriverData[]> = new Map();
  
  /**
   * Main function to process and store lap-by-lap data
   * NOW USING NEW DRIVER-CENTRIC STRUCTURE
   */
  static async processLapData(smsData: SMSData): Promise<void> {
    try {
      console.log(`🔍 Starting processLapData for: ${smsData.N}`);
      
      await connectDB();
      console.log(`✅ Database connected successfully`);
      
      console.log(`🏁 Processing lap data (NEW STRUCTURE): ${smsData.N} - ${smsData.D.length} drivers`);
      
      // PRIORITY 1: Use new driver-centric structure
      try {
        console.log(`📊 Calling DriverRaceDataService.processRaceData...`);
        await DriverRaceDataService.processRaceData(smsData);
        console.log(`✅ DriverRaceDataService.processRaceData completed`);
      } catch (driverServiceError) {
        console.error('❌ Error in DriverRaceDataService.processRaceData:', driverServiceError);
        throw driverServiceError;
      }

      // PRIORITY 2: Update real-time records (FASTEST QUERIES)
      try {
        console.log(`🏆 Updating real-time records...`);
        await this.updateRealTimeRecords(smsData);
        console.log(`✅ Real-time records updated`);
      } catch (recordError) {
        console.error('❌ Error updating real-time records:', recordError);
        // Don't throw - this is not critical for race processing
      }
      
      // PRIORITY 2: Maintain legacy individual records for compatibility (reduced frequency)
      if (Math.random() < 0.1) { // Only 10% of the time to reduce duplicates
        try {
          console.log(`📝 Processing legacy lap data...`);
          await this.processLegacyLapData(smsData);
          console.log(`✅ Legacy lap data processed`);
        } catch (legacyError) {
          console.error('⚠️ Error in legacy processing (non-critical):', legacyError);
          // Don't throw - legacy processing is optional
        }
      }
      
      console.log(`✅ Lap data processed with NEW driver-centric structure`);
      
    } catch (error) {
      console.error('❌ Error processing lap data:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('❌ SMS Data that caused error:', JSON.stringify(smsData, null, 2));
      throw error;
    }
  }
  
  /**
   * Legacy processing for backward compatibility (reduced frequency)
   */
  private static async processLegacyLapData(smsData: SMSData): Promise<void> {
    const sessionName = smsData.N;
    const sessionTimestamp = new Date();
    const sessionId = `${sessionName}_${sessionTimestamp.toDateString()}`;
    
    // Get previous data for this session to detect changes
    const previousData = this.previousSessionData.get(sessionName) || [];
    const currentData = smsData.D;
    
    // Process each driver's current data
    for (let index = 0; index < currentData.length; index++) {
      const driverData = currentData[index];
      await this.processDriverLap(
        sessionId,
        sessionName,
        sessionTimestamp,
        driverData,
        previousData[index],
        index
      );
    }
    
    // Store current data for next comparison
    this.previousSessionData.set(sessionName, [...currentData]);
  }
  
  /**
   * Process individual driver lap data
   */
  private static async processDriverLap(
    sessionId: string,
    sessionName: string,
    timestamp: Date,
    currentDriver: SMSDriverData,
    previousDriver: SMSDriverData | undefined,
    driverIndex: number
  ): Promise<void> {
    
    const driverName = currentDriver.N;
    if (!driverName || driverName.trim() === '') {
      return; // Skip empty driver names
    }
    
    // Detect if this is a new lap (lap count increased)
    const isNewLap = !previousDriver || currentDriver.L > (previousDriver.L || 0);
    const lapNumber = currentDriver.L || 0;
    
    if (!isNewLap && lapNumber === (previousDriver?.L || 0)) {
      // Same lap, just position/time updates - we still want to capture this
      // for real-time position tracking, but less frequently
      if (Math.random() > 0.3) { // Capture ~30% of position updates
        return;
      }
    }
    
    console.log(`🚗 Processing ${driverName}: Lap ${lapNumber} (${isNewLap ? 'NEW LAP' : 'position update'})`);
    
    try {
      // Link driver to our system
      const linkingResult = await DriverIdentityService.linkDriver(
        driverName,
        timestamp
      );
      
      // Calculate performance metrics
      const positionChange = previousDriver ? 
        (previousDriver.P || 0) - currentDriver.P : 0;
      
      const lapTimeImprovement = previousDriver && previousDriver.T && currentDriver.T ?
        previousDriver.T - currentDriver.T : 0;
      
      const isPersonalBest = currentDriver.B === currentDriver.T && currentDriver.T > 0;
      
      // Create lap record
      const lapRecord = new LapRecord({
        sessionId,
        sessionName,
        timestamp,
        lapNumber,
        driverName,
        personId: linkingResult.personId,
        webUserId: linkingResult.webUserId,
        
        // Real SMS data
        position: currentDriver.P || 0,
        kartNumber: currentDriver.K || 0,
        lapCount: currentDriver.L || 0,
        bestTime: currentDriver.B || 0,
        lastTime: currentDriver.T || 0,
        averageTime: currentDriver.A || 0,
        gapToLeader: currentDriver.G || '0.000',
        
        // Calculated metrics
        positionChange,
        lapTimeImprovement,
        isPersonalBest,
        
        // Linking and raw data
        rawSMSData: currentDriver,
        linkingConfidence: linkingResult.confidence,
        linkingMethod: linkingResult.method
      });
      
      await lapRecord.save();
      
      if (isNewLap) {
        console.log(`✨ NEW LAP recorded: ${driverName} - Lap ${lapNumber}, Time: ${currentDriver.T}ms, P${currentDriver.P}`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing lap for ${driverName}:`, error);
      // Don't throw - continue processing other drivers
    }
  }
  
  /**
   * Get lap progression for a specific driver in a session
   */
  static async getDriverLapProgression(webUserId: string, sessionId: string) {
    try {
      await connectDB();
      
      const laps = await LapRecord.find({
        webUserId,
        sessionId
      })
      .sort({ lapNumber: 1, timestamp: 1 })
      .lean();
      
      return laps.map(lap => ({
        lapNumber: lap.lapNumber,
        position: lap.position,
        lapTime: lap.lastTime,
        bestTime: lap.bestTime,
        gapToLeader: lap.gapToLeader,
        positionChange: lap.positionChange,
        isPersonalBest: lap.isPersonalBest,
        timestamp: lap.timestamp
      }));
      
    } catch (error) {
      console.error('❌ Error getting lap progression:', error);
      return [];
    }
  }
  
  /**
   * Get recent session lap data for dashboard
   * UPDATED: Uses new DriverRaceData structure first, fallback to legacy
   */
  static async getRecentSessionLaps(webUserId: string, limit = 5) {
    try {
      await connectDB();
      
      console.log(`📊 Getting recent sessions for webUserId: ${webUserId}`);
      
      // PRIORITY 1: Try new driver-centric structure
      const newStructureSessions = await DriverRaceDataService.getRecentSessions(webUserId, limit);
      
      if (newStructureSessions && newStructureSessions.length > 0) {
        console.log(`✅ Found ${newStructureSessions.length} sessions in NEW structure`);
        
        // Convert to dashboard format
        return newStructureSessions.map(session => ({
          _id: session.sessionId,
          sessionName: session.sessionName,
          lastLap: session.sessionDate,
          totalLaps: session.totalLaps,
          bestPosition: session.bestPosition,
          bestLapTime: session.bestTime,
          // Additional data from new structure
          lapByLapData: session.laps,
          sessionType: session.sessionType,
          revenue: session.revenue
        }));
      }
      
      console.log(`⚠️ No data in NEW structure, falling back to LEGACY lap_records`);
      
      // FALLBACK: Legacy lap_records structure
      const recentSessions = await LapRecord.aggregate([
        { $match: { webUserId } },
        { 
          $group: {
            _id: '$sessionId',
            sessionName: { $first: '$sessionName' },
            lastLap: { $max: '$timestamp' },
            totalLaps: { $max: '$lapNumber' },
            bestPosition: { $min: '$position' },
            bestLapTime: { $min: '$lastTime' }
          }
        },
        { $sort: { lastLap: -1 } },
        { $limit: limit }
      ]);
      
      console.log(`📊 Found ${recentSessions.length} sessions in LEGACY structure`);
      return recentSessions;
      
    } catch (error) {
      console.error('❌ Error getting recent session laps:', error);
      return [];
    }
  }
  
  /**
   * Get position progression for a specific session
   */
  static async getSessionPositionProgression(sessionId: string) {
    try {
      await connectDB();
      
      const progression = await LapRecord.aggregate([
        { $match: { sessionId } },
        {
          $group: {
            _id: {
              driverName: '$driverName',
              lapNumber: '$lapNumber'
            },
            position: { $avg: '$position' },
            lapTime: { $avg: '$lastTime' },
            timestamp: { $max: '$timestamp' }
          }
        },
        {
          $group: {
            _id: '$_id.driverName',
            laps: {
              $push: {
                lapNumber: '$_id.lapNumber',
                position: '$position',
                lapTime: '$lapTime',
                timestamp: '$timestamp'
              }
            }
          }
        },
        {
          $project: {
            driverName: '$_id',
            laps: {
              $sortArray: {
                input: '$laps',
                sortBy: { lapNumber: 1 }
              }
            }
          }
        }
      ]);
      
      return progression;
      
    } catch (error) {
      console.error('❌ Error getting session progression:', error);
      return [];
    }
  }
  
  /**
   * Get lap-by-lap progression for a specific driver and session
   * UPDATED: Uses new structure first, fallback to legacy
   */
  static async getSessionLapByLap(webUserId: string, sessionId: string) {
    try {
      await connectDB();
      
      console.log(`🏁 Getting lap-by-lap data: ${webUserId} - ${sessionId}`);
      
      // PRIORITY 1: Try new driver-centric structure
      const lapByLapData = await DriverRaceDataService.getSessionLaps(webUserId, sessionId);
      
      if (lapByLapData && lapByLapData.length > 0) {
        console.log(`✅ Found ${lapByLapData.length} laps in NEW structure`);
        return {
          success: true,
          source: 'new_structure',
          laps: lapByLapData
        };
      }
      
      console.log(`⚠️ No lap-by-lap data in NEW structure, falling back to LEGACY`);
      
      // FALLBACK: Legacy structure (less detailed)
      const legacyProgression = await this.getDriverLapProgression(webUserId, sessionId);
      
      return {
        success: true,
        source: 'legacy_structure',
        laps: legacyProgression
      };
      
    } catch (error) {
      console.error('❌ Error getting lap-by-lap data:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        laps: []
      };
    }
  }
  
  /**
   * Update real-time records (Best Driver Times & Best Kart Times)
   * This is the FASTEST way to get rankings - no searching needed!
   */
  private static async updateRealTimeRecords(smsData: SMSData): Promise<void> {
    try {
      const sessionName = smsData.N;
      const sessionDate = new Date();
      const sessionTime = sessionDate.toLocaleTimeString('es-CL', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      const sessionId = `${sessionName}_${sessionDate.toDateString()}`;

      console.log(`🏆 Processing ${smsData.D.length} drivers for real-time records...`);

      for (const driverData of smsData.D) {
        const driverName = driverData.N?.trim();
        const kartNumber = driverData.K;
        const bestTime = driverData.B; // Best time in milliseconds
        
        // Skip invalid data
        if (!driverName || !kartNumber || !bestTime || bestTime <= 0) {
          continue;
        }

        console.log(`🚗 Checking records for: ${driverName} on Kart #${kartNumber} - ${bestTime}ms`);

        // Update driver record (Top 10 unique drivers)
        try {
          const driverResult = await BestDriverTime.updateDriverRecord(
            driverName,
            bestTime,
            kartNumber,
            sessionId,
            sessionName,
            sessionDate,
            sessionTime
          );

          if (driverResult.newRecord) {
            console.log(`🎉 NEW DRIVER RECORD: ${driverName} - ${bestTime}ms`);
          }
        } catch (driverError) {
          console.error(`❌ Error updating driver record for ${driverName}:`, driverError);
        }

        // Update kart record (Top 20 unique karts)
        try {
          const kartResult = await BestKartTime.updateKartRecord(
            kartNumber,
            bestTime,
            driverName,
            sessionId,
            sessionName,
            sessionDate,
            sessionTime
          );

          if (kartResult.newRecord) {
            console.log(`🎉 NEW KART RECORD: Kart #${kartNumber} - ${bestTime}ms by ${driverName}`);
          }
        } catch (kartError) {
          console.error(`❌ Error updating kart record for Kart #${kartNumber}:`, kartError);
        }
      }

      console.log(`✅ Real-time records processing completed`);

    } catch (error) {
      console.error('❌ Error in updateRealTimeRecords:', error);
      throw error;
    }
  }

  /**
   * Clean up old lap records (keep only last 30 days)
   */
  static async cleanupOldRecords() {
    try {
      await connectDB();
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const result = await LapRecord.deleteMany({
        timestamp: { $lt: thirtyDaysAgo }
      });
      
      console.log(`🧹 Cleaned up ${result.deletedCount} old lap records`);
      return result.deletedCount;
      
    } catch (error) {
      console.error('❌ Error cleaning up records:', error);
      return 0;
    }
  }
}

export default LapCaptureService;