import mongoose, { Schema, Document } from 'mongoose';

export interface IRaceSession extends Document {
  sessionId: string;
  sessionName: string;
  sessionType: 'classification' | 'practice' | 'race' | 'other';
  
  // Timing data
  drivers: Array<{
    name: string;
    position: number;
    kartNumber: number;
    lapCount: number;
    bestTime: number;
    lastTime: number;
    averageTime: number;
    gapToLeader: string;
  }>;
  
  // Financial data
  revenue: number;
  pricePerDriver: number;
  
  // Metadata
  timestamp: Date;
  venue: string;
  source: 'sms_timing' | 'manual' | 'api';
  
  // Processing status
  processed: boolean;
  linkedUsers: Array<{
    driverName: string;
    webUserId?: mongoose.Types.ObjectId;
    personId?: string;
    linkedAt?: Date;
  }>;
  
  createdAt: Date;
  updatedAt: Date;
}

const RaceSessionSchema: Schema = new Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  sessionName: {
    type: String,
    required: true,
  },
  sessionType: {
    type: String,
    enum: ['classification', 'practice', 'race', 'other'],
    default: 'classification',
  },
  
  // Drivers array from SMS-Timing
  drivers: [{
    name: {
      type: String,
      required: true,
    },
    position: {
      type: Number,
      required: true,
    },
    kartNumber: {
      type: Number,
      required: true,
    },
    lapCount: {
      type: Number,
      default: 0,
    },
    bestTime: {
      type: Number, // in milliseconds
      default: 0,
    },
    lastTime: {
      type: Number, // in milliseconds
      default: 0,
    },
    averageTime: {
      type: Number, // in milliseconds
      default: 0,
    },
    gapToLeader: {
      type: String,
      default: '0.000',
    },
  }],
  
  // Financial data
  revenue: {
    type: Number,
    default: 0,
  },
  pricePerDriver: {
    type: Number,
    default: 17000, // CLP
  },
  
  // Metadata
  timestamp: {
    type: Date,
    required: true,
  },
  venue: {
    type: String,
    default: 'Speed Park',
  },
  source: {
    type: String,
    enum: ['sms_timing', 'manual', 'api'],
    default: 'sms_timing',
  },
  
  // Processing status
  processed: {
    type: Boolean,
    default: false,
  },
  linkedUsers: [{
    driverName: {
      type: String,
      required: true,
    },
    webUserId: {
      type: Schema.Types.ObjectId,
      ref: 'WebUser',
      default: null,
    },
    personId: {
      type: String,
      default: null,
    },
    linkedAt: {
      type: Date,
      default: null,
    },
  }],
}, {
  timestamps: true,
});

// Indexes for performance
RaceSessionSchema.index({ sessionId: 1 });
RaceSessionSchema.index({ timestamp: -1 });
RaceSessionSchema.index({ sessionType: 1 });
RaceSessionSchema.index({ 'drivers.name': 1 });
RaceSessionSchema.index({ 'linkedUsers.driverName': 1 });
RaceSessionSchema.index({ 'linkedUsers.webUserId': 1 });

// Virtual for driver count
RaceSessionSchema.virtual('driverCount').get(function(this: IRaceSession) {
  return this.drivers.length;
});

// Method to calculate revenue
RaceSessionSchema.methods.calculateRevenue = function(this: IRaceSession) {
  if (this.sessionType === 'classification') {
    this.revenue = this.drivers.length * this.pricePerDriver;
  } else {
    this.revenue = 0;
  }
  return this.revenue;
};

// Method to get unique driver names
RaceSessionSchema.methods.getDriverNames = function(this: IRaceSession) {
  return this.drivers.map((driver: any) => driver.name);
};

const RaceSession = mongoose.models.RaceSession || mongoose.model<IRaceSession>('RaceSession', RaceSessionSchema);

export default RaceSession;