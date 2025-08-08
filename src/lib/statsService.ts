import connectDB from './mongodb';
import RaceSession from '@/models/RaceSession';
import UserLinkingService from './userLinkingService';
import { getStatsTracker } from './stats-tracker';

interface DriverData {
  pos: number;
  name: string;
  kart: number;
  lap: number;
  bestTime: number;
  lastTime: number;
  avgTime: number;
  gap: string;
}

export class StatsService {
  
  /**
   * Record a new session in both JSON and MongoDB
   */
  static async recordSession(sessionName: string, drivers: string[], smsData?: any) {
    try {
      console.log(`📊 Recording session: ${sessionName} with ${drivers.length} drivers`);
      
      // 1. Record in JSON system (existing functionality)
      const tracker = await getStatsTracker();
      const jsonSession = await tracker.recordSession(sessionName, drivers);
      console.log(`✅ JSON session recorded: ${jsonSession.id}`);
      
      // 2. Connect to MongoDB
      await connectDB();
      
      // 3. Create session data for MongoDB
      const sessionId = `session_${Date.now()}_${sessionName.replace(/\s/g, '_')}`;
      const sessionTimestamp = new Date();
      
      // Parse SMS-Timing data with FULL REAL DETAILS
      const driversData: any[] = [];
      if (smsData && smsData.D && Array.isArray(smsData.D)) {
        console.log(`📊 Processing ${smsData.D.length} drivers with REAL SMS-Timing data`);
        
        smsData.D.forEach((driver: any, index: number) => {
          const driverDetails = {
            name: driver.N || drivers[index] || `Driver_${index + 1}`,
            position: driver.P || index + 1,
            kartNumber: driver.K || 0,
            lapCount: driver.L || 0,
            bestTime: driver.B || 0, // REAL best time from SMS
            lastTime: driver.T || 0, // REAL last lap time
            averageTime: driver.A || 0, // REAL average time
            gapToLeader: driver.G || '0.000', // REAL gap
            
            // ADDITIONAL REAL DATA if available
            sector1: driver.S1 || null,
            sector2: driver.S2 || null, 
            sector3: driver.S3 || null,
            totalTime: driver.TT || null,
            penalties: driver.PE || 0,
            
            // PERFORMANCE METRICS calculated from real data
            consistency: this.calculateConsistency(driver),
            pace: this.calculatePace(driver),
            isRealData: true, // Mark as official SMS data
            
            // RAW SMS DATA for full traceability
            rawSMSData: driver
          };
          
          driversData.push(driverDetails);
          console.log(`👤 ${driverDetails.name}: P${driverDetails.position}, Kart #${driverDetails.kartNumber}, Best: ${driverDetails.bestTime}ms`);
        });
      } else {
        // Fallback if no SMS data
        drivers.forEach((driverName, index) => {
          driversData.push({
            name: driverName,
            position: index + 1,
            kartNumber: 0,
            lapCount: 0,
            bestTime: 0,
            lastTime: 0,
            averageTime: 0,
            gapToLeader: '0.000',
          });
        });
      }
      
      // 4. Check if session already exists (duplicate prevention)
      const existingSession = await RaceSession.findOne({ 
        sessionId: { $regex: new RegExp(sessionName.replace(/\s/g, '_'), 'i') },
        timestamp: {
          $gte: new Date(sessionTimestamp.getTime() - 5 * 60 * 1000), // Last 5 minutes
        }
      });
      
      if (existingSession) {
        console.log(`⏭️ MongoDB session already exists: ${sessionName}`);
        return { 
          success: true, 
          jsonSession, 
          mongoSession: existingSession,
          message: 'Session already recorded in MongoDB'
        };
      }
      
      // 5. Create new MongoDB session
      const mongoSession = await RaceSession.create({
        sessionId,
        sessionName,
        sessionType: sessionName.toLowerCase().includes('clasificacion') ? 'classification' : 'practice',
        drivers: driversData,
        revenue: sessionName.toLowerCase().includes('clasificacion') ? drivers.length * 17000 : 0,
        timestamp: sessionTimestamp,
        venue: 'Speed Park',
        source: 'sms_timing',
        processed: false,
        linkedUsers: [],
      });
      
      console.log(`✅ MongoDB session created: ${mongoSession.sessionId}`);
      
      // 6. Process user linking (in background, don't await)
      if (smsData) {
        this.processUserLinkingAsync(smsData, sessionTimestamp).catch(error => {
          console.error('❌ Background user linking failed:', error);
        });
      }
      
      return {
        success: true,
        jsonSession,
        mongoSession: {
          id: mongoSession._id,
          sessionId: mongoSession.sessionId,
          sessionName: mongoSession.sessionName,
          driversCount: mongoSession.drivers.length,
          revenue: mongoSession.revenue,
          timestamp: mongoSession.timestamp,
        },
        message: 'Session recorded in both JSON and MongoDB'
      };
      
    } catch (error) {
      console.error('❌ Error recording session:', error);
      
      // Try to record in JSON at least
      try {
        const tracker = await getStatsTracker();
        const jsonSession = await tracker.recordSession(sessionName, drivers);
        console.log('⚠️ Fallback: Session recorded in JSON only');
        
        return {
          success: true,
          jsonSession,
          mongoSession: null,
          message: 'Session recorded in JSON only (MongoDB failed)',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      } catch (fallbackError) {
        console.error('❌ Complete failure recording session:', fallbackError);
        throw error;
      }
    }
  }
  
  /**
   * Process user linking in background
   */
  private static async processUserLinkingAsync(smsData: any, timestamp: Date) {
    try {
      console.log('🔗 Processing user linking in background...');
      await UserLinkingService.processRaceData(smsData, timestamp);
      console.log('✅ Background user linking completed');
    } catch (error) {
      console.error('❌ Background user linking error:', error);
      // Don't throw - this is background processing
    }
  }
  
  /**
   * Get combined stats from both systems
   */
  static async getCombinedStats() {
    try {
      // 1. Get JSON stats (existing system)
      const tracker = await getStatsTracker();
      const jsonStats = await tracker.getStats();
      
      // 2. Get MongoDB stats
      await connectDB();
      
      const mongoStats = await this.getMongoStats();
      
      return {
        json: jsonStats,
        mongo: mongoStats,
        combined: {
          totalRaces: jsonStats.totalRaces,
          totalDrivers: jsonStats.totalDrivers,
          revenueTotal: jsonStats.revenueTotal,
          lastUpdate: jsonStats.lastUpdate,
          // Add MongoDB-specific data
          mongoSessionsCount: mongoStats.totalSessions,
          linkedUsersCount: mongoStats.linkedUsers,
          avgDriversPerRace: mongoStats.avgDriversPerSession,
        }
      };
      
    } catch (error) {
      console.error('❌ Error getting combined stats:', error);
      
      // Fallback to JSON stats only
      try {
        const tracker = await getStatsTracker();
        const jsonStats = await tracker.getStats();
        return {
          json: jsonStats,
          mongo: null,
          combined: jsonStats,
          error: 'MongoDB stats unavailable'
        };
      } catch (fallbackError) {
        throw new Error('Both JSON and MongoDB stats failed');
      }
    }
  }
  
  /**
   * Get MongoDB-specific statistics
   */
  private static async getMongoStats() {
    try {
      const [
        totalSessions,
        totalDriversInMongo,
        totalRevenue,
        linkedUsers,
        todaySessions
      ] = await Promise.all([
        RaceSession.countDocuments(),
        RaceSession.aggregate([
          { $unwind: '$drivers' },
          { $group: { _id: '$drivers.name' } },
          { $count: 'uniqueDrivers' }
        ]),
        RaceSession.aggregate([
          { $group: { _id: null, totalRevenue: { $sum: '$revenue' } } }
        ]),
        RaceSession.aggregate([
          { $unwind: '$linkedUsers' },
          { $match: { 'linkedUsers.webUserId': { $ne: null } } },
          { $count: 'linkedUsers' }
        ]),
        RaceSession.countDocuments({
          timestamp: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        })
      ]);
      
      return {
        totalSessions,
        uniqueDrivers: totalDriversInMongo[0]?.uniqueDrivers || 0,
        totalRevenue: totalRevenue[0]?.totalRevenue || 0,
        linkedUsers: linkedUsers[0]?.linkedUsers || 0,
        todaySessions,
        avgDriversPerSession: totalSessions > 0 ? Math.round((totalDriversInMongo[0]?.uniqueDrivers || 0) / totalSessions) : 0,
      };
    } catch (error) {
      console.error('❌ Error getting MongoDB stats:', error);
      return {
        totalSessions: 0,
        uniqueDrivers: 0,
        totalRevenue: 0,
        linkedUsers: 0,
        todaySessions: 0,
        avgDriversPerSession: 0,
      };
    }
  }
  
  /**
   * Get recent MongoDB sessions
   */
  static async getRecentSessions(limit = 10) {
    try {
      await connectDB();
      
      const sessions = await RaceSession.find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .select('sessionId sessionName drivers revenue timestamp processed linkedUsers')
        .lean();
      
      return sessions.map(session => ({
        id: session.sessionId,
        name: session.sessionName,
        driversCount: session.drivers.length,
        revenue: session.revenue,
        timestamp: session.timestamp,
        processed: session.processed,
        linkedUsersCount: session.linkedUsers?.filter((lu: any) => lu.webUserId).length || 0,
      }));
      
    } catch (error) {
      console.error('❌ Error getting recent sessions:', error);
      return [];
    }
  }
}

export default StatsService;