import mongoose, { Schema, Document } from 'mongoose';

/**
 * MODELO: SquadronPointsHistory
 * Registro de auditoría para cambios en puntos de escuderías
 */

export interface ISquadronPointsHistory extends Document {
  squadronId: mongoose.Types.ObjectId; // Escudería afectada
  raceEventId?: mongoose.Types.ObjectId; // Evento de carrera (si aplica)
  pointsChange: number; // Cantidad de puntos añadidos (+) o removidos (-)
  previousTotal: number; // Puntos totales antes del cambio
  newTotal: number; // Puntos totales después del cambio
  reason: string; // Descripción del cambio
  changeType: 'race_event' | 'manual_adjustment' | 'penalty' | 'bonus' | 'revert';
  modifiedBy: mongoose.Types.ObjectId; // Usuario que hizo el cambio (organizador)
  metadata?: {
    eventName?: string;
    eventCategory?: string;
    position?: number;
    raceSessionId?: string;
  };
  createdAt: Date;
}

const SquadronPointsHistorySchema = new Schema<ISquadronPointsHistory>({
  squadronId: {
    type: Schema.Types.ObjectId,
    ref: 'Squadron',
    required: true,
    index: true
  },
  raceEventId: {
    type: Schema.Types.ObjectId,
    ref: 'SquadronRaceEvent',
    index: true
  },
  pointsChange: {
    type: Number,
    required: true
  },
  previousTotal: {
    type: Number,
    required: true,
    min: 0
  },
  newTotal: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  changeType: {
    type: String,
    enum: ['race_event', 'manual_adjustment', 'penalty', 'bonus', 'revert'],
    required: true,
    index: true
  },
  modifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true
  },
  metadata: {
    eventName: String,
    eventCategory: String,
    position: Number,
    raceSessionId: String
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Solo createdAt
});

// Índices compuestos
SquadronPointsHistorySchema.index({ squadronId: 1, createdAt: -1 });
SquadronPointsHistorySchema.index({ raceEventId: 1 });
SquadronPointsHistorySchema.index({ changeType: 1, createdAt: -1 });

export default mongoose.models.SquadronPointsHistory ||
  mongoose.model<ISquadronPointsHistory>('SquadronPointsHistory', SquadronPointsHistorySchema);
