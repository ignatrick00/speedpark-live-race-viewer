import connectDB from './mongodb';
import LapRecord from '@/models/LapRecord';
import DriverIdentityService from './driverIdentityService';

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
   */
  static async processLapData(smsData: SMSData): Promise<void> {
    try {
      await connectDB();
      
      const sessionName = smsData.N;
      const sessionTimestamp = new Date();
      const sessionId = `${sessionName}_${sessionTimestamp.toDateString()}`;
      
      console.log(`🏁 Processing lap data for: ${sessionName} - ${smsData.D.length} drivers`);
      
      // Get previous data for this session to detect changes
      const previousData = this.previousSessionData.get(sessionName) || [];
      const currentData = smsData.D;
      
      // Process each driver's current data
      for (const [index, driverData] of currentData.entries()) {
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
      
      console.log(`✅ Lap data processed for ${currentData.length} drivers`);
      
    } catch (error) {
      console.error('❌ Error processing lap data:', error);
      throw error;
    }
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
   */
  static async getRecentSessionLaps(webUserId: string, limit = 5) {
    try {
      await connectDB();
      
      // Get recent sessions for this user
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