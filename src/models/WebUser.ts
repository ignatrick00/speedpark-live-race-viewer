import mongoose, { Schema, Document } from 'mongoose';

export interface IWebUser extends Document {
  email: string;
  password: string;
  
  // Email validation
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationSentAt?: Date;

  // Password reset
  passwordResetToken?: string;
  passwordResetExpires?: Date;

  // User profile
  profile: {
    firstName: string;
    lastName: string;
    alias?: string;
    whatsappNumber?: string;
  };
  
  // Karting link system
  kartingLink: {
    personId?: string;
    linkedAt?: Date;
    status: 'pending_first_race' | 'linked' | 'verification_failed';
    speedParkProfile?: any; // Speed Park API data
  };

  // Squadron system
  squadron: {
    squadronId?: mongoose.Types.ObjectId;
    role: 'none' | 'member' | 'captain';
    joinedAt?: Date;
  };

  // Squadron invitations
  invitations: Array<{
    squadronId: mongoose.Types.ObjectId;
    invitedBy: mongoose.Types.ObjectId;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Date;
    respondedAt?: Date;
  }>;

  // Role system (supports multiple roles)
  roles: ('user' | 'organizer' | 'admin' | 'coach')[];

  // Organizer permissions (only if role is 'organizer' or 'admin')
  organizerProfile?: {
    approvedBy?: mongoose.Types.ObjectId; // Admin who approved
    approvedAt?: Date;
    permissions: {
      canCreateChampionships: boolean;
      canApproveSquadrons: boolean;
      canLinkRaces: boolean;
      canModifyStandings: boolean;
    };
    organizationName?: string; // Optional org name
    notes?: string; // Admin notes about this organizer
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
  
  // Email validation
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

  // Password reset
  passwordResetToken: {
    type: String,
    default: null,
  },
  passwordResetExpires: {
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
    whatsappNumber: {
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

  // Squadron system
  squadron: {
    squadronId: {
      type: Schema.Types.ObjectId,
      ref: 'Squadron',
      default: null,
    },
    role: {
      type: String,
      enum: ['none', 'member', 'captain'],
      default: 'none',
    },
    joinedAt: {
      type: Date,
      default: null,
    },
  },

  // Squadron invitations
  invitations: [{
    squadronId: {
      type: Schema.Types.ObjectId,
      ref: 'Squadron',
      required: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: 'WebUser',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  }],

  // Role system (supports multiple roles)
  roles: {
    type: [{
      type: String,
      enum: ['user', 'organizer', 'admin', 'coach'],
    }],
    default: ['user']
  },

  // Organizer permissions (only if role is 'organizer' or 'admin')
  organizerProfile: {
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'WebUser',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    permissions: {
      canCreateChampionships: {
        type: Boolean,
        default: false,
      },
      canApproveSquadrons: {
        type: Boolean,
        default: false,
      },
      canLinkRaces: {
        type: Boolean,
        default: false,
      },
      canModifyStandings: {
        type: Boolean,
        default: false,
      },
    },
    organizationName: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
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
WebUserSchema.virtual('profile.fullName').get(function(this: IWebUser) {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Method to get display name (alias or full name)
WebUserSchema.methods.getDisplayName = function(this: IWebUser) {
  return this.profile.alias || `${this.profile.firstName} ${this.profile.lastName}`;
};

// Method to check if user is linked to karting system
WebUserSchema.methods.isLinked = function(this: IWebUser) {
  return this.kartingLink.status === 'linked' && this.kartingLink.personId;
};

// Prevent duplicate compilation in development
const WebUser = mongoose.models.WebUser || mongoose.model<IWebUser>('WebUser', WebUserSchema);

export default WebUser;