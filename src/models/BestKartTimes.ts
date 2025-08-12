import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBestKartTime extends Document {
  position: number;
  kartNumber: number;
  bestTime: number; // in milliseconds
  driverName: string;
  sessionId: string;
  sessionName: string;
  sessionDate: Date;
  sessionTime: string; // HH:MM format
  
  // Metadata
  lastUpdated: Date;
  
  // Methods
  updateRecord(newTime: number, driverName: string, sessionId: string, sessionName: string, sessionDate: Date, sessionTime: string): void;
  getFormattedTime(): string;
}

export interface IBestKartTimeModel extends Model<IBestKartTime> {
  // No custom methods - using standard Mongoose operations
}

const BestKartTimeSchema: Schema = new Schema({
  position: {
    type: Number,
    required: true,
    min: 1,
    max: 20
  },
  kartNumber: {
    type: Number,
    required: true,
    unique: true, // Only one record per kart
    min: 1
  },
  bestTime: {
    type: Number,
    required: true,
    min: 1 // Must be > 0
  },
  driverName: {
    type: String,
    required: true,
    trim: true
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
  collection: 'best_kart_times'
});

// Indexes for performance
BestKartTimeSchema.index({ position: 1 });
BestKartTimeSchema.index({ kartNumber: 1 }, { unique: true });
BestKartTimeSchema.index({ bestTime: 1 });

// Method to update record with new best time
BestKartTimeSchema.methods.updateRecord = function(
  this: IBestKartTime, 
  newTime: number, 
  driverName: string, 
  sessionId: string, 
  sessionName: string, 
  sessionDate: Date, 
  sessionTime: string
) {
  this.bestTime = newTime;
  this.driverName = driverName;
  this.sessionId = sessionId;
  this.sessionName = sessionName;
  this.sessionDate = sessionDate;
  this.sessionTime = sessionTime;
  this.lastUpdated = new Date();
};

// Method to get formatted time (mm:ss.sss)
BestKartTimeSchema.methods.getFormattedTime = function(this: IBestKartTime) {
  const minutes = Math.floor(this.bestTime / 60000);
  const seconds = Math.floor((this.bestTime % 60000) / 1000);
  const milliseconds = this.bestTime % 1000;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

// No static methods - using direct MongoDB operations in services

const BestKartTime = mongoose.models.BestKartTime || mongoose.model<IBestKartTime, IBestKartTimeModel>('BestKartTime', BestKartTimeSchema);

export default BestKartTime;