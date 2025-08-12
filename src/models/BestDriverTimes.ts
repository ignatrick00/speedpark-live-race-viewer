import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBestDriverTime extends Document {
  position: number;
  driverName: string;
  bestTime: number; // in milliseconds
  kartNumber: number;
  sessionId: string;
  sessionName: string;
  sessionDate: Date;
  sessionTime: string; // HH:MM format
  
  // Metadata
  lastUpdated: Date;
  
  // Methods
  updateRecord(newTime: number, kartNumber: number, sessionId: string, sessionName: string, sessionDate: Date, sessionTime: string): void;
  getFormattedTime(): string;
}

export interface IBestDriverTimeModel extends Model<IBestDriverTime> {
  // No custom methods - using standard Mongoose operations
}

const BestDriverTimeSchema: Schema = new Schema({
  position: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  driverName: {
    type: String,
    required: true,
    unique: true, // Only one record per driver
    trim: true
  },
  bestTime: {
    type: Number,
    required: true,
    min: 1 // Must be > 0
  },
  kartNumber: {
    type: Number,
    required: true,
    min: 1
  },
  sessionId: {
    type: String,
    required: true
  },
  sessionName: {
    type: String,
    required: true
  },
  sessionDate: {
    type: Date,
    required: true
  },
  sessionTime: {
    type: String,
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'best_driver_times'
});

// Indexes for performance
BestDriverTimeSchema.index({ position: 1 });
BestDriverTimeSchema.index({ driverName: 1 }, { unique: true });
BestDriverTimeSchema.index({ bestTime: 1 });

// Method to update record with new best time
BestDriverTimeSchema.methods.updateRecord = function(
  this: IBestDriverTime, 
  newTime: number, 
  kartNumber: number, 
  sessionId: string, 
  sessionName: string, 
  sessionDate: Date, 
  sessionTime: string
) {
  this.bestTime = newTime;
  this.kartNumber = kartNumber;
  this.sessionId = sessionId;
  this.sessionName = sessionName;
  this.sessionDate = sessionDate;
  this.sessionTime = sessionTime;
  this.lastUpdated = new Date();
};

// Method to get formatted time (mm:ss.sss)
BestDriverTimeSchema.methods.getFormattedTime = function(this: IBestDriverTime) {
  const minutes = Math.floor(this.bestTime / 60000);
  const seconds = Math.floor((this.bestTime % 60000) / 1000);
  const milliseconds = this.bestTime % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

// No static methods - using direct MongoDB operations in services

const BestDriverTime = mongoose.models.BestDriverTime || mongoose.model<IBestDriverTime, IBestDriverTimeModel>('BestDriverTime', BestDriverTimeSchema);

export default BestDriverTime;