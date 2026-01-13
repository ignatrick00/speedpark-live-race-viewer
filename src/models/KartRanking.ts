import mongoose, { Schema, Document } from 'mongoose';

export interface IKartRankingSnapshot extends Document {
  generatedAt: Date;
  period: string; // "14days"
  rankings: Array<{
    position: number;
    kartNumber: number;
    avgTop10Time: number; // Promedio de top 10 tiempos en ms
    bestTime: number; // Mejor tiempo individual en ms
    totalLaps: number; // Total vueltas en el período
    top10Times: number[]; // Array de los 10 mejores tiempos (para debug/análisis)
  }>;
  totalKartsAnalyzed: number;
  dateRange: {
    from: Date;
    to: Date;
  };
}

const kartRankingSnapshotSchema = new Schema<IKartRankingSnapshot>({
  generatedAt: { type: Date, required: true, default: Date.now },
  period: { type: String, required: true },
  rankings: [{
    position: { type: Number, required: true },
    kartNumber: { type: Number, required: true },
    avgTop10Time: { type: Number, required: true },
    bestTime: { type: Number, required: true },
    totalLaps: { type: Number, required: true },
    top10Times: [{ type: Number }]
  }],
  totalKartsAnalyzed: { type: Number, required: true },
  dateRange: {
    from: { type: Date, required: true },
    to: { type: Date, required: true }
  }
}, { timestamps: true });

// Índice para queries rápidas
kartRankingSnapshotSchema.index({ generatedAt: -1 });
kartRankingSnapshotSchema.index({ period: 1, generatedAt: -1 });

export default mongoose.models.KartRanking || mongoose.model<IKartRankingSnapshot>('KartRanking', kartRankingSnapshotSchema);
