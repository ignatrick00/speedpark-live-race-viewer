import mongoose, { Schema, Document } from 'mongoose';

// Interface for a round/race in the championship
export interface IRound {
  roundNumber: number;
  name: string;
  scheduledDate: Date;
  raceSessionId?: string; // Link to RaceSession (SMS-Timing sessionId)
  status: 'scheduled' | 'completed' | 'cancelled';
  results?: Array<{
    squadronId: mongoose.Types.ObjectId;
    position: number;
    points: number;
    eloChange: number;
    driversPresent: number; // How many squadron drivers participated
  }>;
}

// Interface for championship standings
export interface IStanding {
  squadronId: mongoose.Types.ObjectId;
  totalPoints: number;
  wins: number;
  podiums: number; // Top 3 finishes
  racesParticipated: number;
  bestFinish: number;
  currentElo: number;
  eloChange: number; // Total ELO change during championship
  pointsByRound: Array<{
    roundNumber: number;
    points: number;
    position: number;
    eloChange: number;
  }>;
}

// Main Championship interface
export interface IChampionship extends Document {
  // Basic info
  name: string;
  season: string; // e.g., "2025-1" for first season of 2025
  division: 'Elite' | 'Masters' | 'Pro' | 'Open';
  status: 'registration' | 'active' | 'finished' | 'cancelled';

  // Dates
  startDate?: Date;
  endDate?: Date;
  registrationDeadline?: Date;

  // Configuration
  pointsSystem: 'f1' | 'custom';
  customPoints?: number[]; // If custom, array of points [1st, 2nd, 3rd, ...]
  maxSquadrons: number;
  minRacesRequired: number; // Minimum races to qualify for final standings

  // Requirements
  requirements: {
    minFairRacing: number; // Minimum fair racing score
    minMembers: number;
    maxMembers: number;
  };

  // Registered squadrons
  registeredSquadrons: Array<{
    squadronId: mongoose.Types.ObjectId;
    registrationDate: Date;
    approved: boolean;
    initialElo: number; // ELO at time of registration
    approvedBy?: mongoose.Types.ObjectId; // Admin who approved
    approvedAt?: Date;
  }>;

  // Rounds/Races
  rounds: IRound[];
  currentRound: number;

  // Standings (calculated after each race)
  standings: IStanding[];

  // Winner
  championSquadronId?: mongoose.Types.ObjectId;
  finalizedAt?: Date;
  finalizedBy?: mongoose.Types.ObjectId; // Admin who finalized

  // Admin who created
  createdBy: mongoose.Types.ObjectId;

  // Metadata
  description?: string;
  rules?: string;
  prizes?: string;

  createdAt: Date;
  updatedAt: Date;
}

// Round schema
const roundSchema = new Schema<IRound>({
  roundNumber: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  raceSessionId: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  results: [{
    squadronId: {
      type: Schema.Types.ObjectId,
      ref: 'Squadron',
      required: true
    },
    position: {
      type: Number,
      required: true
    },
    points: {
      type: Number,
      required: true
    },
    eloChange: {
      type: Number,
      required: true
    },
    driversPresent: {
      type: Number,
      default: 0
    }
  }]
}, { _id: false });

// Standing schema
const standingSchema = new Schema<IStanding>({
  squadronId: {
    type: Schema.Types.ObjectId,
    ref: 'Squadron',
    required: true
  },
  totalPoints: {
    type: Number,
    default: 0
  },
  wins: {
    type: Number,
    default: 0
  },
  podiums: {
    type: Number,
    default: 0
  },
  racesParticipated: {
    type: Number,
    default: 0
  },
  bestFinish: {
    type: Number,
    default: 999
  },
  currentElo: {
    type: Number,
    required: true
  },
  eloChange: {
    type: Number,
    default: 0
  },
  pointsByRound: [{
    roundNumber: Number,
    points: Number,
    position: Number,
    eloChange: Number
  }]
}, { _id: false });

// Main Championship schema
const championshipSchema = new Schema<IChampionship>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  season: {
    type: String,
    required: true,
    trim: true
  },
  division: {
    type: String,
    enum: ['Elite', 'Masters', 'Pro', 'Open'],
    required: true
  },
  status: {
    type: String,
    enum: ['registration', 'active', 'finished', 'cancelled'],
    default: 'registration'
  },

  // Dates
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  registrationDeadline: {
    type: Date,
    default: null
  },

  // Configuration
  pointsSystem: {
    type: String,
    enum: ['f1', 'custom'],
    default: 'f1'
  },
  customPoints: [{
    type: Number
  }],
  maxSquadrons: {
    type: Number,
    default: 20,
    min: 2
  },
  minRacesRequired: {
    type: Number,
    default: 3,
    min: 1
  },

  // Requirements
  requirements: {
    minFairRacing: {
      type: Number,
      default: 70,
      min: 0,
      max: 100
    },
    minMembers: {
      type: Number,
      default: 2
    },
    maxMembers: {
      type: Number,
      default: 4
    }
  },

  // Registered squadrons
  registeredSquadrons: [{
    squadronId: {
      type: Schema.Types.ObjectId,
      ref: 'Squadron',
      required: true
    },
    registrationDate: {
      type: Date,
      default: Date.now
    },
    approved: {
      type: Boolean,
      default: false
    },
    initialElo: {
      type: Number,
      required: true
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'WebUser'
    },
    approvedAt: Date
  }],

  // Rounds
  rounds: [roundSchema],
  currentRound: {
    type: Number,
    default: 0
  },

  // Standings
  standings: [standingSchema],

  // Winner
  championSquadronId: {
    type: Schema.Types.ObjectId,
    ref: 'Squadron'
  },
  finalizedAt: Date,
  finalizedBy: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser'
  },

  // Admin
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true
  },

  // Metadata
  description: {
    type: String,
    maxlength: 500
  },
  rules: {
    type: String,
    maxlength: 2000
  },
  prizes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
championshipSchema.index({ season: 1, division: 1 });
championshipSchema.index({ status: 1, startDate: -1 });
championshipSchema.index({ 'registeredSquadrons.squadronId': 1 });
championshipSchema.index({ division: 1, status: 1 });

// Method to get F1 points for position
championshipSchema.methods.getPointsForPosition = function(position: number): number {
  if (this.pointsSystem === 'f1') {
    const f1Points = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
    return f1Points[position - 1] || 0;
  } else if (this.customPoints && this.customPoints.length > 0) {
    return this.customPoints[position - 1] || 0;
  }
  return 0;
};

// Method to check if squadron is registered and approved
championshipSchema.methods.isSquadronRegistered = function(squadronId: string): boolean {
  return this.registeredSquadrons.some(
    (reg: any) => reg.squadronId.toString() === squadronId && reg.approved
  );
};

// Method to get squadron standing
championshipSchema.methods.getSquadronStanding = function(squadronId: string): IStanding | null {
  return this.standings.find(
    (standing: IStanding) => standing.squadronId.toString() === squadronId
  ) || null;
};

// Method to update standings after a race
championshipSchema.methods.updateStandings = function() {
  // Create/update standings based on all completed rounds
  const standingsMap = new Map<string, any>();

  // Initialize standings for all approved squadrons
  this.registeredSquadrons.forEach((reg: any) => {
    if (reg.approved) {
      const existingStanding = this.standings.find(
        (s: IStanding) => s.squadronId.toString() === reg.squadronId.toString()
      );

      standingsMap.set(reg.squadronId.toString(), {
        squadronId: reg.squadronId,
        totalPoints: existingStanding?.totalPoints || 0,
        wins: existingStanding?.wins || 0,
        podiums: existingStanding?.podiums || 0,
        racesParticipated: existingStanding?.racesParticipated || 0,
        bestFinish: existingStanding?.bestFinish || 999,
        currentElo: existingStanding?.currentElo || reg.initialElo,
        eloChange: existingStanding?.eloChange || 0,
        pointsByRound: existingStanding?.pointsByRound || []
      });
    }
  });

  // Process each completed round
  this.rounds.forEach((round: IRound) => {
    if (round.status === 'completed' && round.results) {
      round.results.forEach((result: any) => {
        const standing = standingsMap.get(result.squadronId.toString());
        if (standing) {
          standing.totalPoints += result.points;
          standing.racesParticipated++;
          standing.currentElo += result.eloChange;
          standing.eloChange += result.eloChange;

          if (result.position === 1) standing.wins++;
          if (result.position <= 3) standing.podiums++;
          if (result.position < standing.bestFinish) {
            standing.bestFinish = result.position;
          }

          standing.pointsByRound.push({
            roundNumber: round.roundNumber,
            points: result.points,
            position: result.position,
            eloChange: result.eloChange
          });
        }
      });
    }
  });

  // Convert map to array and sort by points (then by wins as tiebreaker)
  this.standings = Array.from(standingsMap.values())
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return b.wins - a.wins;
    });
};

const Championship = mongoose.models.Championship ||
  mongoose.model<IChampionship>('Championship', championshipSchema);

export default Championship;
