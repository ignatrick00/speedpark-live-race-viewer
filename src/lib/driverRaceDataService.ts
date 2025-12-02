import connectDB from './mongodb';
import DriverRaceData, { IDriverRaceData, IRaceSession, ILap } from '@/models/DriverRaceData';
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

export class DriverRaceDataService {
  
  // Store last session data to detect new laps
  private static lastSessionData: Map<string, SMSDriverData[]> = new Map();
  
  /**
   * Main function to process SMS data and update driver race data
   */
  static async processRaceData(smsData: SMSData): Promise<void> {
    try {
      console.log(`🔍 DriverRaceDataService.processRaceData starting for: ${smsData.N}`);
      
      await connectDB();
      console.log(`✅ Database connected in DriverRaceDataService`);
      
      const sessionName = smsData.N;
      const sessionTimestamp = new Date();
      const sessionId = `${sessionName}_${sessionTimestamp.toDateString()}`;
      
      console.log(`📋 Session details: ID=${sessionId}, Timestamp=${sessionTimestamp.toISOString()}`);
      
      // Determine session type
      const sessionType = this.determineSessionType(sessionName);
      console.log(`🏁 Session type determined: ${sessionType}`);
      
      // Get previous data for lap detection
      const previousData = this.lastSessionData.get(sessionName) || [];
      const currentData = smsData.D;
      
      console.log(`👥 Processing ${currentData.length} drivers (had ${previousData.length} previous)`);
      
      // Process each driver
      for (let index = 0; index < currentData.length; index++) {
        const driverData = currentData[index];
        console.log(`👤 Processing driver ${index + 1}/${currentData.length}: ${driverData.N}`);
        
        try {
          await this.processDriverData(
            sessionId,
            sessionName,
            sessionTimestamp,
            sessionType,
            driverData,
            previousData[index]
          );
          console.log(`✅ Driver ${driverData.N} processed successfully`);
        } catch (driverError) {
          console.error(`❌ Error processing driver ${driverData.N}:`, driverError);
          throw driverError;
        }
      }
      
      // Store current data for next comparison
      this.lastSessionData.set(sessionName, [...currentData]);
      
      console.log(`✅ DriverRaceDataService.processRaceData completed successfully for: ${sessionName}`);
      
    } catch (error) {
      console.error('❌ Error in DriverRaceDataService.processRaceData:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('❌ Session name that caused error:', smsData.N);
      console.error('❌ Drivers count that caused error:', smsData.D?.length || 0);
      throw error;
    }
  }
  
  /**
   * Process individual driver data and update/create driver record
   */
  private static async processDriverData(
    sessionId: string,
    sessionName: string,
    timestamp: Date,
    sessionType: 'clasificacion' | 'carrera' | 'practica' | 'otro',
    currentDriver: SMSDriverData,
    previousDriver?: SMSDriverData
  ): Promise<void> {
    
    const driverName = currentDriver.N?.trim();
    if (!driverName) {
      return; // Skip empty names
    }
    
    
    try {
      // Find or create driver record
      let driverRecord = await DriverRaceData.findOne({ driverName });
      
      if (!driverRecord) {
        driverRecord = await this.createNewDriverRecord(driverName, currentDriver);
      }
      
      // Update linking information
      await this.updateDriverLinking(driverRecord, driverName, timestamp);
      
      // Find or create session within driver record
      let session = driverRecord.sessions.find((s: IRaceSession) => s.sessionId === sessionId);
      
      if (!session) {
        session = this.createNewSession(sessionId, sessionName, timestamp, sessionType, currentDriver);
        driverRecord.sessions.push(session);
      }
      
      // Detect if this is a new lap
      const isNewLap = this.isNewLap(currentDriver, previousDriver);
      
      if (isNewLap) {
        await this.addNewLap(session, currentDriver, timestamp);
      }
      
      // Always update session summary data (position changes, etc.)
      this.updateSessionSummary(session, currentDriver);
      
      // Recalculate aggregate statistics
      driverRecord.recalculateStats();
      
      // Save the updated driver record
      console.log(`💾 Attempting to save ${driverName}...`);
      await driverRecord.save();
      console.log(`✅ Successfully saved ${driverName} with ${driverRecord.sessions?.length || 0} sessions`);


    } catch (error) {
      console.error(`❌❌❌ CRITICAL ERROR processing ${driverName}:`, error);
      console.error(`❌ Error message:`, error instanceof Error ? error.message : String(error));
      console.error(`❌ Error stack:`, error instanceof Error ? error.stack : 'No stack');
    }
  }
  
  /**
   * Create new driver record
   */
  private static async createNewDriverRecord(driverName: string, driverData: SMSDriverData): Promise<IDriverRaceData> {
    // Parse name components
    const { firstName, lastName, alias } = this.parseDriverName(driverName);
    
    return new DriverRaceData({
      driverName,
      firstName,
      lastName,
      alias,
      sessions: [],
      linkingStatus: 'unlinked',
      linkingMethod: 'exact_match',
      linkingConfidence: 'low',
      stats: {
        totalRaces: 0,
        totalLaps: 0,
        totalSpent: 0,
        allTimeBestLap: 0,
        averageLapTime: 0,
        bestPosition: 999,
        podiumFinishes: 0
      }
    });
  }
  
  /**
   * Update driver linking information
   */
  private static async updateDriverLinking(driverRecord: IDriverRaceData, driverName: string, timestamp: Date): Promise<void> {
    // Only update linking if not already manually linked
    if (driverRecord.linkingStatus !== 'manual' && driverRecord.linkingStatus !== 'linked') {
      try {
        const linkingResult = await DriverIdentityService.linkDriver(driverName, timestamp);
        
        driverRecord.webUserId = linkingResult.webUserId;
        driverRecord.personId = linkingResult.personId;
        driverRecord.linkingConfidence = linkingResult.confidence;
        driverRecord.linkingMethod = linkingResult.method;
        driverRecord.linkingStatus = linkingResult.webUserId ? 'linked' : 'pending';
        
      } catch (error) {
      }
    }
  }
  
  /**
   * Create new session record
   */
  private static createNewSession(
    sessionId: string,
    sessionName: string,
    timestamp: Date,
    sessionType: 'clasificacion' | 'carrera' | 'practica' | 'otro',
    driverData: SMSDriverData
  ): IRaceSession {
    
    return {
      sessionId,
      sessionName,
      sessionDate: timestamp,
      sessionType,
      bestTime: driverData.B || 0,
      lastTime: driverData.T || 0,
      averageTime: driverData.A || 0,
      bestPosition: driverData.P || 999,
      totalLaps: driverData.L || 0,
      kartNumber: driverData.K,
      laps: [],
      processed: false,
      revenue: sessionType === 'clasificacion' ? 17000 : 0
    };
  }
  
  /**
   * Detect if we should save current data as a snapshot
   * STRATEGY: Save every valid update (already rate-limited to 4 seconds)
   * This captures the driver's progress without duplicates
   */
  private static isNewLap(current: SMSDriverData, previous?: SMSDriverData): boolean {
    if (!previous) {
      console.log(`🆕 [LAP DETECTION] First time seeing driver ${current.N} - WILL SAVE`);
      return true; // First time seeing this driver
    }

    // Method 1: Lap count increased (most reliable indicator of new lap)
    const lapIncreased = current.L > (previous.L || 0);

    // Method 2: Any data changed (driver is active in session)
    const dataChanged =
      current.L !== previous.L ||
      current.T !== previous.T ||
      current.B !== previous.B ||
      current.P !== previous.P;

    // Save if lap increased OR if any data changed
    // Rate limiting (4 seconds) prevents duplicates and MongoDB overload
    const shouldSave = lapIncreased || dataChanged;

    // Enhanced diagnostic logging
    console.log(`🔍 [LAP DETECTION] ${current.N}:`, {
      currentLap: current.L,
      previousLap: previous.L || 0,
      lapIncreased,
      currentTime: current.T,
      previousTime: previous.T,
      timeChanged: current.T !== previous.T,
      currentBest: current.B,
      previousBest: previous.B,
      bestChanged: current.B !== previous.B,
      positionChanged: current.P !== previous.P,
      WILL_SAVE: shouldSave ? '✅ YES' : '❌ NO',
      reason: shouldSave
        ? (lapIncreased ? 'LAP_COUNT_INCREASED' : 'DATA_CHANGED')
        : 'NO_CHANGE'
    });

    return shouldSave;
  }
  
  /**
   * Add new lap to session
   */
  private static async addNewLap(session: IRaceSession, driverData: SMSDriverData, timestamp: Date): Promise<void> {
    const lapNumber = driverData.L || 0;
    const lapTime = driverData.T || 0;

    // Check if lap already exists (duplicate detection)
    const existingLap = session.laps.find(lap => lap.lapNumber === lapNumber);
    if (existingLap) {
      console.log(`⚠️ [DUPLICATE LAP] ${driverData.N} - Lap ${lapNumber} already exists, replacing...`);
    }

    // Enhanced duplicate prevention: Remove any existing lap with same lap number first
    session.laps = session.laps.filter(lap => lap.lapNumber !== lapNumber);

    // Determine if this is a personal best lap
    const isPersonalBest = (driverData.B === lapTime) && lapTime > 0;

    const newLap: ILap = {
      lapNumber,
      time: lapTime,
      position: driverData.P || 999,
      kartNumber: driverData.K,
      timestamp,
      gapToLeader: driverData.G || '0.000',
      isPersonalBest
    };

    // Add new lap and sort
    session.laps.push(newLap);
    session.laps.sort((a, b) => a.lapNumber - b.lapNumber);

    console.log(`✅ [LAP ADDED] ${driverData.N} - Lap ${lapNumber}: ${lapTime}ms, P${driverData.P}, Total laps in session: ${session.laps.length}`);
  }
  
  /**
   * Update session summary information
   */
  private static updateSessionSummary(session: IRaceSession, driverData: SMSDriverData): void {
    // Update best time
    if (driverData.B && (driverData.B < session.bestTime || session.bestTime === 0)) {
      session.bestTime = driverData.B;
    }
    
    // Update last time
    if (driverData.T) {
      session.lastTime = driverData.T;
    }
    
    // Update average time
    if (driverData.A) {
      session.averageTime = driverData.A;
    }
    
    // Update best position
    if (driverData.P && driverData.P < session.bestPosition) {
      session.bestPosition = driverData.P;
    }
    
    // Update total laps
    if (driverData.L > session.totalLaps) {
      session.totalLaps = driverData.L;
    }
    
    // Update kart number
    if (driverData.K) {
      session.kartNumber = driverData.K;
    }
    
    // Set final position (assume current position is final until session ends)
    session.finalPosition = driverData.P;
  }
  
  /**
   * Determine session type from name
   */
  private static determineSessionType(sessionName: string): 'clasificacion' | 'carrera' | 'practica' | 'otro' {
    const name = sessionName.toLowerCase();
    
    if (name.includes('clasificacion') || name.includes('qualifying')) {
      return 'clasificacion';
    }
    if (name.includes('carrera') || name.includes('race')) {
      return 'carrera';
    }
    if (name.includes('practica') || name.includes('practice')) {
      return 'practica';
    }
    
    return 'otro';
  }
  
  /**
   * Parse driver name into components
   */
  private static parseDriverName(driverName: string): { firstName?: string; lastName?: string; alias?: string } {
    const parts = driverName.trim().split(' ');
    
    if (parts.length === 1) {
      // Single name - For exact matching system, we need both firstName AND lastName
      const singleName = parts[0];
      
      // Check if it looks like a first name (common Chilean names)
      const commonFirstNames = [
        'diego', 'bastian', 'sebastian', 'carlos', 'luis', 'juan', 'pedro', 'jose', 'manuel', 'manu',
        'rodrigo', 'felipe', 'gonzalo', 'ricardo', 'fernando', 'alejandro', 'andres', 'francisco',
        'cristian', 'gabriel', 'daniel', 'nicolas', 'pablo', 'matias', 'ignacio', 'patricio'
      ];
      
      const isLikelyFirstName = commonFirstNames.some(name => 
        singleName.toLowerCase() === name || 
        singleName.toLowerCase().includes(name) || 
        name.includes(singleName.toLowerCase())
      );
      
      if (isLikelyFirstName) {
        // Treat as firstName, but also suggest it could be used as lastName for matching
        return { 
          firstName: singleName, 
          lastName: singleName, // For exact matching: both first and last
          alias: singleName 
        };
      } else {
        // Might be a surname or nickname
        return { 
          firstName: singleName, // Still provide as firstName
          lastName: singleName,  // Also as lastName for matching
          alias: singleName 
        };
      }
    }
    
    if (parts.length === 2) {
      return { 
        firstName: parts[0], 
        lastName: parts[1],
        alias: parts[0] // First name as alias is common
      };
    }
    
    // Multiple parts - first is firstName, rest is lastName
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' '),
      alias: parts[0] // First name as alias
    };
  }
  
  /**
   * Get all drivers (for debugging)
   */
  static async getAllDrivers(): Promise<IDriverRaceData[]> {
    try {
      await connectDB();
      return await DriverRaceData.find({}).limit(20); // Limit for debugging
    } catch (error) {
      console.error('Error getting all drivers:', error);
      return [];
    }
  }

  /**
   * Get driver race data by name
   */
  static async getDriverData(driverName: string): Promise<IDriverRaceData | null> {
    try {
      await connectDB();
      return await DriverRaceData.findOne({ driverName });
    } catch (error) {
      console.error('Error getting driver data:', error);
      return null;
    }
  }
  
  /**
   * Get driver data by web user ID
   */
  static async getDriverDataByWebUserId(webUserId: string): Promise<IDriverRaceData | null> {
    try {
      await connectDB();
      return await DriverRaceData.findOne({ webUserId });
    } catch (error) {
      console.error('Error getting driver data by webUserId:', error);
      return null;
    }
  }
  
  /**
   * Get recent sessions for a driver
   */
  static async getRecentSessions(webUserId: string, limit = 5): Promise<IRaceSession[]> {
    try {
      await connectDB();
      
      const driverData = await DriverRaceData.findOne({ webUserId });
      if (!driverData) return [];
      
      return driverData.sessions
        .sort((a: IRaceSession, b: IRaceSession) => b.sessionDate.getTime() - a.sessionDate.getTime())
        .slice(0, limit);
        
    } catch (error) {
      console.error('Error getting recent sessions:', error);
      return [];
    }
  }
  
  /**
   * Get lap-by-lap data for specific session
   */
  static async getSessionLaps(webUserId: string, sessionId: string): Promise<ILap[]> {
    try {
      await connectDB();
      
      const driverData = await DriverRaceData.findOne({ webUserId });
      if (!driverData) return [];
      
      const session = driverData.sessions.find((s: IRaceSession) => s.sessionId === sessionId);
      return session ? session.laps : [];
      
    } catch (error) {
      console.error('Error getting session laps:', error);
      return [];
    }
  }
}

export default DriverRaceDataService;