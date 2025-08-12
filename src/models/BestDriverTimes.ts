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
  updateDriverRecord(
    driverName: string,
    newTime: number,
    kartNumber: number,
    sessionId: string,
    sessionName: string,
    sessionDate: Date,
    sessionTime: string
  ): Promise<any>;
  recalculatePositions(): Promise<void>;
  getTop10ForDisplay(): Promise<Array<{
    pos: number;
    name: string;
    time: string;
    details: string;
  }>>;
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

// Static method to update or insert driver record
BestDriverTimeSchema.statics.updateDriverRecord = async function(
  driverName: string,
  newTime: number,
  kartNumber: number,
  sessionId: string,
  sessionName: string,
  sessionDate: Date,
  sessionTime: string
) {
  try {
    console.log(`🏆 Checking driver record for: ${driverName} - ${newTime}ms`);
    
    // Find existing record for this driver
    const existingRecord = await this.findOne({ driverName });
    
    if (existingRecord) {
      // Driver exists - only update if new time is better
      if (newTime < existingRecord.bestTime) {
        console.log(`🎯 NEW DRIVER RECORD! ${driverName}: ${existingRecord.bestTime}ms → ${newTime}ms`);
        existingRecord.updateRecord(newTime, kartNumber, sessionId, sessionName, sessionDate, sessionTime);
        await existingRecord.save();
        
        // Recalculate positions after update
        await this.recalculatePositions();
        return { updated: true, newRecord: true, previousTime: existingRecord.bestTime };
      } else {
        console.log(`⏱️ No improvement for ${driverName}: current ${existingRecord.bestTime}ms vs new ${newTime}ms`);
        return { updated: false, newRecord: false };
      }
    } else {
      // New driver - check if there's room in top 10
      const currentCount = await this.countDocuments();
      
      if (currentCount < 10) {
        // Room available - add new driver
        const newRecord = new this({
          position: currentCount + 1,
          driverName,
          bestTime: newTime,
          kartNumber,
          sessionId,
          sessionName,
          sessionDate,
          sessionTime
        });
        
        await newRecord.save();
        console.log(`✨ NEW DRIVER ADDED to top 10: ${driverName} - ${newTime}ms`);
        
        // Recalculate positions
        await this.recalculatePositions();
        return { updated: true, newRecord: true, added: true };
      } else {
        // Check if new time beats the worst in top 10
        const worstRecord = await this.findOne().sort({ bestTime: -1 });
        
        if (worstRecord && newTime < worstRecord.bestTime) {
          // Replace worst record
          console.log(`🔄 REPLACING worst record: ${worstRecord.driverName} (${worstRecord.bestTime}ms) with ${driverName} (${newTime}ms)`);
          
          await this.deleteOne({ _id: worstRecord._id });
          
          const newRecord = new this({
            position: 10,
            driverName,
            bestTime: newTime,
            kartNumber,
            sessionId,
            sessionName,
            sessionDate,
            sessionTime
          });
          
          await newRecord.save();
          
          // Recalculate positions
          await this.recalculatePositions();
          return { updated: true, newRecord: true, replaced: worstRecord.driverName };
        } else {
          console.log(`📊 ${driverName} time ${newTime}ms not good enough for top 10`);
          return { updated: false, newRecord: false };
        }
      }
    }
  } catch (error) {
    console.error('❌ Error updating driver record:', error);
    throw error;
  }
};

// Static method to recalculate positions based on best times
BestDriverTimeSchema.statics.recalculatePositions = async function() {
  try {
    const records = await this.find().sort({ bestTime: 1 });
    
    for (let i = 0; i < records.length; i++) {
      if (records[i].position !== i + 1) {
        records[i].position = i + 1;
        await records[i].save();
      }
    }
    
    console.log(`📊 Recalculated positions for ${records.length} driver records`);
  } catch (error) {
    console.error('❌ Error recalculating positions:', error);
  }
};

// Static method to get top 10 formatted for display
BestDriverTimeSchema.statics.getTop10ForDisplay = async function() {
  try {
    const records = await this.find().sort({ position: 1 }).limit(10);
    
    return records.map(record => ({
      pos: record.position,
      name: record.driverName,
      time: record.getFormattedTime(),
      details: `Kart #${record.kartNumber} • ${record.sessionTime}`
    }));
  } catch (error) {
    console.error('❌ Error getting top 10 drivers:', error);
    return [];
  }
};

const BestDriverTime = mongoose.models.BestDriverTime || mongoose.model<IBestDriverTime, IBestDriverTimeModel>('BestDriverTime', BestDriverTimeSchema);

export default BestDriverTime;