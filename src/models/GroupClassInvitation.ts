import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupClassInvitation extends Document {
  // Training class reference
  classId: mongoose.Types.ObjectId;

  // Inviter (who sent the invitation)
  inviterId: mongoose.Types.ObjectId;
  inviterName: string;

  // Invitee (who receives the invitation)
  inviteeEmail: string; // Email to send invitation
  inviteeId?: mongoose.Types.ObjectId; // If registered user
  inviteeName?: string; // Name if they accept

  // Invitation details
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  token: string; // Unique token for accepting/rejecting
  expiresAt: Date;

  // Metadata
  createdAt: Date;
  respondedAt?: Date;
}

const GroupClassInvitationSchema: Schema = new Schema({
  // Training class reference
  classId: {
    type: Schema.Types.ObjectId,
    ref: 'TrainingClass',
    required: true,
  },

  // Inviter (who sent the invitation)
  inviterId: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
  },
  inviterName: {
    type: String,
    required: true,
  },

  // Invitee (who receives the invitation)
  inviteeEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  inviteeId: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
  },
  inviteeName: {
    type: String,
    trim: true,
  },

  // Invitation details
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending',
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
  respondedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Index for querying invitations by class
GroupClassInvitationSchema.index({ classId: 1, status: 1 });

// Index for querying invitations by email
GroupClassInvitationSchema.index({ inviteeEmail: 1, status: 1 });

// Index for querying invitations by inviter
GroupClassInvitationSchema.index({ inviterId: 1 });

export default mongoose.models.GroupClassInvitation || mongoose.model<IGroupClassInvitation>('GroupClassInvitation', GroupClassInvitationSchema);
