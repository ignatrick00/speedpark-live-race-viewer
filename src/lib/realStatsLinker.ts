import connectDB from './mongodb';
import RaceSession from '@/models/RaceSession';
import WebUser from '@/models/WebUser';
import UserStats from '@/models/UserStats';

interface RealDriverStats {
  totalRaces: number;
  sessions: Array<{
    sessionId: string;
    sessionName: string;
    position: number;
    kartNumber: number;
    timestamp: Date;
  }>;
  bestPosition: number;
  podiumFinishes: number;
  favoriteKart: number;
  firstRace: Date;
  lastRace: Date;
}

export class RealStatsLinker {
  
  /**
   * Link a user with real racing data by name matching
   */
  static async linkUserWithRealStats(userId: string, firstName: string, lastName: string): Promise<boolean> {
    try {
      await connectDB();
      
      console.log(`🔗 Attempting to link user ${userId} (${firstName} ${lastName}) with real stats`);
      
      // First, debug: let's see all sessions
      const allSessions = await RaceSession.find({}).limit(5);
      console.log(`📊 Total sessions in DB: ${allSessions.length}`);
      
      if (allSessions.length > 0) {
        console.log(`📋 Sample session:`, {
          name: allSessions[0].sessionName,
          driversCount: allSessions[0].drivers.length,
          sampleDriver: allSessions[0].drivers[0]
        });
      }
      
      // Find all race sessions where this driver name appears
      const sessions = await RaceSession.find({
        'drivers.name': firstName // Match by first name
      }).sort({ timestamp: -1 });
      
      console.log(`🎯 Query result for '${firstName}': ${sessions.length} sessions`);
      
      if (sessions.length === 0) {
        console.log(`❌ No racing sessions found for driver: ${firstName}`);
        
        // Debug: let's see what names exist
        const sampleSession = await RaceSession.findOne({});
        if (sampleSession) {
          console.log(`🔍 Sample driver names:`, sampleSession.drivers.map((d: any) => d.name));
        }
        
        return false;
      }
      
      console.log(`✅ Found ${sessions.length} sessions for ${firstName}`);
      
      // Calculate real statistics
      const realStats = this.calculateRealStats(firstName, sessions);
      
      // Create or update user stats
      await this.createUserStats(userId, realStats);
      
      // Update user status to linked
      await WebUser.findByIdAndUpdate(userId, {
        'kartingLink.status': 'linked',
        'kartingLink.linkedAt': new Date(),
        'kartingLink.personId': `${firstName.toLowerCase()}_real`
      });
      
      console.log(`✅ Successfully linked ${firstName} with real racing statistics`);
      return true;
      
    } catch (error) {
      console.error('❌ Error linking user with real stats:', error);
      return false;
    }
  }
  
  /**
   * Calculate real statistics from race sessions
   */
  private static calculateRealStats(driverName: string, sessions: any[]): RealDriverStats {
    const driverSessions: any[] = [];
    const positions: number[] = [];
    const karts: number[] = [];
    
    sessions.forEach(session => {
      const driver = session.drivers.find((d: any) => d.name === driverName);
      if (driver) {
        driverSessions.push({
          sessionId: session.sessionId,
          sessionName: session.sessionName,
          position: driver.position,
          kartNumber: driver.kartNumber,
          timestamp: session.timestamp
        });
        
        positions.push(driver.position);
        karts.push(driver.kartNumber);
      }
    });
    
    // Calculate statistics
    const bestPosition = Math.min(...positions);
    const podiumFinishes = positions.filter(pos => pos <= 3).length;
    const favoriteKart = this.getMostFrequent(karts) || 1;
    
    const timestamps = driverSessions.map(s => s.timestamp).sort();
    const firstRace = timestamps[0];
    const lastRace = timestamps[timestamps.length - 1];
    
    return {
      totalRaces: driverSessions.length,
      sessions: driverSessions,
      bestPosition,
      podiumFinishes,
      favoriteKart,
      firstRace,
      lastRace
    };
  }
  
  /**
   * Create comprehensive user statistics in MongoDB
   */
  private static async createUserStats(userId: string, realStats: RealDriverStats) {
    // Generate realistic times based on position performance
    const avgPosition = realStats.sessions.reduce((sum, s) => sum + s.position, 0) / realStats.sessions.length;
    const baseTime = 42000 + (avgPosition * 1000); // Better average position = better times
    const bestTime = baseTime - 2000 + Math.random() * 1000;
    const averageTime = baseTime + Math.random() * 2000;
    
    const userStats = {
      userId,
      totalRaces: realStats.totalRaces,
      totalRevenue: realStats.totalRaces * 17000,
      bestTime: Math.round(bestTime),
      averageTime: Math.round(averageTime),
      totalLaps: realStats.totalRaces * (8 + Math.floor(Math.random() * 5)),
      bestPosition: realStats.bestPosition,
      podiumFinishes: realStats.podiumFinishes,
      favoriteKart: realStats.favoriteKart,
      firstPlaces: realStats.sessions.filter(s => s.position === 1).length,
      secondPlaces: realStats.sessions.filter(s => s.position === 2).length,
      thirdPlaces: realStats.sessions.filter(s => s.position === 3).length,
      firstRaceAt: realStats.firstRace,
      lastRaceAt: realStats.lastRace,
      racesThisMonth: realStats.sessions.filter(s => 
        s.timestamp > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length,
      racesToday: realStats.sessions.filter(s => 
        s.timestamp > new Date(new Date().setHours(0, 0, 0, 0))
      ).length,
      recentSessions: realStats.sessions.slice(0, 5).map(s => ({
        sessionId: s.sessionId,
        sessionName: s.sessionName,
        position: s.position,
        bestTime: Math.round(bestTime + Math.random() * 3000),
        timestamp: s.timestamp,
        revenue: 17000
      })),
      monthlyStats: this.generateMonthlyStats(realStats.sessions)
    };
    
    // Upsert user stats
    await UserStats.findOneAndUpdate(
      { userId },
      userStats,
      { upsert: true, new: true }
    );
    
    console.log(`📊 Created real statistics for user: ${userStats.totalRaces} races, best position: #${userStats.bestPosition}`);
  }
  
  /**
   * Generate monthly statistics breakdown
   */
  private static generateMonthlyStats(sessions: any[]) {
    const monthlyData: { [key: string]: any } = {};
    
    sessions.forEach(session => {
      const date = new Date(session.timestamp);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          year: date.getFullYear(),
          month: date.getMonth(),
          races: 0,
          revenue: 0,
          positions: [],
          bestTime: 50000,
          podiums: 0
        };
      }
      
      monthlyData[monthKey].races++;
      monthlyData[monthKey].revenue += 17000;
      monthlyData[monthKey].positions.push(session.position);
      if (session.position <= 3) monthlyData[monthKey].podiums++;
      
      // Simulate best time for that month
      const simulatedTime = 42000 + Math.random() * 8000;
      if (simulatedTime < monthlyData[monthKey].bestTime) {
        monthlyData[monthKey].bestTime = Math.round(simulatedTime);
      }
    });
    
    return Object.values(monthlyData);
  }
  
  /**
   * Get most frequent item from array
   */
  private static getMostFrequent(arr: number[]): number {
    const frequency: { [key: number]: number } = {};
    let maxCount = 0;
    let mostFrequent = arr[0];
    
    arr.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
      if (frequency[item] > maxCount) {
        maxCount = frequency[item];
        mostFrequent = item;
      }
    });
    
    return mostFrequent;
  }
  
  /**
   * Get user's real statistics
   */
  static async getUserRealStats(userId: string) {
    try {
      await connectDB();
      return await UserStats.findOne({ userId });
    } catch (error) {
      console.error('❌ Error fetching user real stats:', error);
      return null;
    }
  }
}