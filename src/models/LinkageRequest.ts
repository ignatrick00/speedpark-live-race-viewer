import mongoose, { Schema, Document } from 'mongoose';

export interface ILinkageRequest extends Document {
  // User making the request
  webUserId: mongoose.Types.ObjectId;

  // Search and selection data
  searchedName: string; // Name the user searched for
  selectedDriverName: string; // Driver name from DriverRaceData
  selectedSessionId: string; // Session they selected to prove identity
  driverRaceDataId: mongoose.Types.ObjectId; // Reference to DriverRaceData document

  // Request status
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';

  // Review information
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId; // Admin WebUser ID who reviewed
  rejectionReason?: string;
  adminNotes?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;

  // User info snapshot (for admin review)
  userSnapshot: {
    email: string;
    firstName: string;
    lastName: string;
  };

  // Driver info snapshot (for admin review)
  driverSnapshot: {
    driverName: string;
    totalRaces: number;
    lastRaceDate?: Date;
    currentLinkStatus: string;
  };
}

const LinkageRequestSchema = new Schema<ILinkageRequest>({
  webUserId: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
    index: true,
  },

  searchedName: {
    type: String,
    required: true,
    trim: true,
  },

  selectedDriverName: {
    type: String,
    required: true,
    trim: true,
  },

  selectedSessionId: {
    type: String,
    required: true,
  },

  driverRaceDataId: {
    type: Schema.Types.ObjectId,
    ref: 'DriverRaceData',
    required: true,
    index: true,
  },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
    index: true,
  },

  reviewedAt: {
    type: Date,
    default: null,
  },

  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    default: null,
  },

  rejectionReason: {
    type: String,
    default: null,
  },

  adminNotes: {
    type: String,
    default: null,
  },

  userSnapshot: {
    email: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
  },

  driverSnapshot: {
    driverName: { type: String, required: true },
    totalRaces: { type: Number, required: true },
    lastRaceDate: Date,
    currentLinkStatus: { type: String, required: true },
  },
}, {
  timestamps: true,
  collection: 'linkage_requests',
});

// Indexes for efficient queries
LinkageRequestSchema.index({ webUserId: 1, status: 1 });
LinkageRequestSchema.index({ status: 1, createdAt: -1 }); // For admin panel
LinkageRequestSchema.index({ driverRaceDataId: 1 });

// Prevent duplicate pending requests for same user
LinkageRequestSchema.index(
  { webUserId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' }
  }
);

// Method to approve request
LinkageRequestSchema.methods.approve = async function(adminId: mongoose.Types.ObjectId) {
  this.status = 'approved';
  this.reviewedAt = new Date();
  this.reviewedBy = adminId;
  await this.save();
};

// Method to reject request
LinkageRequestSchema.methods.reject = async function(
  adminId: mongoose.Types.ObjectId,
  reason?: string
) {
  this.status = 'rejected';
  this.reviewedAt = new Date();
  this.reviewedBy = adminId;
  this.rejectionReason = reason || 'Rechazado por el administrador';
  await this.save();
};

// Static method to get pending requests count
LinkageRequestSchema.statics.getPendingCount = function() {
  return this.countDocuments({ status: 'pending' });
};

const LinkageRequest = mongoose.models.LinkageRequest ||
  mongoose.model<ILinkageRequest>('LinkageRequest', LinkageRequestSchema);

export default LinkageRequest;
