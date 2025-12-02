import mongoose, { Schema, Document } from 'mongoose';

export interface ISquadron extends Document {
  squadronId: string;
  name: string;
  logo?: string; // URL de Cloudflare R2
  colors: {
    primary: string;   // Color principal (hex)
    secondary: string; // Color secundario (hex)
  };
  captainId: mongoose.Types.ObjectId; // Referencia a WebUser
  members: mongoose.Types.ObjectId[]; // Array de WebUser IDs (2-4 miembros)
  totalPoints: number; // Puntos acumulados en campeonatos
  ranking: number; // Posición en ranking global
  division: 'Elite' | 'Masters' | 'Pro' | 'Open'; // División actual
  fairRacingAverage: number; // Promedio de fair racing (0-100)
  recruitmentMode: 'open' | 'invite-only'; // Modo de reclutamiento
  description?: string; // Filosofía/descripción de la escudería
  createdAt: Date;
  updatedAt: Date;
  // Metadata
  totalRaces: number; // Total de carreras disputadas
  totalVictories: number; // Victorias en campeonatos
  isActive: boolean; // Si la escudería está activa
  inactivityStreak: number; // Semanas de inactividad
}

const SquadronSchema = new Schema<ISquadron>(
  {
    squadronId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    logo: {
      type: String,
      default: null,
    },
    colors: {
      primary: {
        type: String,
        required: true,
        default: '#00D4FF', // Electric blue por defecto
        match: /^#[0-9A-F]{6}$/i,
      },
      secondary: {
        type: String,
        required: true,
        default: '#0057B8', // RB blue por defecto
        match: /^#[0-9A-F]{6}$/i,
      },
    },
    captainId: {
      type: Schema.Types.ObjectId,
      ref: 'WebUser',
      required: true,
      index: true,
    },
    members: [{
      type: Schema.Types.ObjectId,
      ref: 'WebUser',
    }],
    totalPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    ranking: {
      type: Number,
      default: 0,
      min: 0,
    },
    division: {
      type: String,
      enum: ['Elite', 'Masters', 'Pro', 'Open'],
      default: 'Open',
    },
    fairRacingAverage: {
      type: Number,
      default: 85, // Todos empiezan en 85
      min: 0,
      max: 100,
    },
    recruitmentMode: {
      type: String,
      enum: ['open', 'invite-only'],
      default: 'open',
    },
    description: {
      type: String,
      maxlength: 500,
      default: '',
    },
    totalRaces: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalVictories: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    inactivityStreak: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Índices compuestos para queries eficientes
SquadronSchema.index({ ranking: 1, division: 1 });
SquadronSchema.index({ totalPoints: -1 });
SquadronSchema.index({ isActive: 1, division: 1 });

// Validación: máximo 4 miembros (permite 0 si está inactiva)
SquadronSchema.pre('save', function (next) {
  // Permitir 0 miembros solo si está inactiva
  if (this.members.length === 0 && !this.isActive) {
    next();
  } else if (this.members.length < 1 || this.members.length > 4) {
    next(new Error('Una escudería activa debe tener entre 1 y 4 miembros'));
  } else {
    next();
  }
});

// Virtual para obtener miembros completos
SquadronSchema.virtual('fullMembers', {
  ref: 'WebUser',
  localField: 'members',
  foreignField: '_id',
  justOne: false,
});

// Virtual para capitán completo
SquadronSchema.virtual('captain', {
  ref: 'WebUser',
  localField: 'captainId',
  foreignField: '_id',
  justOne: true,
});

export default mongoose.models.Squadron || mongoose.model<ISquadron>('Squadron', SquadronSchema);
