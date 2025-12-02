import mongoose, { Schema, Document } from 'mongoose';

export interface IJoinRequest extends Document {
  squadronId: mongoose.Types.ObjectId;
  pilotId: mongoose.Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: mongoose.Types.ObjectId;
}

const JoinRequestSchema = new Schema<IJoinRequest>({
  squadronId: {
    type: Schema.Types.ObjectId,
    ref: 'Squadron',
    required: true,
  },
  pilotId: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  message: {
    type: String,
    maxlength: 500,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  resolvedAt: {
    type: Date,
  },
  resolvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
  },
});

// Índice compuesto para evitar solicitudes duplicadas
JoinRequestSchema.index({ squadronId: 1, pilotId: 1, status: 1 });

const JoinRequest = mongoose.models.JoinRequest || mongoose.model<IJoinRequest>('JoinRequest', JoinRequestSchema);

export default JoinRequest;
