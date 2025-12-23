import mongoose, { Schema, Document } from 'mongoose';

/**
 * Modelo de Carrera Amistosa
 * Carreras informales creadas por usuarios para correr con amigos
 */

export interface IParticipant {
  userId: mongoose.Types.ObjectId;
  kartNumber: number;
  joinedAt: Date;
}

export interface IFriendlyRace extends Document {
  name: string;
  createdBy: mongoose.Types.ObjectId;
  date: Date;
  time: string;
  participants: IParticipant[];
  maxParticipants: number;
  status: 'open' | 'full' | 'confirmed' | 'started' | 'finished' | 'cancelled';

  // Vinculación con carrera corrida (sistema SpeedPark)
  linkedRaceSessionId?: string; // ID de RaceSessionV0
  raceStatus: 'pending' | 'linked' | 'finalized';

  // Resultados vinculados
  results?: {
    sessionId: string;
    sessionName: string;
    sessionDate: Date;
    linkedAt: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

const participantSchema = new Schema<IParticipant>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
  },
  kartNumber: {
    type: Number,
    min: 1,
    max: 20,
    required: true,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const friendlyRaceSchema = new Schema<IFriendlyRace>({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
    index: true,
  },
  date: {
    type: Date,
    required: true,
    index: true,
  },
  time: {
    type: String,
    required: true,
  },
  participants: [participantSchema],
  maxParticipants: {
    type: Number,
    default: 12,
  },
  status: {
    type: String,
    enum: ['open', 'full', 'confirmed', 'started', 'finished', 'cancelled'],
    default: 'open',
    index: true,
  },

  // Vinculación con carrera corrida
  linkedRaceSessionId: {
    type: String,
    index: true,
  },
  raceStatus: {
    type: String,
    enum: ['pending', 'linked', 'finalized'],
    default: 'pending',
  },

  // Resultados
  results: {
    sessionId: String,
    sessionName: String,
    sessionDate: Date,
    linkedAt: Date,
  },
}, {
  timestamps: true,
  collection: 'friendly_races'  // Nombre correcto de la colección
});

// Índices para búsquedas optimizadas
friendlyRaceSchema.index({ createdBy: 1, date: -1 });
friendlyRaceSchema.index({ date: 1, status: 1 });
friendlyRaceSchema.index({ linkedRaceSessionId: 1 });

const FriendlyRace = mongoose.models.FriendlyRace ||
  mongoose.model<IFriendlyRace>('FriendlyRace', friendlyRaceSchema);

export default FriendlyRace;
