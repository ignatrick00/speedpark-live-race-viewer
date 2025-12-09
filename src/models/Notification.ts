import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'class_cancelled_by_coach' | 'booking_cancelled_by_student' | 'friend_request' | 'friend_request_accepted';
  title: string;
  message: string;
  metadata: {
    classId?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    cancelledBy?: string;
    cancelledByRole?: 'coach' | 'student';
    coachName?: string;
    studentName?: string;
    friendId?: string;
    friendName?: string;
    friendEmail?: string;
  };
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['class_cancelled_by_coach', 'booking_cancelled_by_student', 'friend_request', 'friend_request_accepted'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  metadata: {
    classId: String,
    date: String,
    startTime: String,
    endTime: String,
    cancelledBy: String,
    cancelledByRole: {
      type: String,
      enum: ['coach', 'student'],
    },
    coachName: String,
    studentName: String,
    friendId: String,
    friendName: String,
    friendEmail: String,
  },
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
}, {
  timestamps: true,
});

// Compound index for efficient queries
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// Prevent duplicate compilation in development
const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
