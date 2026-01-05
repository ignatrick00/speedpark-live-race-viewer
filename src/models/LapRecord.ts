import mongoose, { Schema, Document } from 'mongoose';

// Interface for individual lap record
export interface ILapRecord extends Document {
  sessionId: string;
  sessionName: string;
  timestamp: Date;
  lapNumber: number;
  driverName: string;
  personId?: string; // From SMS-Timing Profile API
  webUserId?: string; // Our internal user ID
  
  // Real SMS-Timing data fields
  position: number; // P field
  kartNumber: number; // K field
  lapCount: number; // L field  
  bestTime: number; // B field - best lap time in ms
  lastTime: number; // T field - current lap time in ms
  averageTime: number; // A field - average lap time
  gapToLeader: string; // G field - gap to race leader
  
  // Additional calculated data
  positionChange?: number; // Change from previous lap
  lapTimeImprovement?: number; // Improvement from previous lap
  isPersonalBest?: boolean; // If this lap was driver's best

  // Validation fields
  isValid: boolean; // Si el tiempo es válido para rankings
  invalidReason?: 'below_minimum' | 'above_maximum' | 'wrong_session_type' | 'manual_deletion' | 'other';
  validatedAt?: Date; // Cuándo se validó

  // Raw SMS data for full traceability
  rawSMSData: any;

  // Linking confidence
  linkingConfidence: 'high' | 'medium' | 'low' | 'manual';
  linkingMethod: 'exact_match' | 'alias_match' | 'manual_link' | 'person_id';
}

const lapRecordSchema = new Schema<ILapRecord>({
  sessionId: { 
    type: String, 
    required: true,
    index: true 
  },
  sessionName: { 
    type: String, 
    required: true 
  },
  timestamp: { 
    type: Date, 
    required: true,
    index: true 
  },
  lapNumber: { 
    type: Number, 
    required: true 
  },
  driverName: { 
    type: String, 
    required: true,
    index: true 
  },
  personId: { 
    type: String,
    index: true 
  },
  webUserId: { 
    type: String,
    index: true 
  },
  
  // SMS-Timing real data
  position: { 
    type: Number, 
    required: true 
  },
  kartNumber: { 
    type: Number, 
    required: true 
  },
  lapCount: { 
    type: Number, 
    default: 0 
  },
  bestTime: { 
    type: Number, 
    default: 0 
  },
  lastTime: { 
    type: Number, 
    default: 0 
  },
  averageTime: { 
    type: Number, 
    default: 0 
  },
  gapToLeader: { 
    type: String, 
    default: '0.000' 
  },
  
  // Calculated performance data
  positionChange: Number,
  lapTimeImprovement: Number,
  isPersonalBest: Boolean,

  // Validation fields
  isValid: {
    type: Boolean,
    default: true,
    index: true
  },
  invalidReason: {
    type: String,
    enum: ['below_minimum', 'above_maximum', 'wrong_session_type', 'manual_deletion', 'other']
  },
  validatedAt: Date,

  // Raw and linking data
  rawSMSData: {
    type: Schema.Types.Mixed,
    required: true
  },
  linkingConfidence: {
    type: String,
    enum: ['high', 'medium', 'low', 'manual'],
    default: 'low'
  },
  linkingMethod: {
    type: String,
    enum: ['exact_match', 'alias_match', 'manual_link', 'person_id'],
    required: true
  }
}, {
  timestamps: true,
  collection: 'lap_records'
});

// Compound indexes for efficient queries
lapRecordSchema.index({ sessionId: 1, driverName: 1, lapNumber: 1 });
lapRecordSchema.index({ webUserId: 1, timestamp: -1 });
lapRecordSchema.index({ personId: 1, timestamp: -1 });
lapRecordSchema.index({ isValid: 1, bestTime: 1 }); // Para rankings optimizados

export default mongoose.models.LapRecord || mongoose.model<ILapRecord>('LapRecord', lapRecordSchema);