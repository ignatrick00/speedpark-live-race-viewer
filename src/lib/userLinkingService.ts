import connectDB from './mongodb';
import WebUser from '@/models/WebUser';
import UserStats from '@/models/UserStats';
import RaceSession from '@/models/RaceSession';

interface SMSTimingDriver {
  name: string;
  position: number;
  kartNumber: number;
  lapCount: number;
  bestTime: number;
  lastTime: number;
  averageTime: number;
  gapToLeader: string;
}

interface SMSTimingData {
  sessionName: string;
  drivers: SMSTimingDriver[];
}

export class UserLinkingService {
  
  /**
   * Main method to process WebSocket data and link users
   */
  static async processRaceData(smsData: SMSTimingData, timestamp: Date) {
    try {
      await connectDB();
      
      // Only process classification sessions (revenue generating)
      if (!smsData.sessionName.includes('Clasificacion')) {
        console.log(`Skipping non-classification session: ${smsData.sessionName}`);
        return;
      }
      
      console.log(`🏁 Processing race session: ${smsData.sessionName}`);
      console.log(`👥 Drivers found: ${smsData.drivers.map(d => d.name).join(', ')}`);
      
      // Create unique session ID
      const sessionId = `session_${timestamp.getTime()}_${smsData.sessionName.replace(/\s/g, '_')}`;
      
      // Check if session already exists (duplicate prevention)
      const existingSession = await RaceSession.findOne({ sessionId });
      if (existingSession) {
        console.log(`⏭️  Session already processed: ${sessionId}`);
        return;
      }
      
      // Create race session record
      const raceSession = await RaceSession.create({
        sessionId,
        sessionName: smsData.sessionName,
        sessionType: 'classification',
        drivers: smsData.drivers,
        revenue: smsData.drivers.length * 17000,
        timestamp,
        processed: false,
        linkedUsers: [],
      });
      
      console.log(`💾 Created race session: ${sessionId} with ${smsData.drivers.length} drivers`);
      
      // Process each driver for potential linking
      for (const driver of smsData.drivers) {
        await this.processDriverLinking(driver, raceSession);
      }
      
      // Mark session as processed
      raceSession.processed = true;
      await raceSession.save();
      
      console.log(`✅ Session processing complete: ${sessionId}`);
      
    } catch (error) {
      console.error('❌ Error processing race data:', error);
      throw error;
    }
  }
  
  /**
   * Process individual driver for potential user linking
   */
  private static async processDriverLinking(driver: SMSTimingDriver, raceSession: any) {
    try {
      const driverName = driver.name.trim();
      console.log(`🔍 Processing driver: ${driverName}`);
      
      // Search for potential matches
      const potentialMatches = await this.findPotentialUserMatches(driverName);
      
      if (potentialMatches.length === 0) {
        console.log(`⚪ No registered users match driver: ${driverName}`);
        
        // Add to session's linkedUsers array as unlinked
        raceSession.linkedUsers.push({
          driverName,
          webUserId: null,
          personId: null,
          linkedAt: null,
        });
        
        return;
      }
      
      // Process matches (prioritize exact matches)
      const bestMatch = this.selectBestMatch(driverName, potentialMatches);
      
      if (bestMatch) {
        await this.linkUserToRace(bestMatch, driver, raceSession);
      } else {
        console.log(`❓ No confident match found for driver: ${driverName}`);
        
        // Add to session as potential match for manual review
        raceSession.linkedUsers.push({
          driverName,
          webUserId: null,
          personId: null,
          linkedAt: null,
        });
      }
      
    } catch (error) {
      console.error(`❌ Error processing driver ${driver.name}:`, error);
    }
  }
  
  /**
   * Find potential user matches for a driver name
   */
  private static async findPotentialUserMatches(driverName: string) {
    const nameParts = driverName.toLowerCase().split(' ');
    
    // Search strategies:
    // 1. Exact full name match
    // 2. First name + Last name combination
    // 3. Alias match
    
    const searchQueries = [
      // Exact full name match
      {
        $or: [
          {
            $expr: {
              $eq: [
                { $toLower: { $concat: ['$profile.firstName', ' ', '$profile.lastName'] } },
                driverName.toLowerCase()
              ]
            }
          },
          {
            $expr: {
              $eq: [
                { $toLower: { $concat: ['$profile.lastName', ' ', '$profile.firstName'] } },
                driverName.toLowerCase()
              ]
            }
          }
        ]
      }
    ];
    
    // Add alias search if user has alias
    if (nameParts.length <= 2) {
      searchQueries.push({
        'profile.alias': { $regex: new RegExp(`^${driverName}$`, 'i') }
      });
    }
    
    // Add partial name matches for compound names
    if (nameParts.length >= 2) {
      searchQueries.push({
        $and: [
          { 'profile.firstName': { $regex: new RegExp(nameParts[0], 'i') } },
          { 'profile.lastName': { $regex: new RegExp(nameParts[nameParts.length - 1], 'i') } }
        ]
      });
    }
    
    const matches = await WebUser.find({
      $or: searchQueries,
      accountStatus: 'active',
      'kartingLink.status': { $in: ['pending_first_race', 'linked'] }
    });
    
    return matches;
  }
  
  /**
   * Select the best match from potential candidates
   */
  private static selectBestMatch(driverName: string, candidates: any[]) {
    if (candidates.length === 1) {
      return candidates[0];
    }
    
    // Scoring system for best match
    const scores = candidates.map(user => {
      let score = 0;
      const fullName = `${user.profile.firstName} ${user.profile.lastName}`.toLowerCase();
      const reverseName = `${user.profile.lastName} ${user.profile.firstName}`.toLowerCase();
      const driverNameLower = driverName.toLowerCase();
      
      // Exact match gets highest score
      if (fullName === driverNameLower || reverseName === driverNameLower) {
        score += 100;
      }
      
      // Alias exact match
      if (user.profile.alias && user.profile.alias.toLowerCase() === driverNameLower) {
        score += 90;
      }
      
      // Partial matches
      const driverParts = driverNameLower.split(' ');
      const userParts = fullName.split(' ');
      
      let matchingParts = 0;
      driverParts.forEach(part => {
        if (userParts.some(userPart => userPart.includes(part))) {
          matchingParts++;
        }
      });
      
      score += (matchingParts / driverParts.length) * 50;
      
      // Prefer users who haven't been linked yet
      if (user.kartingLink.status === 'pending_first_race') {
        score += 10;
      }
      
      return { user, score };
    });
    
    // Sort by score and return best match if confident enough
    scores.sort((a, b) => b.score - a.score);
    
    const bestScore = scores[0];
    
    // Only return match if we're confident (score >= 80)
    if (bestScore.score >= 80) {
      console.log(`🎯 Best match for "${driverName}": ${bestScore.user.profile.firstName} ${bestScore.user.profile.lastName} (score: ${bestScore.score})`);
      return bestScore.user;
    }
    
    console.log(`🤔 No confident match for "${driverName}". Best score: ${bestScore.score}`);
    return null;
  }
  
  /**
   * Link a user to a race result
   */
  private static async linkUserToRace(user: any, driver: SMSTimingDriver, raceSession: any) {
    try {
      console.log(`🔗 Linking user ${user.profile.firstName} ${user.profile.lastName} to race result`);
      
      // Update user's karting link if this is their first race
      if (user.kartingLink.status === 'pending_first_race') {
        // Generate a temporary personId (in real implementation, this would come from Speed Park API)
        const tempPersonId = `temp_${user._id}_${Date.now()}`;
        
        user.kartingLink.personId = tempPersonId;
        user.kartingLink.linkedAt = new Date();
        user.kartingLink.status = 'linked';
        
        await user.save();
        
        console.log(`🎉 First race detected for user ${user.profile.firstName}! Account now linked.`);
      }
      
      // Create or update user stats
      let userStats = await UserStats.findOne({ webUserId: user._id });
      
      if (!userStats) {
        userStats = await UserStats.create({
          webUserId: user._id,
          personId: user.kartingLink.personId,
        });
        console.log(`📊 Created new stats record for user ${user.profile.firstName}`);
      }
      
      // Add race result to user stats
      await userStats.addRaceResult({
        sessionId: raceSession.sessionId,
        sessionName: raceSession.sessionName,
        position: driver.position,
        bestTime: driver.bestTime,
        lapCount: driver.lapCount,
      });
      
      // Add to session's linkedUsers
      raceSession.linkedUsers.push({
        driverName: driver.name,
        webUserId: user._id,
        personId: user.kartingLink.personId,
        linkedAt: new Date(),
      });
      
      console.log(`✅ Successfully linked and updated stats for ${user.profile.firstName} ${user.profile.lastName}`);
      
    } catch (error) {
      console.error(`❌ Error linking user ${user.profile.firstName}:`, error);
      throw error;
    }
  }
  
  /**
   * Manual linking method for admin use
   */
  static async manualLinkUser(webUserId: string, driverName: string, sessionId: string) {
    try {
      await connectDB();
      
      const user = await WebUser.findById(webUserId);
      const session = await RaceSession.findOne({ sessionId });
      
      if (!user || !session) {
        throw new Error('User or session not found');
      }
      
      const driver = session.drivers.find((d: any) => d.name === driverName);
      if (!driver) {
        throw new Error('Driver not found in session');
      }
      
      await this.linkUserToRace(user, driver, session);
      await session.save();
      
      return { success: true, message: 'User manually linked successfully' };
      
    } catch (error) {
      console.error('Manual linking error:', error);
      throw error;
    }
  }
}

export default UserLinkingService;