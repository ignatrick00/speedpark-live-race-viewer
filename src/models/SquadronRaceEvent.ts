import mongoose, { Schema, Document } from 'mongoose';

/**
 * MODELO: SquadronRaceEvent
 * Representa un evento de puntuación basado en resultados de carreras reales
 * Diferente de SquadronEvent que es para eventos planificados con inscripciones
 */

export type RaceEventCategory = 'Grand Prix Élite' | 'Racing Masters' | 'Pro Championship' | 'Open Series';
export type RaceEventStatus = 'pending' | 'calculated' | 'finalized';

// Resultado de un piloto individual en el evento
export interface IPilotResult {
  webUserId: string;
  driverName: string;
  finalPosition: number; // Posición en la carrera
  individualPoints: number; // Puntos según tabla (1°=25, 2°=22, etc.)
  kartNumber: number;
}

// Resultado de una escudería en el evento
export interface ISquadronRaceResult {
  squadronId: mongoose.Types.ObjectId;
  squadronName: string;
  position: number; // Posición final de la escudería en el evento (1°, 2°, 3°...)
  totalPoints: number; // Suma de puntos de todos los pilotos
  pilots: IPilotResult[]; // Pilotos que participaron
  pointsAwarded: number; // Puntos otorgados según % del basePoints
  percentageAwarded: number; // % otorgado (100%, 65%, 45%, etc.)
}

export interface ISquadronRaceEvent extends Document {
  eventId: string; // ID único del evento
  eventName: string; // Nombre descriptivo
  eventCategory: RaceEventCategory; // Categoría del evento
  basePoints: number; // Puntos base según categoría (2500, 1500, 800, 400)
  eventDate: Date; // Fecha del evento
  raceSessionId: string; // Referencia a RaceSessionV0
  raceSessionName: string; // Nombre de la carrera seleccionada
  status: RaceEventStatus; // Estado del evento
  results: ISquadronRaceResult[]; // Resultados de escuderías
  createdBy: mongoose.Types.ObjectId; // Organizador que creó el evento
  finalizedBy?: mongoose.Types.ObjectId; // Organizador que finalizó
  finalizedAt?: Date; // Fecha de finalización
  notes?: string; // Notas del organizador
  createdAt: Date;
  updatedAt: Date;
}

const pilotResultSchema = new Schema<IPilotResult>({
  webUserId: { type: String, required: true },
  driverName: { type: String, required: true },
  finalPosition: { type: Number, required: true },
  individualPoints: { type: Number, required: true },
  kartNumber: { type: Number, required: true }
}, { _id: false });

const squadronRaceResultSchema = new Schema<ISquadronRaceResult>({
  squadronId: { type: Schema.Types.ObjectId, ref: 'Squadron', required: true },
  squadronName: { type: String, required: true },
  position: { type: Number, required: true },
  totalPoints: { type: Number, required: true },
  pilots: [pilotResultSchema],
  pointsAwarded: { type: Number, required: true },
  percentageAwarded: { type: Number, required: true }
}, { _id: false });

const SquadronRaceEventSchema = new Schema<ISquadronRaceEvent>({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  eventName: {
    type: String,
    required: true,
    trim: true
  },
  eventCategory: {
    type: String,
    enum: ['Grand Prix Élite', 'Racing Masters', 'Pro Championship', 'Open Series'],
    required: true
  },
  basePoints: {
    type: Number,
    required: true,
    min: 0
  },
  eventDate: {
    type: Date,
    required: true,
    index: true
  },
  raceSessionId: {
    type: String,
    required: true,
    index: true
  },
  raceSessionName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'calculated', 'finalized'],
    default: 'pending',
    index: true
  },
  results: [squadronRaceResultSchema],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true
  },
  finalizedBy: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser'
  },
  finalizedAt: Date,
  notes: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Índices compuestos
SquadronRaceEventSchema.index({ eventCategory: 1, eventDate: -1 });
SquadronRaceEventSchema.index({ status: 1, eventDate: -1 });
SquadronRaceEventSchema.index({ raceSessionId: 1 }); // Para evitar duplicados

// Método para obtener puntos base según categoría
SquadronRaceEventSchema.statics.getBasePointsForCategory = function(category: RaceEventCategory): number {
  const pointsMap: Record<RaceEventCategory, number> = {
    'Grand Prix Élite': 2500,
    'Racing Masters': 1500,
    'Pro Championship': 800,
    'Open Series': 400
  };
  return pointsMap[category];
};

// Método para obtener porcentaje de puntos según posición
SquadronRaceEventSchema.statics.getPercentageForPosition = function(position: number): number {
  if (position === 1) return 100;
  if (position === 2) return 65;
  if (position === 3) return 45;
  if (position === 4) return 30;
  if (position >= 5 && position <= 8) return 20;
  if (position >= 9 && position <= 16) return 10;
  return 5; // 17 en adelante
};

// Método para obtener puntos individuales según posición en carrera
SquadronRaceEventSchema.statics.getIndividualPointsForPosition = function(position: number): number {
  const pointsTable: Record<number, number> = {
    1: 25, 2: 22, 3: 20, 4: 18, 5: 16, 6: 15, 7: 14, 8: 13, 9: 12, 10: 11,
    11: 10, 12: 9, 13: 8, 14: 7, 15: 6, 16: 5, 17: 4, 18: 3, 19: 2, 20: 1
  };
  return pointsTable[position] || 0;
};

export default mongoose.models.SquadronRaceEvent || mongoose.model<ISquadronRaceEvent>('SquadronRaceEvent', SquadronRaceEventSchema);
