import mongoose, { Schema, Document } from 'mongoose';

// Interface for tracking driver name/alias history
interface NameHistoryEntry {
  name: string;
  alias?: string;
  firstSeen: Date;
  lastSeen: Date;
  sessionCount: number;
  confidence: 'confirmed' | 'likely' | 'possible';
  source: 'sms_websocket' | 'sms_profile' | 'manual_entry' | 'user_registration';
}

export interface IDriverIdentity extends Document {
  personId?: string; // SMS-Timing PersonID if known
  webUserId?: string; // Our internal user ID  
  primaryName: string; // Most commonly used name
  primaryAlias?: string; // Most commonly used alias
  
  // Name history tracking
  nameHistory: NameHistoryEntry[];
  
  // Statistics
  totalSessions: number;
  firstRaceDate?: Date;
  lastRaceDate?: Date;
  
  // Linking status
  linkingStatus: 'confirmed' | 'probable' | 'unlinked' | 'conflict';
  confidence: number; // 0-100 confidence score
  
  // Manual verification
  manuallyVerified: boolean;
  verifiedBy?: string; // Admin user who verified
  verificationDate?: Date;
  notes?: string;
}

const nameHistorySchema = new Schema({
  name: { type: String, required: true },
  alias: String,
  firstSeen: { type: Date, required: true },
  lastSeen: { type: Date, required: true },
  sessionCount: { type: Number, default: 1 },
  confidence: {
    type: String,
    enum: ['confirmed', 'likely', 'possible'],
    default: 'possible'
  },
  source: {
    type: String,
    enum: ['sms_websocket', 'sms_profile', 'manual_entry', 'user_registration'],
    required: true
  }
}, { _id: false });

const driverIdentitySchema = new Schema<IDriverIdentity>({
  personId: { 
    type: String,
    unique: true,
    sparse: true, // Allows multiple null values
    index: true
  },
  webUserId: { 
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  primaryName: { 
    type: String, 
    required: true,
    index: true
  },
  primaryAlias: String,
  
  nameHistory: [nameHistorySchema],
  
  totalSessions: { 
    type: Number, 
    default: 0 
  },
  firstRaceDate: Date,
  lastRaceDate: Date,
  
  linkingStatus: {
    type: String,
    enum: ['confirmed', 'probable', 'unlinked', 'conflict'],
    default: 'unlinked'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  manuallyVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: String,
  verificationDate: Date,
  notes: String
}, {
  timestamps: true,
  collection: 'driver_identities'
});

// Text search index for name matching
driverIdentitySchema.index({ 
  primaryName: 'text', 
  primaryAlias: 'text',
  'nameHistory.name': 'text',
  'nameHistory.alias': 'text'
});

// Compound indexes
driverIdentitySchema.index({ linkingStatus: 1, confidence: -1 });
driverIdentitySchema.index({ webUserId: 1, personId: 1 });

export default mongoose.models.DriverIdentity || mongoose.model<IDriverIdentity>('DriverIdentity', driverIdentitySchema);