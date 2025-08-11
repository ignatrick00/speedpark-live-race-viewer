import connectDB from './mongodb';
import DriverIdentity, { IDriverIdentity } from '@/models/DriverIdentity';
import WebUser from '@/models/WebUser';

interface LinkingResult {
  webUserId?: string;
  personId?: string;
  confidence: 'high' | 'medium' | 'low';
  method: 'exact_match' | 'alias_match' | 'manual_link' | 'person_id';
  driverIdentityId?: string;
}

export class DriverIdentityService {
  
  /**
   * Main function to link a driver name to our system
   */
  static async linkDriver(
    driverName: string, 
    sessionTimestamp: Date,
    personId?: string
  ): Promise<LinkingResult> {
    try {
      await connectDB();
      
      console.log(`🔗 Linking driver: "${driverName}" ${personId ? `(PersonID: ${personId})` : ''}`);
      
      // 1. If we have PersonID, try exact PersonID match first
      if (personId) {
        const personIdResult = await this.linkByPersonId(personId, driverName, sessionTimestamp);
        if (personIdResult.confidence === 'high') {
          return personIdResult;
        }
      }
      
      // 2. Try exact name match with existing web users
      const exactMatchResult = await this.linkByExactName(driverName, sessionTimestamp);
      if (exactMatchResult.confidence === 'high') {
        return exactMatchResult;
      }
      
      // 3. Try alias/fuzzy matching
      const aliasMatchResult = await this.linkByAlias(driverName, sessionTimestamp);
      if (aliasMatchResult.confidence !== 'low') {
        return aliasMatchResult;
      }
      
      // 4. Create or update driver identity record
      const identityResult = await this.createOrUpdateDriverIdentity(
        driverName, 
        sessionTimestamp, 
        personId
      );
      
      return {
        confidence: 'low',
        method: 'exact_match',
        driverIdentityId: identityResult._id ? identityResult._id.toString() : undefined,
        personId: personId || undefined
      };
      
    } catch (error) {
      console.error('❌ Error linking driver:', error);
      return {
        confidence: 'low',
        method: 'exact_match'
      };
    }
  }
  
  /**
   * Link by PersonID (highest confidence)
   */
  private static async linkByPersonId(
    personId: string, 
    driverName: string, 
    timestamp: Date
  ): Promise<LinkingResult> {
    
    // Check if we have this PersonID in our driver identities
    let driverIdentity = await DriverIdentity.findOne({ personId });
    
    if (driverIdentity) {
      console.log(`✅ Found existing PersonID: ${personId} -> ${driverIdentity.primaryName}`);
      
      // Update name history if this is a new name
      await this.updateNameHistory(driverIdentity, driverName, timestamp, 'sms_websocket');
      
      return {
        webUserId: driverIdentity.webUserId || undefined,
        personId: driverIdentity.personId || undefined,
        confidence: 'high',
        method: 'person_id',
        driverIdentityId: driverIdentity._id.toString()
      };
    }
    
    // Check if we have a web user with this PersonID in profile
    const webUser = await WebUser.findOne({ 
      $or: [
        { 'smsProfile.personId': personId },
        { personId: personId }
      ]
    });
    
    if (webUser) {
      console.log(`✅ Found web user with PersonID: ${personId} -> ${webUser.email}`);
      
      // Create driver identity linking web user to PersonID
      driverIdentity = await DriverIdentity.create({
        personId,
        webUserId: webUser._id.toString(),
        primaryName: driverName,
        nameHistory: [{
          name: driverName,
          firstSeen: timestamp,
          lastSeen: timestamp,
          sessionCount: 1,
          confidence: 'confirmed',
          source: 'sms_websocket'
        }],
        totalSessions: 1,
        firstRaceDate: timestamp,
        lastRaceDate: timestamp,
        linkingStatus: 'confirmed',
        confidence: 95
      });
      
      return {
        webUserId: webUser._id.toString(),
        personId,
        confidence: 'high',
        method: 'person_id',
        driverIdentityId: driverIdentity._id.toString()
      };
    }
    
    return { confidence: 'low', method: 'person_id' };
  }
  
  /**
   * Link by exact name match
   */
  private static async linkByExactName(
    driverName: string, 
    timestamp: Date
  ): Promise<LinkingResult> {
    
    // BÚSQUEDA EXACTA: Debe coincidir nombre + apellido + alias para mostrar estadísticas
    const driverParts = driverName.trim().split(' ');
    const firstName = driverParts[0];
    const lastName = driverParts.length > 1 ? driverParts.slice(1).join(' ') : '';
    
    console.log(`🔍 Búsqueda EXACTA para: "${driverName}" → Nombre: "${firstName}", Apellido: "${lastName}"`);
    
    // Buscar usuario que coincida EXACTAMENTE en los 3 campos
    const webUser = await WebUser.findOne({
      $and: [
        // 1. NOMBRE debe coincidir exactamente
        { 'profile.firstName': { $regex: new RegExp(`^${firstName}$`, 'i') } },
        
        // 2. APELLIDO debe coincidir exactamente (si existe en driverName)
        ...(lastName ? [
          { 'profile.lastName': { $regex: new RegExp(`^${lastName}$`, 'i') } }
        ] : [
          // Si no hay apellido en driverName, el usuario tampoco debería tener apellido significativo
          { $or: [
            { 'profile.lastName': { $exists: false } },
            { 'profile.lastName': '' },
            { 'profile.lastName': null }
          ]}
        ]),
        
        // 3. ALIAS debe coincidir con alguna parte del driverName O ser similar
        { $or: [
          // Alias coincide con el nombre completo
          { 'profile.alias': { $regex: new RegExp(`^${driverName}$`, 'i') } },
          // Alias coincide con el primer nombre
          { 'profile.alias': { $regex: new RegExp(`^${firstName}$`, 'i') } },
          // Alias coincide con el apellido (si existe)
          ...(lastName ? [
            { 'profile.alias': { $regex: new RegExp(`^${lastName}$`, 'i') } }
          ] : []),
          // Si no hay alias definido, acepta usuarios sin alias
          { $or: [
            { 'profile.alias': { $exists: false } },
            { 'profile.alias': '' },
            { 'profile.alias': null }
          ]}
        ]}
      ]
    });
    
    if (webUser) {
      console.log(`✅ COINCIDENCIA EXACTA encontrada:`);
      console.log(`   SMS-Timing: "${driverName}"`);
      console.log(`   Usuario: "${webUser.profile.firstName}" "${webUser.profile.lastName}" (${webUser.profile.alias || 'sin alias'})`);
      console.log(`   Email: ${webUser.email}`);
      
      // Find or create driver identity
      let driverIdentity = await DriverIdentity.findOne({ webUserId: webUser._id.toString() });
      
      if (!driverIdentity) {
        driverIdentity = await DriverIdentity.create({
          webUserId: webUser._id.toString(),
          personId: webUser.kartingLink?.personId,
          primaryName: driverName,
          nameHistory: [{
            name: driverName,
            firstSeen: timestamp,
            lastSeen: timestamp,
            sessionCount: 1,
            confidence: 'confirmed',
            source: 'sms_websocket'
          }],
          totalSessions: 1,
          firstRaceDate: timestamp,
          lastRaceDate: timestamp,
          linkingStatus: 'confirmed',
          confidence: 90
        });
      } else {
        await this.updateNameHistory(driverIdentity, driverName, timestamp, 'sms_websocket');
      }
      
      return {
        webUserId: webUser._id.toString(),
        personId: webUser.kartingLink?.personId,
        confidence: 'high',
        method: 'exact_match',
        driverIdentityId: driverIdentity._id.toString()
      };
    }
    
    console.log(`❌ NO se encontró coincidencia EXACTA para: "${driverName}"`);
    console.log(`   Debe coincidir: Nombre="${firstName}", Apellido="${lastName}", Alias=similar`);
    return { confidence: 'low', method: 'exact_match' };
  }
  
  /**
   * Link by alias/fuzzy matching
   */
  private static async linkByAlias(
    driverName: string, 
    timestamp: Date
  ): Promise<LinkingResult> {
    
    // Search in driver identities using text search
    const identityMatches = await DriverIdentity.find({
      $text: { $search: driverName }
    }, {
      score: { $meta: 'textScore' }
    }).sort({ score: { $meta: 'textScore' } }).limit(3);
    
    if (identityMatches.length > 0) {
      const bestMatch = identityMatches[0];
      console.log(`🔍 Alias match found: ${driverName} -> ${bestMatch.primaryName} (score: ${bestMatch.score})`);
      
      await this.updateNameHistory(bestMatch, driverName, timestamp, 'sms_websocket');
      
      return {
        webUserId: bestMatch.webUserId || undefined,
        personId: bestMatch.personId || undefined,
        confidence: 'medium',
        method: 'alias_match',
        driverIdentityId: bestMatch._id.toString()
      };
    }
    
    return { confidence: 'low', method: 'alias_match' };
  }
  
  /**
   * Create or update driver identity record
   */
  private static async createOrUpdateDriverIdentity(
    driverName: string,
    timestamp: Date,
    personId?: string
  ): Promise<IDriverIdentity> {
    
    // Try to find existing identity by name
    let driverIdentity = await DriverIdentity.findOne({
      $or: [
        { primaryName: { $regex: new RegExp(`^${driverName}$`, 'i') } },
        { 'nameHistory.name': { $regex: new RegExp(`^${driverName}$`, 'i') } }
      ]
    });
    
    if (driverIdentity) {
      // Update existing
      await this.updateNameHistory(driverIdentity, driverName, timestamp, 'sms_websocket');
      
      if (personId && !driverIdentity.personId) {
        driverIdentity.personId = personId;
        driverIdentity.confidence = Math.min(driverIdentity.confidence + 10, 80);
        await driverIdentity.save();
      }
      
      return driverIdentity;
    }
    
    // Create new identity
    driverIdentity = await DriverIdentity.create({
      personId,
      primaryName: driverName,
      nameHistory: [{
        name: driverName,
        firstSeen: timestamp,
        lastSeen: timestamp,
        sessionCount: 1,
        confidence: 'possible',
        source: 'sms_websocket'
      }],
      totalSessions: 1,
      firstRaceDate: timestamp,
      lastRaceDate: timestamp,
      linkingStatus: 'unlinked',
      confidence: personId ? 50 : 20
    });
    
    console.log(`✨ Created new driver identity: ${driverName} ${personId ? `(PersonID: ${personId})` : ''}`);
    return driverIdentity;
  }
  
  /**
   * Update name history for a driver identity
   */
  private static async updateNameHistory(
    driverIdentity: IDriverIdentity,
    driverName: string,
    timestamp: Date,
    source: 'sms_websocket' | 'sms_profile' | 'manual_entry' | 'user_registration'
  ): Promise<void> {
    
    // Find existing name in history
    const existingName = driverIdentity.nameHistory.find(
      h => h.name.toLowerCase() === driverName.toLowerCase()
    );
    
    if (existingName) {
      // Update existing
      existingName.lastSeen = timestamp;
      existingName.sessionCount += 1;
    } else {
      // Add new name to history
      driverIdentity.nameHistory.push({
        name: driverName,
        firstSeen: timestamp,
        lastSeen: timestamp,
        sessionCount: 1,
        confidence: 'possible',
        source
      });
    }
    
    driverIdentity.totalSessions += 1;
    driverIdentity.lastRaceDate = timestamp;
    
    await driverIdentity.save();
  }
  
  /**
   * Get driver statistics for dashboard
   */
  static async getDriverStats(webUserId: string) {
    try {
      await connectDB();
      
      const driverIdentity = await DriverIdentity.findOne({ webUserId });
      
      if (!driverIdentity) {
        return {
          totalSessions: 0,
          firstRace: null,
          lastRace: null,
          namesUsed: [],
          linkingStatus: 'unlinked'
        };
      }
      
      return {
        totalSessions: driverIdentity.totalSessions,
        firstRace: driverIdentity.firstRaceDate,
        lastRace: driverIdentity.lastRaceDate,
        namesUsed: driverIdentity.nameHistory.map((h: any) => h.name),
        linkingStatus: driverIdentity.linkingStatus,
        confidence: driverIdentity.confidence,
        personId: driverIdentity.personId
      };
      
    } catch (error) {
      console.error('❌ Error getting driver stats:', error);
      return null;
    }
  }
  
  /**
   * Manual linking by admin
   */
  static async manualLinkDriver(
    driverName: string,
    webUserId: string,
    personId?: string,
    adminUserId?: string
  ) {
    try {
      await connectDB();
      
      const user = await WebUser.findById(webUserId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Find or create driver identity
      let driverIdentity = await DriverIdentity.findOne({
        $or: [
          { webUserId },
          { primaryName: { $regex: new RegExp(`^${driverName}$`, 'i') } }
        ]
      });
      
      if (driverIdentity) {
        // Update existing
        driverIdentity.webUserId = webUserId;
        driverIdentity.personId = personId || driverIdentity.personId;
        driverIdentity.linkingStatus = 'confirmed';
        driverIdentity.confidence = 100;
        driverIdentity.manuallyVerified = true;
        driverIdentity.verifiedBy = adminUserId;
        driverIdentity.verificationDate = new Date();
      } else {
        // Create new
        driverIdentity = await DriverIdentity.create({
          webUserId,
          personId,
          primaryName: driverName,
          nameHistory: [{
            name: driverName,
            firstSeen: new Date(),
            lastSeen: new Date(),
            sessionCount: 0,
            confidence: 'confirmed',
            source: 'manual_entry'
          }],
          linkingStatus: 'confirmed',
          confidence: 100,
          manuallyVerified: true,
          verifiedBy: adminUserId,
          verificationDate: new Date()
        });
      }
      
      await driverIdentity.save();
      
      console.log(`✅ Manual link created: ${driverName} -> ${user.email}`);
      return driverIdentity;
      
    } catch (error) {
      console.error('❌ Error in manual linking:', error);
      throw error;
    }
  }
}

export default DriverIdentityService;