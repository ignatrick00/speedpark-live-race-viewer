import mongoose, { Schema, Document } from 'mongoose';

// Interface for individual lap within a session
export interface ILap {
  lapNumber: number;
  time: number; // Lap time in milliseconds
  position: number; // Position at the end of this lap
  kartNumber?: number; // Kart used for this lap
  timestamp: Date; // When this lap was completed
  gapToLeader?: string; // Gap to leader at end of lap
  isPersonalBest?: boolean; // If this was driver's best lap in session
}

// Interface for a racing session
export interface IRaceSession {
  sessionId: string; // Unique identifier for the session
  sessionName: string; // Display name (e.g., "[HEAT] 60 - Carrera")
  sessionDate: Date; // Date of the session
  bestTime: number; // Best lap time in the session (milliseconds)
  lastTime: number; // Last recorded lap time
  averageTime: number; // Average lap time for the session
  bestPosition: number; // Best position achieved in session
  finalPosition?: number; // Final position at end of session
  totalLaps: number; // Total laps completed
  kartNumber?: number; // Primary kart used in session
  
  // Array of individual lap data - VUELTA POR VUELTA
  laps: ILap[];
  
  // Session metadata
  processed: boolean; // If session data is complete
  revenue?: number; // Revenue generated ($17,000 for clasificación)
  sessionType: 'clasificacion' | 'carrera' | 'practica' | 'otro';
}

// Main driver race data document
export interface IDriverRaceData extends Document {
  // Driver identification - EXACT MATCHING
  driverName: string; // Name from SMS-Timing (e.g., "Manu", "Diego SpeedPark")
  firstName?: string; // Parsed first name
  lastName?: string; // Parsed last name  
  alias?: string; // Driver's alias/nickname
  
  // Linking to our user system
  webUserId?: string; // Linked to our webusers collection
  personId?: string; // SMS-Timing Profile API ID
  linkingStatus: 'unlinked' | 'pending' | 'linked' | 'manual';
  linkingMethod: 'exact_match' | 'alias_match' | 'manual_link' | 'person_id';
  linkingConfidence: 'high' | 'medium' | 'low';
  
  // All racing sessions for this driver
  sessions: IRaceSession[];
  
  // Aggregate statistics (calculated from sessions)
  stats: {
    totalRaces: number;
    totalLaps: number;
    totalSpent: number; // Based on clasificación sessions
    allTimeBestLap: number; // Best lap across all sessions
    averageLapTime: number; // Average across all laps
    bestPosition: number; // Best position across all sessions
    podiumFinishes: number; // Positions 1, 2, 3
    firstRaceDate?: Date;
    lastRaceDate?: Date;
  };
}

// Lap schema
const lapSchema = new Schema<ILap>({
  lapNumber: { type: Number, required: true },
  time: { type: Number, required: true }, // Milliseconds
  position: { type: Number, required: true },
  kartNumber: Number,
  timestamp: { type: Date, required: true },
  gapToLeader: String,
  isPersonalBest: Boolean
}, { _id: false });

// Session schema  
const raceSessionSchema = new Schema<IRaceSession>({
  sessionId: { type: String, required: true },
  sessionName: { type: String, required: true },
  sessionDate: { type: Date, required: true },
  bestTime: { type: Number, required: true },
  lastTime: { type: Number, required: true },
  averageTime: { type: Number, default: 0 },
  bestPosition: { type: Number, required: true },
  finalPosition: Number,
  totalLaps: { type: Number, required: true },
  kartNumber: Number,
  
  // Array of laps - VUELTA POR VUELTA DATA
  laps: [lapSchema],
  
  processed: { type: Boolean, default: false },
  revenue: Number,
  sessionType: {
    type: String,
    enum: ['clasificacion', 'carrera', 'practica', 'otro'],
    default: 'clasificacion'
  }
}, { _id: false });

// Main schema
const driverRaceDataSchema = new Schema<IDriverRaceData>({
  // Driver identity
  driverName: { 
    type: String, 
    required: true,
    index: true 
  },
  firstName: String,
  lastName: String,
  alias: String,
  
  // Linking information
  webUserId: { 
    type: String,
    index: true 
  },
  personId: { 
    type: String,
    index: true 
  },
  linkingStatus: {
    type: String,
    enum: ['unlinked', 'pending', 'linked', 'manual'],
    default: 'unlinked'
  },
  linkingMethod: {
    type: String,
    enum: ['exact_match', 'alias_match', 'manual_link', 'person_id'],
    default: 'exact_match'
  },
  linkingConfidence: {
    type: String,
    enum: ['high', 'medium', 'low'],
    default: 'low'
  },
  
  // All sessions for this driver
  sessions: [raceSessionSchema],
  
  // Aggregate statistics
  stats: {
    totalRaces: { type: Number, default: 0 },
    totalLaps: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    allTimeBestLap: { type: Number, default: 0 },
    averageLapTime: { type: Number, default: 0 },
    bestPosition: { type: Number, default: 999 },
    podiumFinishes: { type: Number, default: 0 },
    firstRaceDate: Date,
    lastRaceDate: Date
  }
}, {
  timestamps: true,
  collection: 'driver_race_data'
});

// Compound indexes for efficient queries
driverRaceDataSchema.index({ driverName: 1 });
driverRaceDataSchema.index({ webUserId: 1 });
driverRaceDataSchema.index({ 'sessions.sessionId': 1 });
driverRaceDataSchema.index({ linkingStatus: 1 });

// Add unique constraint on driver names (case insensitive)
driverRaceDataSchema.index({ driverName: 1 }, { unique: true });

// Methods to calculate aggregate stats
driverRaceDataSchema.methods.recalculateStats = function() {
  const sessions = this.sessions;
  
  if (sessions.length === 0) {
    return;
  }
  
  // Calculate totals
  this.stats.totalRaces = sessions.length;
  this.stats.totalLaps = sessions.reduce((sum: number, s: any) => sum + s.totalLaps, 0);
  
  // Revenue calculation (only clasificación sessions)
  const clasificacionSessions = sessions.filter((s: any) => s.sessionType === 'clasificacion');
  this.stats.totalSpent = clasificacionSessions.length * 17000;
  
  // Best times and positions
  const allTimes = sessions.map((s: any) => s.bestTime).filter((t: number) => t > 0);
  this.stats.allTimeBestLap = allTimes.length > 0 ? Math.min(...allTimes) : 0;
  
  const allPositions = sessions.map((s: any) => s.bestPosition).filter((p: number) => p > 0);
  this.stats.bestPosition = allPositions.length > 0 ? Math.min(...allPositions) : 999;
  
  // Average lap time across all laps in all sessions
  let totalLapTimes = 0;
  let totalLapsWithTimes = 0;
  
  sessions.forEach((session: any) => {
    session.laps.forEach((lap: any) => {
      if (lap.time > 0) {
        totalLapTimes += lap.time;
        totalLapsWithTimes++;
      }
    });
  });
  
  this.stats.averageLapTime = totalLapsWithTimes > 0 ? totalLapTimes / totalLapsWithTimes : 0;
  
  // Podium finishes (final positions 1, 2, 3)
  this.stats.podiumFinishes = sessions.filter((s: any) => 
    s.finalPosition && s.finalPosition <= 3
  ).length;
  
  // Date range
  const dates = sessions.map((s: any) => s.sessionDate).sort((a: any, b: any) => a.getTime() - b.getTime());
  this.stats.firstRaceDate = dates[0];
  this.stats.lastRaceDate = dates[dates.length - 1];
};

export default mongoose.models.DriverRaceData || mongoose.model<IDriverRaceData>('DriverRaceData', driverRaceDataSchema);