import mongoose, { Schema, Document } from 'mongoose';

export interface IWebUser extends Document {
  email: string;
  password: string;
  
  // Email validation (for future implementation)
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationSentAt?: Date;
  
  // User profile
  profile: {
    firstName: string;
    lastName: string;
    alias?: string;
  };
  
  // Karting link system
  kartingLink: {
    personId?: string;
    linkedAt?: Date;
    status: 'pending_first_race' | 'linked' | 'verification_failed';
    speedParkProfile?: any; // Speed Park API data
  };
  
  // Account status
  accountStatus: 'active' | 'suspended' | 'deleted';
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

const WebUserSchema: Schema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    select: false, // Don't return password by default
  },
  
  // Email validation (prepared for future)
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: {
    type: String,
    default: null,
  },
  emailVerificationSentAt: {
    type: Date,
    default: null,
  },
  
  // User profile
  profile: {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    alias: {
      type: String,
      trim: true,
      default: null,
    },
  },
  
  // Karting link system
  kartingLink: {
    personId: {
      type: String,
      default: null,
    },
    linkedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending_first_race', 'linked', 'verification_failed'],
      default: 'pending_first_race',
    },
    speedParkProfile: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  
  // Account status
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active',
  },
  
  // Metadata
  lastLoginAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true, // Auto-creates createdAt and updatedAt
});

// Indexes for performance
WebUserSchema.index({ email: 1 });
WebUserSchema.index({ 'kartingLink.personId': 1 });
WebUserSchema.index({ 'profile.firstName': 1, 'profile.lastName': 1 });

// Virtual for full name
WebUserSchema.virtual('profile.fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Method to get display name (alias or full name)
WebUserSchema.methods.getDisplayName = function() {
  return this.profile.alias || this.profile.fullName;
};

// Method to check if user is linked to karting system
WebUserSchema.methods.isLinked = function() {
  return this.kartingLink.status === 'linked' && this.kartingLink.personId;
};

// Prevent duplicate compilation in development
const WebUser = mongoose.models.WebUser || mongoose.model<IWebUser>('WebUser', WebUserSchema);

export default WebUser;