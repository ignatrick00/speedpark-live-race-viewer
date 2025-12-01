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

  // Rate limiting to prevent MongoDB overload
  private static lastProcessTime = 0;
  private static MIN_INTERVAL = 4000; // 4 seconds minimum between processing
  private static pendingUpdate: SMSData | null = null;
  private static updateTimer: NodeJS.Timeout | null = null;

  /**
   * Main function to process and store lap-by-lap data
   * NOW WITH RATE LIMITING to prevent MongoDB overload
   */
  static async processLapData(smsData: SMSData): Promise<void> {
    const now = Date.now();
    const timeSinceLastProcess = now - this.lastProcessTime;

    // Always store the most recent update
    this.pendingUpdate = smsData;

    if (timeSinceLastProcess < this.MIN_INTERVAL) {
      // Too soon - schedule for later
      if (!this.updateTimer) {
        const delay = this.MIN_INTERVAL - timeSinceLastProcess;
        console.log(`⏳ [RATE LIMIT] Update queued for ${smsData.N} - will process in ${delay}ms`);

        this.updateTimer = setTimeout(async () => {
          this.updateTimer = null;
          if (this.pendingUpdate) {
            console.log(`⏰ [RATE LIMIT] Processing queued update for ${this.pendingUpdate.N}`);
            await this.processLapDataImmediate(this.pendingUpdate);
          }
        }, delay);
      } else {
        console.log(`⏭️ [RATE LIMIT] Replacing queued update with newer data for ${smsData.N}`);
      }
      return;
    }

    // Clear any pending timer since we're processing now
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }

    // Process immediately
    await this.processLapDataImmediate(smsData);
  }

  /**
   * Internal method to actually process the lap data
   */
  private static async processLapDataImmediate(smsData: SMSData): Promise<void> {
    this.lastProcessTime = Date.now();
    this.pendingUpdate = null;

    try {
      console.log(`🔍 [PROCESSING] Starting processLapData for: ${smsData.N}`);

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

      // PRIORITY 3: Maintain legacy individual records for compatibility (reduced frequency)
      // Disabled legacy processing to reduce MongoDB load
      // if (Math.random() < 0.05) { // Only 5% of the time
      //   try {
      //     console.log(`📝 Processing legacy lap data...`);
      //     await this.processLegacyLapData(smsData);
      //     console.log(`✅ Legacy lap data processed`);
      //   } catch (legacyError) {
      //     console.error('⚠️ Error in legacy processing (non-critical):', legacyError);
      //   }
      // }

      console.log(`✅ [PROCESSING] Lap data processed successfully with rate limiting`);

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
          console.log(`🏆 Checking driver record for: ${driverName} - ${bestTime}ms`);
          
          // Find existing record for this driver
          const existingDriverRecord = await BestDriverTime.findOne({ driverName });
          
          if (existingDriverRecord) {
            // Driver exists - only update if new time is better
            if (bestTime < existingDriverRecord.bestTime) {
              console.log(`🎯 NEW DRIVER RECORD! ${driverName}: ${existingDriverRecord.bestTime}ms → ${bestTime}ms`);
              existingDriverRecord.bestTime = bestTime;
              existingDriverRecord.kartNumber = kartNumber;
              existingDriverRecord.sessionId = sessionId;
              existingDriverRecord.sessionName = sessionName;
              existingDriverRecord.sessionDate = sessionDate;
              existingDriverRecord.sessionTime = sessionTime;
              existingDriverRecord.lastUpdated = new Date();
              await existingDriverRecord.save();
              
              // Recalculate positions
              await this.recalculateDriverPositions();
            } else {
              console.log(`⏱️ No improvement for ${driverName}: current ${existingDriverRecord.bestTime}ms vs new ${bestTime}ms`);
            }
          } else {
            // New driver - check if there's room in top 10
            const currentCount = await BestDriverTime.countDocuments();
            
            if (currentCount < 10) {
              // Room available - add new driver
              const newRecord = new BestDriverTime({
                position: currentCount + 1,
                driverName,
                bestTime,
                kartNumber,
                sessionId,
                sessionName,
                sessionDate,
                sessionTime
              });
              
              await newRecord.save();
              console.log(`✨ NEW DRIVER ADDED to top 10: ${driverName} - ${bestTime}ms`);
              
              // Recalculate positions
              await this.recalculateDriverPositions();
            } else {
              // Check if new time beats the worst in top 10
              const worstRecord = await BestDriverTime.findOne().sort({ bestTime: -1 });
              
              if (worstRecord && bestTime < worstRecord.bestTime) {
                console.log(`🔄 REPLACING worst record: ${worstRecord.driverName} (${worstRecord.bestTime}ms) with ${driverName} (${bestTime}ms)`);
                
                await BestDriverTime.deleteOne({ _id: worstRecord._id });
                
                const newRecord = new BestDriverTime({
                  position: 10,
                  driverName,
                  bestTime,
                  kartNumber,
                  sessionId,
                  sessionName,
                  sessionDate,
                  sessionTime
                });
                
                await newRecord.save();
                
                // Recalculate positions
                await this.recalculateDriverPositions();
              } else {
                console.log(`📊 ${driverName} time ${bestTime}ms not good enough for top 10`);
              }
            }
          }
        } catch (driverError) {
          console.error(`❌ Error updating driver record for ${driverName}:`, driverError);
        }

        // Update kart record (Top 20 unique karts)
        try {
          console.log(`🏎️ Checking kart record for: Kart #${kartNumber} - ${bestTime}ms by ${driverName}`);
          
          // Find existing record for this kart
          const existingKartRecord = await BestKartTime.findOne({ kartNumber });
          
          if (existingKartRecord) {
            // Kart exists - only update if new time is better
            if (bestTime < existingKartRecord.bestTime) {
              console.log(`🎯 NEW KART RECORD! Kart #${kartNumber}: ${existingKartRecord.bestTime}ms → ${bestTime}ms (${existingKartRecord.driverName} → ${driverName})`);
              existingKartRecord.bestTime = bestTime;
              existingKartRecord.driverName = driverName;
              existingKartRecord.sessionId = sessionId;
              existingKartRecord.sessionName = sessionName;
              existingKartRecord.sessionDate = sessionDate;
              existingKartRecord.sessionTime = sessionTime;
              existingKartRecord.lastUpdated = new Date();
              await existingKartRecord.save();
              
              // Recalculate positions
              await this.recalculateKartPositions();
            } else {
              console.log(`⏱️ No improvement for Kart #${kartNumber}: current ${existingKartRecord.bestTime}ms vs new ${bestTime}ms`);
            }
          } else {
            // New kart - check if there's room in top 20
            const currentCount = await BestKartTime.countDocuments();
            
            if (currentCount < 20) {
              // Room available - add new kart
              const newRecord = new BestKartTime({
                position: currentCount + 1,
                kartNumber,
                bestTime,
                driverName,
                sessionId,
                sessionName,
                sessionDate,
                sessionTime
              });
              
              await newRecord.save();
              console.log(`✨ NEW KART ADDED to top 20: Kart #${kartNumber} - ${bestTime}ms by ${driverName}`);
              
              // Recalculate positions
              await this.recalculateKartPositions();
            } else {
              // Check if new time beats the worst in top 20
              const worstRecord = await BestKartTime.findOne().sort({ bestTime: -1 });
              
              if (worstRecord && bestTime < worstRecord.bestTime) {
                console.log(`🔄 REPLACING worst kart record: Kart #${worstRecord.kartNumber} (${worstRecord.bestTime}ms) with Kart #${kartNumber} (${bestTime}ms)`);
                
                await BestKartTime.deleteOne({ _id: worstRecord._id });
                
                const newRecord = new BestKartTime({
                  position: 20,
                  kartNumber,
                  bestTime,
                  driverName,
                  sessionId,
                  sessionName,
                  sessionDate,
                  sessionTime
                });
                
                await newRecord.save();
                
                // Recalculate positions
                await this.recalculateKartPositions();
              } else {
                console.log(`📊 Kart #${kartNumber} time ${bestTime}ms not good enough for top 20`);
              }
            }
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
   * Recalculate driver positions based on best times
   */
  private static async recalculateDriverPositions() {
    try {
      const records = await BestDriverTime.find().sort({ bestTime: 1 });
      
      for (let i = 0; i < records.length; i++) {
        if (records[i].position !== i + 1) {
          records[i].position = i + 1;
          await records[i].save();
        }
      }
      
      console.log(`📊 Recalculated positions for ${records.length} driver records`);
    } catch (error) {
      console.error('❌ Error recalculating driver positions:', error);
    }
  }

  /**
   * Recalculate kart positions based on best times
   */
  private static async recalculateKartPositions() {
    try {
      const records = await BestKartTime.find().sort({ bestTime: 1 });
      
      for (let i = 0; i < records.length; i++) {
        if (records[i].position !== i + 1) {
          records[i].position = i + 1;
          await records[i].save();
        }
      }
      
      console.log(`📊 Recalculated positions for ${records.length} kart records`);
    } catch (error) {
      console.error('❌ Error recalculating kart positions:', error);
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