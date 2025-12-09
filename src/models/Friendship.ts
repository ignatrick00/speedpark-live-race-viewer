import mongoose, { Schema, Document } from 'mongoose';

export interface IFriendship extends Document {
  userId: mongoose.Types.ObjectId;
  friendId: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  requestedBy: mongoose.Types.ObjectId; // Who sent the friend request
  createdAt: Date;
  respondedAt?: Date;
}

const FriendshipSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
    index: true,
  },
  friendId: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
    required: true,
    index: true,
  },
  requestedBy: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
  },
  respondedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient queries
FriendshipSchema.index({ userId: 1, friendId: 1 }, { unique: true });
FriendshipSchema.index({ userId: 1, status: 1 });
FriendshipSchema.index({ friendId: 1, status: 1 });

// Prevent duplicate compilation in development
const Friendship = mongoose.models.Friendship || mongoose.model<IFriendship>('Friendship', FriendshipSchema);

export default Friendship;
