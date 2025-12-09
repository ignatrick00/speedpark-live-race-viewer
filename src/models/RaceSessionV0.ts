import mongoose, { Schema, Document } from 'mongoose';

/**
 * NUEVA ESTRUCTURA V0 - CENTRADA EN CARRERAS
 * Un documento = Una carrera completa con todos los pilotos
 */

// Interface para una vuelta individual
export interface ILapV0 {
  lapNumber: number;
  time: number; // Tiempo de vuelta en milisegundos
  position: number; // Posición al final de esta vuelta
  timestamp: Date;
  gapToLeader?: string;
  isPersonalBest?: boolean;
}

// Interface para un piloto en la carrera
export interface IDriverInRace {
  driverName: string;
  finalPosition: number; // Posición final en la carrera
  kartNumber: number;
  totalLaps: number; // Total de vueltas completadas por este piloto
  bestTime: number; // Mejor tiempo en ms
  lastTime: number; // Último tiempo en ms
  averageTime: number; // Tiempo promedio en ms
  gapToLeader: string; // Diferencia con el líder

  // Array de TODAS las vueltas de este piloto
  laps: ILapV0[];

  // DEPRECATED: Linking moved to WebUser collection (single source of truth)
  // These fields are kept for backward compatibility but are no longer used
  webUserId?: string;
  personId?: string;
  linkingConfidence?: 'high' | 'medium' | 'low';
  linkingMethod?: 'exact_match' | 'alias_match' | 'manual_link' | 'person_id';
}

// Interface principal del documento de carrera
export interface IRaceSessionV0 extends Document {
  // Identificación única de la carrera
  sessionId: string; // e.g., "[HEAT] 77 - Clasificacion_Wed Dec 04 2024"
  sessionName: string; // e.g., "[HEAT] 77 - Clasificacion"
  sessionDate: Date;
  sessionType: 'clasificacion' | 'carrera' | 'practica' | 'otro';

  // Array de TODOS los pilotos que participaron
  drivers: IDriverInRace[];

  // Metadata de la carrera
  totalDrivers: number; // Cantidad de pilotos
  totalLaps: number; // Suma de todas las vueltas de todos los pilotos
  revenue?: number; // Ingresos (17000 para clasificación)
  processed: boolean; // Si la carrera terminó y se procesó completamente

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Schema para una vuelta
const lapV0Schema = new Schema<ILapV0>({
  lapNumber: { type: Number, required: true },
  time: { type: Number, required: true },
  position: { type: Number, required: true },
  timestamp: { type: Date, required: true },
  gapToLeader: String,
  isPersonalBest: Boolean
}, { _id: false });

// Schema para un piloto en la carrera
const driverInRaceSchema = new Schema<IDriverInRace>({
  driverName: { type: String, required: true },
  finalPosition: { type: Number, required: true },
  kartNumber: { type: Number, required: true },
  totalLaps: { type: Number, default: 0 },
  bestTime: { type: Number, default: 0 },
  lastTime: { type: Number, default: 0 },
  averageTime: { type: Number, default: 0 },
  gapToLeader: { type: String, default: '0.000' },
  laps: [lapV0Schema],
  webUserId: String,
  personId: String,
  linkingConfidence: {
    type: String,
    enum: ['high', 'medium', 'low']
  },
  linkingMethod: {
    type: String,
    enum: ['exact_match', 'alias_match', 'manual_link', 'person_id']
  }
}, { _id: false });

// Schema principal de la carrera
const raceSessionV0Schema = new Schema<IRaceSessionV0>({
  sessionId: {
    type: String,
    required: true,
    unique: true, // Una carrera = un documento único
    index: true
  },
  sessionName: {
    type: String,
    required: true
  },
  sessionDate: {
    type: Date,
    required: true,
    index: true // Para búsquedas por fecha
  },
  sessionType: {
    type: String,
    enum: ['clasificacion', 'carrera', 'practica', 'otro'],
    required: true
  },
  drivers: [driverInRaceSchema],
  totalDrivers: {
    type: Number,
    default: 0
  },
  totalLaps: {
    type: Number,
    default: 0
  },
  revenue: Number,
  processed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true, // Agrega createdAt y updatedAt automáticamente
  collection: 'race_sessions_v0' // Nombre de la colección en MongoDB
});

// Índices para optimizar queries
raceSessionV0Schema.index({ sessionDate: -1 }); // Búsqueda por fecha descendente
raceSessionV0Schema.index({ sessionType: 1 }); // Filtrar por tipo
raceSessionV0Schema.index({ 'drivers.driverName': 1 }); // Buscar por nombre de piloto
raceSessionV0Schema.index({ 'drivers.webUserId': 1 }); // Buscar por usuario web

// Método para recalcular totales
raceSessionV0Schema.methods.recalculateTotals = function() {
  this.totalDrivers = this.drivers.length;
  this.totalLaps = this.drivers.reduce((sum, driver) => sum + driver.totalLaps, 0);

  // Calcular revenue si es clasificación
  if (this.sessionType === 'clasificacion') {
    this.revenue = 17000 * this.totalDrivers;
  }
};

// Método para agregar o actualizar un piloto
raceSessionV0Schema.methods.upsertDriver = function(driverData: Partial<IDriverInRace>) {
  const existingDriverIndex = this.drivers.findIndex(
    (d: IDriverInRace) => d.driverName === driverData.driverName
  );

  if (existingDriverIndex >= 0) {
    // Actualizar piloto existente
    Object.assign(this.drivers[existingDriverIndex], driverData);
  } else {
    // Agregar nuevo piloto
    this.drivers.push(driverData as IDriverInRace);
  }

  this.recalculateTotals();
};

// Export del modelo
const RaceSessionV0 = mongoose.models.RaceSessionV0 ||
  mongoose.model<IRaceSessionV0>('RaceSessionV0', raceSessionV0Schema);

export default RaceSessionV0;
