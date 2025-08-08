import mongoose from 'mongoose';

// Detailed lap-by-lap data for each driver
const lapDataSchema = new mongoose.Schema({
  lapNumber: { type: Number, required: true },
  lapTime: { type: Number, required: true }, // in milliseconds
  position: { type: Number, required: true },
  gapToLeader: { type: Number, required: true }, // in milliseconds
  gapToNext: { type: Number, required: true }, // in milliseconds
  timestamp: { type: Date, required: true },
  sector1: { type: Number, default: null }, // sector times if available
  sector2: { type: Number, default: null },
  sector3: { type: Number, default: null }
});

// Driver performance in a race session
const driverSessionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  kartNumber: { type: Number, required: true },
  startingPosition: { type: Number, required: true },
  finalPosition: { type: Number, required: true },
  totalLaps: { type: Number, required: true },
  bestLapTime: { type: Number, required: true },
  bestLapNumber: { type: Number, required: true },
  averageLapTime: { type: Number, required: true },
  totalRaceTime: { type: Number, required: true },
  
  // Lap by lap details
  laps: [lapDataSchema],
  
  // Race incidents
  incidents: [{
    lapNumber: Number,
    type: String, // 'pit_stop', 'spin', 'collision', 'mechanical'
    description: String,
    timeLost: Number // milliseconds
  }],
  
  // Performance metrics
  consistency: { type: Number, default: 0 }, // Standard deviation of lap times
  improvementRate: { type: Number, default: 0 }, // How much faster from start to finish
  overtakes: { type: Number, default: 0 },
  positionsGained: { type: Number, default: 0 } // final - starting position
});

// Complete race session with detailed timing
const detailedRaceSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  sessionName: { type: String, required: true },
  sessionType: { 
    type: String, 
    enum: ['practice', 'qualifying', 'classification', 'race', 'endurance'],
    default: 'classification'
  },
  
  // Track and conditions
  trackName: { type: String, default: 'Speed Park' },
  trackCondition: { type: String, default: 'dry' }, // dry, wet, mixed
  temperature: { type: Number, default: 20 }, // celsius
  humidity: { type: Number, default: 50 }, // percentage
  
  // Session timing
  sessionStartTime: { type: Date, required: true },
  sessionEndTime: { type: Date, required: true },
  sessionDuration: { type: Number, required: true }, // minutes
  totalLaps: { type: Number, required: true },
  
  // Drivers and their detailed performance
  drivers: [driverSessionSchema],
  
  // Session statistics
  fastestLap: {
    driverName: String,
    lapTime: Number,
    lapNumber: Number,
    kartNumber: Number
  },
  
  averageLapTime: { type: Number, required: true },
  totalOvertakes: { type: Number, default: 0 },
  
  // Race progression - position changes throughout the race
  positionChart: [{
    lapNumber: Number,
    positions: [{ // Array of driver positions at this lap
      driverName: String,
      position: Number,
      lapTime: Number,
      gapToLeader: Number
    }]
  }],
  
  // Revenue and business data
  revenue: { type: Number, required: true },
  pricePerDriver: { type: Number, default: 17000 },
  
  // Data source and processing
  dataSource: { type: String, enum: ['sms_timing', 'manual', 'import'], default: 'sms_timing' },
  rawSMSData: { type: mongoose.Schema.Types.Mixed }, // Original SMS-Timing data
  processed: { type: Boolean, default: false },
  
  // Linked users (for statistics)
  linkedUsers: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'WebUser' },
    driverName: String,
    linkConfidence: { type: Number, default: 1.0 }, // 0-1, how sure we are about the link
    linkedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Indexes for efficient querying
detailedRaceSessionSchema.index({ sessionId: 1 });
detailedRaceSessionSchema.index({ sessionStartTime: -1 });
detailedRaceSessionSchema.index({ 'drivers.name': 1 });
detailedRaceSessionSchema.index({ 'linkedUsers.userId': 1 });
detailedRaceSessionSchema.index({ sessionType: 1, sessionStartTime: -1 });

// Methods for analysis
detailedRaceSessionSchema.methods.getDriverStats = function(driverName: string) {
  const driver = this.drivers.find((d: any) => d.name === driverName);
  if (!driver) return null;
  
  return {
    totalLaps: driver.totalLaps,
    bestLapTime: driver.bestLapTime,
    averageLapTime: driver.averageLapTime,
    consistency: driver.consistency,
    positionsGained: driver.positionsGained,
    overtakes: driver.overtakes,
    lapTimes: driver.laps.map((lap: any) => ({
      lap: lap.lapNumber,
      time: lap.lapTime,
      position: lap.position
    }))
  };
};

detailedRaceSessionSchema.methods.getPositionChanges = function(driverName: string) {
  return this.positionChart.map((chart: any) => {
    const driverData = chart.positions.find((p: any) => p.driverName === driverName);
    return {
      lap: chart.lapNumber,
      position: driverData?.position || null,
      lapTime: driverData?.lapTime || null,
      gap: driverData?.gapToLeader || null
    };
  }).filter((data: any) => data.position !== null);
};

export default mongoose.models.DetailedRaceSession || 
  mongoose.model('DetailedRaceSession', detailedRaceSessionSchema);