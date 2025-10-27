import mongoose, { Schema, Document } from 'mongoose';

export interface IIncidentRecord {
  incidentId: string;
  eventId: string; // ID del evento donde ocurrió
  category: 'aggressive-driving' | 'excessive-blocking' | 'avoidable-contact' | 'unsportsmanlike' | 'exploit-abuse';
  severity: 1 | 2 | 3; // 1=leve, 2=moderado, 3=grave
  pointsDeducted: number;
  reportedBy: mongoose.Types.ObjectId; // Piloto que reportó
  moderatorId: mongoose.Types.ObjectId; // Moderador que aprobó
  description: string;
  videoEvidence?: string; // URL del video en R2
  date: Date;
  status: 'pending' | 'approved' | 'rejected';
}

export interface IRecognitionRecord {
  recognitionId: string;
  eventId: string;
  type: 'fair-racing-exceptional' | 'sportsmanship-outstanding';
  pointsAwarded: number; // +3 a +5
  observerId: mongoose.Types.ObjectId; // Observador que otorgó
  description?: string;
  date: Date;
}

export interface IFairRacingScore extends Document {
  pilotId: mongoose.Types.ObjectId; // Referencia a WebUser
  currentScore: number; // 0-100
  initialScore: number; // Siempre 85 para nuevos
  incidentsHistory: IIncidentRecord[];
  recognitions: IRecognitionRecord[];
  lastRaceDate: Date | null;
  totalRacesClean: number; // Carreras sin incidentes
  recoveryProgress: number; // +1 por carrera limpia
  createdAt: Date;
  updatedAt: Date;
}

const IncidentRecordSchema = new Schema<IIncidentRecord>({
  incidentId: {
    type: String,
    required: true,
    unique: true,
  },
  eventId: {
    type: String,
    required: true,
    index: true,
  },
  category: {
    type: String,
    enum: ['aggressive-driving', 'excessive-blocking', 'avoidable-contact', 'unsportsmanlike', 'exploit-abuse'],
    required: true,
  },
  severity: {
    type: Number,
    enum: [1, 2, 3],
    required: true,
  },
  pointsDeducted: {
    type: Number,
    required: true,
    min: 0,
    max: 30,
  },
  reportedBy: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
  },
  moderatorId: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
  },
  description: {
    type: String,
    required: true,
    minlength: 50,
  },
  videoEvidence: {
    type: String,
    default: null,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
}, { _id: false });

const RecognitionRecordSchema = new Schema<IRecognitionRecord>({
  recognitionId: {
    type: String,
    required: true,
    unique: true,
  },
  eventId: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['fair-racing-exceptional', 'sportsmanship-outstanding'],
    required: true,
  },
  pointsAwarded: {
    type: Number,
    required: true,
    min: 3,
    max: 5,
  },
  observerId: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  date: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const FairRacingScoreSchema = new Schema<IFairRacingScore>(
  {
    pilotId: {
      type: Schema.Types.ObjectId,
      ref: 'WebUser',
      required: true,
      unique: true,
      index: true,
    },
    currentScore: {
      type: Number,
      default: 85,
      min: 0,
      max: 100,
    },
    initialScore: {
      type: Number,
      default: 85,
      immutable: true,
    },
    incidentsHistory: [IncidentRecordSchema],
    recognitions: [RecognitionRecordSchema],
    lastRaceDate: {
      type: Date,
      default: null,
    },
    totalRacesClean: {
      type: Number,
      default: 0,
      min: 0,
    },
    recoveryProgress: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Índices
FairRacingScoreSchema.index({ currentScore: -1 });
FairRacingScoreSchema.index({ pilotId: 1, currentScore: -1 });

// Método para aplicar penalización
FairRacingScoreSchema.methods.applyPenalty = function(points: number) {
  this.currentScore = Math.max(0, this.currentScore - points);
  return this.save();
};

// Método para otorgar reconocimiento
FairRacingScoreSchema.methods.awardRecognition = function(points: number) {
  this.currentScore = Math.min(100, this.currentScore + points);
  return this.save();
};

// Método para recuperación gradual (+1 por carrera limpia)
FairRacingScoreSchema.methods.applyCleanRaceRecovery = function() {
  if (this.currentScore < 100) {
    this.currentScore = Math.min(100, this.currentScore + 1);
    this.totalRacesClean += 1;
    this.recoveryProgress += 1;
  }
  this.lastRaceDate = new Date();
  return this.save();
};

export default mongoose.models.FairRacingScore || mongoose.model<IFairRacingScore>('FairRacingScore', FairRacingScoreSchema);
