import mongoose, { Schema, Document } from 'mongoose';

/**
 * Configuración global del sistema
 * Un solo documento que almacena todas las configuraciones
 */
export interface ISystemConfig extends Document {
  // Validación de tiempos de vuelta
  minLapTime: number; // Tiempo mínimo válido en milisegundos (ej: 35000 = 35s)
  maxLapTime?: number; // Tiempo máximo válido en milisegundos (opcional)

  // Tipo de sesión válida para rankings
  validSessionTypes: string[]; // ej: ['carrera', 'race']

  // Carreras amistosas
  friendlyRaceMaxParticipants: number; // Máximo de participantes permitidos (1-20)

  // Metadata
  lastUpdatedBy?: string; // Email del admin que actualizó
  updatedAt: Date;
  createdAt: Date;
}

const systemConfigSchema = new Schema<ISystemConfig>({
  minLapTime: {
    type: Number,
    required: true,
    default: 35000, // 35 segundos por defecto
    min: 1000 // Mínimo 1 segundo
  },
  maxLapTime: {
    type: Number,
    default: 120000 // 2 minutos por defecto
  },
  validSessionTypes: {
    type: [String],
    default: ['carrera', 'race']
  },
  friendlyRaceMaxParticipants: {
    type: Number,
    default: 12, // 12 participantes por defecto
    min: 1,
    max: 20, // Máximo 20 karts disponibles
    required: true
  },
  lastUpdatedBy: {
    type: String
  }
}, {
  timestamps: true,
  collection: 'system_config'
});

// Método estático para obtener la configuración actual (singleton)
systemConfigSchema.statics.getConfig = async function() {
  let config = await this.findOne();

  // Si no existe, crear configuración por defecto
  if (!config) {
    config = await this.create({
      minLapTime: 35000,
      maxLapTime: 120000,
      validSessionTypes: ['carrera', 'race'],
      friendlyRaceMaxParticipants: 12
    });
  }

  return config;
};

// Método estático para actualizar configuración
systemConfigSchema.statics.updateConfig = async function(updates: Partial<ISystemConfig>) {
  let config = await this.findOne();

  if (!config) {
    config = await this.create(updates);
  } else {
    Object.assign(config, updates);
    await config.save();
  }

  return config;
};

const SystemConfig = mongoose.models.SystemConfig ||
  mongoose.model<ISystemConfig>('SystemConfig', systemConfigSchema);

export default SystemConfig;
