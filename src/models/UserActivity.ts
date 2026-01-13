import mongoose, { Schema, Document } from 'mongoose';

export interface IUserActivity extends Document {
  userId?: mongoose.Types.ObjectId;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  isAuthenticated: boolean;
  page: string;
  action: string;
  timestamp: Date;
  geolocation?: {
    country?: string;
    city?: string;
    region?: string;
    lat?: number;
    lon?: number;
  };
  metadata?: any;
}

const UserActivitySchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    default: null
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  userAgent: {
    type: String,
    required: true
  },
  isAuthenticated: {
    type: Boolean,
    default: false,
    index: true
  },
  page: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    default: 'page_view'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  geolocation: {
    country: String,
    city: String,
    region: String,
    lat: Number,
    lon: Number
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
});

// TTL Index: Borrar documentos después de 30 días
UserActivitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

// Compound indexes para queries comunes
UserActivitySchema.index({ timestamp: -1, isAuthenticated: 1 });
UserActivitySchema.index({ sessionId: 1, timestamp: -1 });
UserActivitySchema.index({ userId: 1, timestamp: -1 });

export default mongoose.models.UserActivity || mongoose.model<IUserActivity>('UserActivity', UserActivitySchema);
