import mongoose, { Schema, Document } from 'mongoose';

export interface IUserStats extends Document {
  webUserId: mongoose.Types.ObjectId;
  personId: string; // From Speed Park API
  
  // Basic stats
  totalRaces: number;
  totalRevenue: number; // How much this user has spent
  
  // Performance stats
  bestTime: number; // in milliseconds
  averageTime: number; // in milliseconds
  totalLaps: number;
  
  // Achievements
  firstPlaces: number;
  secondPlaces: number;
  thirdPlaces: number;
  podiumFinishes: number;
  
  // Activity tracking
  firstRaceAt: Date;
  lastRaceAt: Date;
  racesThisMonth: number;
  racesToday: number;
  
  // Speed Park profile data
  speedParkData: {
    alias?: string;
    memberSince?: Date;
    deposits?: Array<{
      amount: number;
      id: string;
      name: string;
      depositKind: number;
    }>;
    memberships?: Array<{
      name: string;
      expires: Date;
    }>;
  };
  
  // Recent sessions
  recentSessions: Array<{
    sessionId: string;
    sessionName: string;
    position: number;
    bestTime: number;
    timestamp: Date;
    revenue: number;
  }>;
  
  // Monthly breakdown
  monthlyStats: Array<{
    year: number;
    month: number;
    races: number;
    revenue: number;
    bestTime: number;
    podiums: number;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

const UserStatsSchema: Schema = new Schema({
  webUserId: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
    unique: true,
  },
  personId: {
    type: String,
    required: true,
  },
  
  // Basic stats
  totalRaces: {
    type: Number,
    default: 0,
  },
  totalRevenue: {
    type: Number,
    default: 0,
  },
  
  // Performance stats
  bestTime: {
    type: Number,
    default: 0,
  },
  averageTime: {
    type: Number,
    default: 0,
  },
  totalLaps: {
    type: Number,
    default: 0,
  },
  
  // Achievements
  firstPlaces: {
    type: Number,
    default: 0,
  },
  secondPlaces: {
    type: Number,
    default: 0,
  },
  thirdPlaces: {
    type: Number,
    default: 0,
  },
  podiumFinishes: {
    type: Number,
    default: 0,
  },
  
  // Activity tracking
  firstRaceAt: {
    type: Date,
    default: null,
  },
  lastRaceAt: {
    type: Date,
    default: null,
  },
  racesThisMonth: {
    type: Number,
    default: 0,
  },
  racesToday: {
    type: Number,
    default: 0,
  },
  
  // Speed Park profile data
  speedParkData: {
    alias: {
      type: String,
      default: null,
    },
    memberSince: {
      type: Date,
      default: null,
    },
    deposits: [{
      amount: Number,
      id: String,
      name: String,
      depositKind: Number,
    }],
    memberships: [{
      name: String,
      expires: Date,
    }],
  },
  
  // Recent sessions (last 10)
  recentSessions: [{
    sessionId: {
      type: String,
      required: true,
    },
    sessionName: {
      type: String,
      required: true,
    },
    position: {
      type: Number,
      required: true,
    },
    bestTime: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    revenue: {
      type: Number,
      default: 17000,
    },
  }],
  
  // Monthly breakdown
  monthlyStats: [{
    year: {
      type: Number,
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    races: {
      type: Number,
      default: 0,
    },
    revenue: {
      type: Number,
      default: 0,
    },
    bestTime: {
      type: Number,
      default: 0,
    },
    podiums: {
      type: Number,
      default: 0,
    },
  }],
}, {
  timestamps: true,
});

// Indexes for performance
UserStatsSchema.index({ webUserId: 1 });
UserStatsSchema.index({ personId: 1 });
UserStatsSchema.index({ totalRaces: -1 });
UserStatsSchema.index({ bestTime: 1 });
UserStatsSchema.index({ lastRaceAt: -1 });

// Virtual for podium percentage
UserStatsSchema.virtual('podiumPercentage').get(function(this: IUserStats) {
  if (this.totalRaces === 0) return 0;
  return Math.round((this.podiumFinishes / this.totalRaces) * 100);
});

// Method to add a new race result
UserStatsSchema.methods.addRaceResult = function(this: IUserStats, sessionData: any) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  // Update basic stats
  this.totalRaces += 1;
  this.totalRevenue += 17000; // Standard race price
  this.lastRaceAt = now;
  
  if (!this.firstRaceAt) {
    this.firstRaceAt = now;
  }
  
  // Update performance stats
  if (sessionData.bestTime > 0) {
    if (this.bestTime === 0 || sessionData.bestTime < this.bestTime) {
      this.bestTime = sessionData.bestTime;
    }
    
    // Update average time (simple running average)
    this.averageTime = ((this.averageTime * (this.totalRaces - 1)) + sessionData.bestTime) / this.totalRaces;
  }
  
  this.totalLaps += sessionData.lapCount || 0;
  
  // Update achievements based on position
  if (sessionData.position === 1) this.firstPlaces += 1;
  else if (sessionData.position === 2) this.secondPlaces += 1;
  else if (sessionData.position === 3) this.thirdPlaces += 1;
  
  if (sessionData.position <= 3) {
    this.podiumFinishes += 1;
  }
  
  // Add to recent sessions (keep last 10)
  this.recentSessions.unshift({
    sessionId: sessionData.sessionId,
    sessionName: sessionData.sessionName,
    position: sessionData.position,
    bestTime: sessionData.bestTime,
    timestamp: now,
    revenue: 17000,
  });
  
  if (this.recentSessions.length > 10) {
    this.recentSessions = this.recentSessions.slice(0, 10);
  }
  
  // Update monthly stats
  let monthlyRecord = this.monthlyStats.find(m => m.year === currentYear && m.month === currentMonth);
  if (!monthlyRecord) {
    monthlyRecord = {
      year: currentYear,
      month: currentMonth,
      races: 0,
      revenue: 0,
      bestTime: 0,
      podiums: 0,
    };
    this.monthlyStats.push(monthlyRecord);
  }
  
  monthlyRecord.races += 1;
  monthlyRecord.revenue += 17000;
  if (sessionData.position <= 3) {
    monthlyRecord.podiums += 1;
  }
  if (sessionData.bestTime > 0 && (monthlyRecord.bestTime === 0 || sessionData.bestTime < monthlyRecord.bestTime)) {
    monthlyRecord.bestTime = sessionData.bestTime;
  }
  
  return this.save();
};

const UserStats = mongoose.models.UserStats || mongoose.model<IUserStats>('UserStats', UserStatsSchema);

export default UserStats;