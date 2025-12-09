import mongoose, { Schema, Document } from 'mongoose';
import { EventCategory, EventCategoryConfig } from '@/types/squadron-events';

// Re-export for convenience
export { EventCategory, EventCategoryConfig };

export interface ISquadronEvent extends Document {
  // Información básica del evento
  name: string;
  description?: string;
  category: EventCategory;

  // Organizador
  createdBy: mongoose.Types.ObjectId; // Referencia a WebUser (organizador)

  // Fecha y ubicación
  eventDate: Date;
  eventTime: string; // Hora del evento (formato HH:mm)
  duration: number; // Duración en minutos
  registrationDeadline: Date;
  location: string;

  // Configuración del evento
  maxSquadrons: number;
  minPilotsPerSquadron: number;
  maxPilotsPerSquadron: number;

  // Puntuación
  pointsForWinner: number;
  pointsDistribution: {
    position: number;
    points: number;
  }[];

  // Escuderías participantes
  participants: Array<{
    squadronId: mongoose.Types.ObjectId;
    registeredAt: Date;
    registeredBy: mongoose.Types.ObjectId; // Quien inició el registro
    confirmedPilots: Array<{
      pilotId: mongoose.Types.ObjectId;
      kartNumber: number;
      confirmedAt: Date;
    }>; // Pilotos confirmados con sus karts
    pendingInvitations: Array<{
      pilotId: mongoose.Types.ObjectId;
      invitedBy?: mongoose.Types.ObjectId; // Who sent the invitation
      kartNumber: number;
      invitedAt: Date;
      expiresAt: Date;
      status: 'pending' | 'accepted' | 'expired' | 'declined';
    }>;
    status: 'pending' | 'confirmed' | 'cancelled';
    notes?: string;
  }>;

  // Carrera vinculada (SMS-Timing)
  linkedRaceSessionId?: string; // sessionId de la carrera en race_sessions_v0
  raceStatus?: 'pending' | 'in_review' | 'finalized'; // Estado de la carrera vinculada
  finalizedAt?: Date; // Fecha cuando se finalizaron los resultados

  // Sanciones aplicadas
  sanctions?: Array<{
    driverName: string;
    webUserId: string;
    sanctionType: 'position_penalty' | 'point_deduction' | 'disqualification' | 'warning';
    description: string;
    positionPenalty?: number; // Número de posiciones a bajar (ej: +3 posiciones)
    pointsPenalty?: number; // Puntos a deducir
    appliedBy: mongoose.Types.ObjectId; // Organizador que aplicó la sanción
    appliedAt: Date;
  }>;

  // Resultados ajustados (posiciones después de sanciones)
  adjustedResults?: Array<{
    driverName: string;
    webUserId?: string;
    originalPosition: number;
    adjustedPosition: number;
    sanctionApplied: boolean;
  }>;

  // Resultados (después del evento)
  results?: Array<{
    squadronId: mongoose.Types.ObjectId;
    position: number;
    pointsEarned: number;
    totalTime?: number;
    bestLapTime?: number;
    pilots: Array<{
      pilotId: mongoose.Types.ObjectId;
      lapTimes: number[];
      bestLap: number;
      position: number;
    }>;
  }>;

  // Estado del evento
  status: 'draft' | 'published' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled';

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  completedAt?: Date;
}

const SquadronEventSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    enum: Object.values(EventCategory),
    required: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
  },
  eventDate: {
    type: Date,
    required: true,
  },
  eventTime: {
    type: String,
    required: true,
    default: '19:00',
  },
  duration: {
    type: Number,
    required: true,
    default: 90, // 90 minutos por defecto
  },
  registrationDeadline: {
    type: Date,
    required: true,
  },
  location: {
    type: String,
    required: true,
    default: 'SpeedPark',
  },
  maxSquadrons: {
    type: Number,
    required: true,
    default: 20,
  },
  minPilotsPerSquadron: {
    type: Number,
    required: true,
    default: 2,
  },
  maxPilotsPerSquadron: {
    type: Number,
    required: true,
    default: 6,
  },
  pointsForWinner: {
    type: Number,
    required: true,
  },
  pointsDistribution: [{
    position: {
      type: Number,
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
  }],
  participants: [{
    squadronId: {
      type: Schema.Types.ObjectId,
      ref: 'Squadron',
      required: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    registeredBy: {
      type: Schema.Types.ObjectId,
      ref: 'WebUser',
      required: true,
    },
    confirmedPilots: [{
      pilotId: {
        type: Schema.Types.ObjectId,
        ref: 'WebUser',
        required: true,
      },
      kartNumber: {
        type: Number,
        required: true,
        min: 1,
        max: 20,
      },
      confirmedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    pendingInvitations: [{
      pilotId: {
        type: Schema.Types.ObjectId,
        ref: 'WebUser',
        required: true,
      },
      invitedBy: {
        type: Schema.Types.ObjectId,
        ref: 'WebUser',
        required: false,
      },
      kartNumber: {
        type: Number,
        required: false, // Temporarily optional to handle old invitations without kartNumber
        min: 1,
        max: 20,
      },
      invitedAt: {
        type: Date,
        default: Date.now,
      },
      expiresAt: {
        type: Date,
        required: true,
      },
      status: {
        type: String,
        enum: ['pending', 'accepted', 'expired', 'declined'],
        default: 'pending',
      },
    }],
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
    notes: {
      type: String,
    },
  }],
  linkedRaceSessionId: {
    type: String,
    default: null,
  },
  raceStatus: {
    type: String,
    enum: ['pending', 'in_review', 'finalized'],
    default: 'pending',
  },
  finalizedAt: {
    type: Date,
    default: null,
  },
  sanctions: [{
    driverName: {
      type: String,
      required: true,
    },
    webUserId: {
      type: String,
      required: true,
    },
    sanctionType: {
      type: String,
      enum: ['position_penalty', 'point_deduction', 'disqualification', 'warning'],
      required: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    positionPenalty: {
      type: Number,
      min: 0,
    },
    pointsPenalty: {
      type: Number,
      min: 0,
    },
    appliedBy: {
      type: Schema.Types.ObjectId,
      ref: 'WebUser',
      required: true,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  adjustedResults: [{
    driverName: {
      type: String,
      required: true,
    },
    webUserId: String,
    originalPosition: {
      type: Number,
      required: true,
    },
    adjustedPosition: {
      type: Number,
      required: true,
    },
    sanctionApplied: {
      type: Boolean,
      default: false,
    },
  }],
  results: [{
    squadronId: {
      type: Schema.Types.ObjectId,
      ref: 'Squadron',
    },
    position: {
      type: Number,
    },
    pointsEarned: {
      type: Number,
    },
    totalTime: {
      type: Number,
    },
    bestLapTime: {
      type: Number,
    },
    pilots: [{
      pilotId: {
        type: Schema.Types.ObjectId,
        ref: 'WebUser',
      },
      lapTimes: [Number],
      bestLap: Number,
      position: Number,
    }],
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled'],
    default: 'draft',
  },
  publishedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Índices
SquadronEventSchema.index({ category: 1, eventDate: 1 });
SquadronEventSchema.index({ status: 1 });
SquadronEventSchema.index({ createdBy: 1 });
SquadronEventSchema.index({ 'participants.squadronId': 1 });

// Métodos
SquadronEventSchema.methods.canRegister = function(squadronRank: number): boolean {
  const config = EventCategoryConfig[this.category as EventCategory];

  // Si no hay restricción de ranking, cualquiera puede registrarse
  if (config.requiredRank === null) return true;

  // Verificar si el ranking de la escudería cumple el requisito
  return squadronRank <= config.requiredRank;
};

SquadronEventSchema.methods.isMandatoryFor = function(squadronRank: number): boolean {
  const config = EventCategoryConfig[this.category as EventCategory];

  // Si no hay restricción de obligatoriedad, no es obligatorio
  if (config.mandatoryForTop === null) return false;

  // Verificar si es obligatorio para esta escudería
  return squadronRank <= config.mandatoryForTop;
};

SquadronEventSchema.methods.hasSpace = function(): boolean {
  return this.participants.filter((p: any) => p.status !== 'cancelled').length < this.maxSquadrons;
};

// Prevenir duplicación en desarrollo
const SquadronEvent = mongoose.models.SquadronEvent || mongoose.model<ISquadronEvent>('SquadronEvent', SquadronEventSchema);

export default SquadronEvent;
