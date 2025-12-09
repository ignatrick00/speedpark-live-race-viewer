import mongoose, { Schema, Document } from 'mongoose';

/**
 * MODELO: RaceSanction
 * Registro de sanciones aplicadas a pilotos en carreras de eventos de escuadrones
 */

export interface IRaceSanction extends Document {
  eventId: mongoose.Types.ObjectId; // Evento de escuadrón
  raceSessionId: string; // sessionId de la carrera en race_sessions_v0
  driverName: string; // Nombre del piloto en SMS-Timing
  webUserId: string; // Usuario vinculado
  sanctionType: 'position_penalty' | 'point_deduction' | 'disqualification' | 'warning';
  description: string; // Razón de la sanción
  positionPenalty?: number; // Número de posiciones a bajar (ej: +3 posiciones)
  pointsPenalty?: number; // Puntos a deducir de la escudería
  appliedBy: mongoose.Types.ObjectId; // Organizador que aplicó la sanción
  appliedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RaceSanctionSchema = new Schema<IRaceSanction>({
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'SquadronEvent',
    required: true,
    index: true
  },
  raceSessionId: {
    type: String,
    required: true,
    index: true
  },
  driverName: {
    type: String,
    required: true,
    trim: true
  },
  webUserId: {
    type: String,
    required: true,
    index: true
  },
  sanctionType: {
    type: String,
    enum: ['position_penalty', 'point_deduction', 'disqualification', 'warning'],
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  positionPenalty: {
    type: Number,
    min: 0,
    default: null
  },
  pointsPenalty: {
    type: Number,
    min: 0,
    default: null
  },
  appliedBy: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true
  },
  appliedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices compuestos
RaceSanctionSchema.index({ eventId: 1, raceSessionId: 1 });
RaceSanctionSchema.index({ webUserId: 1, appliedAt: -1 });
RaceSanctionSchema.index({ sanctionType: 1, createdAt: -1 });

// Prevenir duplicación en desarrollo
export default mongoose.models.RaceSanction ||
  mongoose.model<IRaceSanction>('RaceSanction', RaceSanctionSchema);
