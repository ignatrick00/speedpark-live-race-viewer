import mongoose, { Schema, Document } from 'mongoose';

// Interface for ELO history entry
export interface IEloHistoryEntry {
  championshipId: mongoose.Types.ObjectId;
  championshipName: string;
  roundNumber: number;
  previousElo: number;
  newElo: number;
  change: number;
  position: number;
  opponentAvgElo: number; // Average ELO of opponents in that race
  date: Date;
}

// Interface for championship participation
export interface IChampionshipParticipation {
  championshipId: mongoose.Types.ObjectId;
  championshipName: string;
  season: string;
  division: string;
  finalPosition: number;
  totalPoints: number;
  racesParticipated: number;
  eloAtStart: number;
  eloAtEnd: number;
  eloChange: number;
}

// Main SquadronRanking interface
export interface ISquadronRanking extends Document {
  // Reference to squadron
  squadronId: mongoose.Types.ObjectId;

  // Current season (e.g., "2025-1")
  season: string;

  // ELO Rating System
  currentElo: number; // Current ELO (starts at 1500)
  peakElo: number; // Highest ELO ever achieved
  lowestElo: number; // Lowest ELO ever achieved

  // Division based on ELO
  // Elite: >1800, Masters: 1650-1800, Pro: 1500-1650, Open: <1500
  division: 'Elite' | 'Masters' | 'Pro' | 'Open';

  // Statistics
  stats: {
    totalChampionshipRaces: number;
    totalWins: number;
    totalPodiums: number;
    totalPoints: number;
    winRate: number; // Percentage of wins
    podiumRate: number; // Percentage of podiums
    averagePosition: number;
    bestStreak: number; // Best winning streak
    currentStreak: number; // Current winning streak
  };

  // ELO History (last 20 races)
  eloHistory: IEloHistoryEntry[];

  // Championship participation history
  championships: IChampionshipParticipation[];

  // Metadata
  lastUpdated: Date;
  isActive: boolean;
  lastRaceDate?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ELO History entry schema
const eloHistorySchema = new Schema<IEloHistoryEntry>({
  championshipId: {
    type: Schema.Types.ObjectId,
    ref: 'Championship',
    required: true
  },
  championshipName: {
    type: String,
    required: true
  },
  roundNumber: {
    type: Number,
    required: true
  },
  previousElo: {
    type: Number,
    required: true
  },
  newElo: {
    type: Number,
    required: true
  },
  change: {
    type: Number,
    required: true
  },
  position: {
    type: Number,
    required: true
  },
  opponentAvgElo: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// Championship participation schema
const championshipParticipationSchema = new Schema<IChampionshipParticipation>({
  championshipId: {
    type: Schema.Types.ObjectId,
    ref: 'Championship',
    required: true
  },
  championshipName: {
    type: String,
    required: true
  },
  season: {
    type: String,
    required: true
  },
  division: {
    type: String,
    required: true
  },
  finalPosition: {
    type: Number,
    required: true
  },
  totalPoints: {
    type: Number,
    required: true
  },
  racesParticipated: {
    type: Number,
    required: true
  },
  eloAtStart: {
    type: Number,
    required: true
  },
  eloAtEnd: {
    type: Number,
    required: true
  },
  eloChange: {
    type: Number,
    required: true
  }
}, { _id: false });

// Main SquadronRanking schema
const squadronRankingSchema = new Schema<ISquadronRanking>({
  squadronId: {
    type: Schema.Types.ObjectId,
    ref: 'Squadron',
    required: true,
    index: true
  },
  season: {
    type: String,
    required: true,
    index: true
  },

  // ELO Rating
  currentElo: {
    type: Number,
    default: 1500,
    min: 800,
    max: 2500
  },
  peakElo: {
    type: Number,
    default: 1500
  },
  lowestElo: {
    type: Number,
    default: 1500
  },

  // Division
  division: {
    type: String,
    enum: ['Elite', 'Masters', 'Pro', 'Open'],
    default: 'Pro' // Start at Pro (1500 ELO)
  },

  // Statistics
  stats: {
    totalChampionshipRaces: {
      type: Number,
      default: 0
    },
    totalWins: {
      type: Number,
      default: 0
    },
    totalPodiums: {
      type: Number,
      default: 0
    },
    totalPoints: {
      type: Number,
      default: 0
    },
    winRate: {
      type: Number,
      default: 0
    },
    podiumRate: {
      type: Number,
      default: 0
    },
    averagePosition: {
      type: Number,
      default: 0
    },
    bestStreak: {
      type: Number,
      default: 0
    },
    currentStreak: {
      type: Number,
      default: 0
    }
  },

  // ELO History (last 20)
  eloHistory: [eloHistorySchema],

  // Championships
  championships: [championshipParticipationSchema],

  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastRaceDate: Date
}, {
  timestamps: true
});

// Compound index for unique squadron per season
squadronRankingSchema.index({ squadronId: 1, season: 1 }, { unique: true });

// Index for division rankings
squadronRankingSchema.index({ division: 1, currentElo: -1 });

// Index for active rankings
squadronRankingSchema.index({ isActive: 1, currentElo: -1 });

// Method to update division based on ELO
squadronRankingSchema.methods.updateDivision = function() {
  if (this.currentElo > 1800) {
    this.division = 'Elite';
  } else if (this.currentElo >= 1650) {
    this.division = 'Masters';
  } else if (this.currentElo >= 1500) {
    this.division = 'Pro';
  } else {
    this.division = 'Open';
  }
};

// Method to update ELO
squadronRankingSchema.methods.updateElo = function(
  newElo: number,
  championshipId: mongoose.Types.ObjectId,
  championshipName: string,
  roundNumber: number,
  position: number,
  opponentAvgElo: number
) {
  const change = newElo - this.currentElo;

  // Add to history (keep last 20)
  this.eloHistory.unshift({
    championshipId,
    championshipName,
    roundNumber,
    previousElo: this.currentElo,
    newElo,
    change,
    position,
    opponentAvgElo,
    date: new Date()
  });

  // Keep only last 20 entries
  if (this.eloHistory.length > 20) {
    this.eloHistory = this.eloHistory.slice(0, 20);
  }

  // Update ELO
  this.currentElo = newElo;

  // Update peak/lowest
  if (newElo > this.peakElo) {
    this.peakElo = newElo;
  }
  if (newElo < this.lowestElo) {
    this.lowestElo = newElo;
  }

  // Update division
  this.updateDivision();

  this.lastUpdated = new Date();
};

// Method to update stats after a race
squadronRankingSchema.methods.updateStats = function(
  position: number,
  points: number,
  win: boolean,
  podium: boolean
) {
  this.stats.totalChampionshipRaces++;
  this.stats.totalPoints += points;

  if (win) {
    this.stats.totalWins++;
    this.stats.currentStreak++;
    if (this.stats.currentStreak > this.stats.bestStreak) {
      this.stats.bestStreak = this.stats.currentStreak;
    }
  } else {
    this.stats.currentStreak = 0;
  }

  if (podium) {
    this.stats.totalPodiums++;
  }

  // Update rates
  this.stats.winRate = (this.stats.totalWins / this.stats.totalChampionshipRaces) * 100;
  this.stats.podiumRate = (this.stats.totalPodiums / this.stats.totalChampionshipRaces) * 100;

  // Update average position
  const totalRaces = this.stats.totalChampionshipRaces;
  this.stats.averagePosition =
    ((this.stats.averagePosition * (totalRaces - 1)) + position) / totalRaces;

  this.lastRaceDate = new Date();
  this.lastUpdated = new Date();
};

// Method to add championship participation
squadronRankingSchema.methods.addChampionshipParticipation = function(
  championship: IChampionshipParticipation
) {
  this.championships.push(championship);
  this.lastUpdated = new Date();
};

// Static method to get or create ranking for squadron
squadronRankingSchema.statics.getOrCreate = async function(
  squadronId: mongoose.Types.ObjectId,
  season: string
): Promise<ISquadronRanking> {
  let ranking = await this.findOne({ squadronId, season });

  if (!ranking) {
    ranking = await this.create({
      squadronId,
      season,
      currentElo: 1500,
      peakElo: 1500,
      lowestElo: 1500,
      division: 'Pro',
      stats: {
        totalChampionshipRaces: 0,
        totalWins: 0,
        totalPodiums: 0,
        totalPoints: 0,
        winRate: 0,
        podiumRate: 0,
        averagePosition: 0,
        bestStreak: 0,
        currentStreak: 0
      },
      eloHistory: [],
      championships: []
    });
  }

  return ranking;
};

const SquadronRanking = mongoose.models.SquadronRanking ||
  mongoose.model<ISquadronRanking>('SquadronRanking', squadronRankingSchema);

export default SquadronRanking;
