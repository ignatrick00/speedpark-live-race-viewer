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
  updateKartRecord(
    kartNumber: number,
    newTime: number,
    driverName: string,
    sessionId: string,
    sessionName: string,
    sessionDate: Date,
    sessionTime: string
  ): Promise<any>;
  recalculatePositions(): Promise<void>;
  getTop20ForDisplay(): Promise<Array<{
    kart: number;
    time: string;
    driver: string;
    details: string;
  }>>;
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

// Static method to update or insert kart record
BestKartTimeSchema.statics.updateKartRecord = async function(
  kartNumber: number,
  newTime: number,
  driverName: string,
  sessionId: string,
  sessionName: string,
  sessionDate: Date,
  sessionTime: string
) {
  try {
    console.log(`🏎️ Checking kart record for: Kart #${kartNumber} - ${newTime}ms by ${driverName}`);
    
    // Find existing record for this kart
    const existingRecord = await this.findOne({ kartNumber });
    
    if (existingRecord) {
      // Kart exists - only update if new time is better
      if (newTime < existingRecord.bestTime) {
        console.log(`🎯 NEW KART RECORD! Kart #${kartNumber}: ${existingRecord.bestTime}ms → ${newTime}ms (${existingRecord.driverName} → ${driverName})`);
        existingRecord.updateRecord(newTime, driverName, sessionId, sessionName, sessionDate, sessionTime);
        await existingRecord.save();
        
        // Recalculate positions after update
        await this.recalculatePositions();
        return { updated: true, newRecord: true, previousTime: existingRecord.bestTime, previousDriver: existingRecord.driverName };
      } else {
        console.log(`⏱️ No improvement for Kart #${kartNumber}: current ${existingRecord.bestTime}ms vs new ${newTime}ms`);
        return { updated: false, newRecord: false };
      }
    } else {
      // New kart - check if there's room in top 20
      const currentCount = await this.countDocuments();
      
      if (currentCount < 20) {
        // Room available - add new kart
        const newRecord = new this({
          position: currentCount + 1,
          kartNumber,
          bestTime: newTime,
          driverName,
          sessionId,
          sessionName,
          sessionDate,
          sessionTime
        });
        
        await newRecord.save();
        console.log(`✨ NEW KART ADDED to top 20: Kart #${kartNumber} - ${newTime}ms by ${driverName}`);
        
        // Recalculate positions
        await this.recalculatePositions();
        return { updated: true, newRecord: true, added: true };
      } else {
        // Check if new time beats the worst in top 20
        const worstRecord = await this.findOne().sort({ bestTime: -1 });
        
        if (worstRecord && newTime < worstRecord.bestTime) {
          // Replace worst record
          console.log(`🔄 REPLACING worst kart record: Kart #${worstRecord.kartNumber} (${worstRecord.bestTime}ms) with Kart #${kartNumber} (${newTime}ms)`);
          
          await this.deleteOne({ _id: worstRecord._id });
          
          const newRecord = new this({
            position: 20,
            kartNumber,
            bestTime: newTime,
            driverName,
            sessionId,
            sessionName,
            sessionDate,
            sessionTime
          });
          
          await newRecord.save();
          
          // Recalculate positions
          await this.recalculatePositions();
          return { updated: true, newRecord: true, replaced: `Kart #${worstRecord.kartNumber}` };
        } else {
          console.log(`📊 Kart #${kartNumber} time ${newTime}ms not good enough for top 20`);
          return { updated: false, newRecord: false };
        }
      }
    }
  } catch (error) {
    console.error('❌ Error updating kart record:', error);
    throw error;
  }
};

// Static method to recalculate positions based on best times
BestKartTimeSchema.statics.recalculatePositions = async function() {
  try {
    const records = await this.find().sort({ bestTime: 1 });
    
    for (let i = 0; i < records.length; i++) {
      if (records[i].position !== i + 1) {
        records[i].position = i + 1;
        await records[i].save();
      }
    }
    
    console.log(`📊 Recalculated positions for ${records.length} kart records`);
  } catch (error) {
    console.error('❌ Error recalculating positions:', error);
  }
};

// Static method to get top 20 formatted for display
BestKartTimeSchema.statics.getTop20ForDisplay = async function() {
  try {
    const records = await this.find().sort({ position: 1 }).limit(20);
    
    return records.map(record => ({
      kart: record.kartNumber,
      time: record.getFormattedTime(),
      driver: record.driverName,
      details: `${record.sessionTime} • ${record.sessionDate.toLocaleDateString('es-CL')}`
    }));
  } catch (error) {
    console.error('❌ Error getting top 20 karts:', error);
    return [];
  }
};

const BestKartTime = mongoose.models.BestKartTime || mongoose.model<IBestKartTime, IBestKartTimeModel>('BestKartTime', BestKartTimeSchema);

export default BestKartTime;