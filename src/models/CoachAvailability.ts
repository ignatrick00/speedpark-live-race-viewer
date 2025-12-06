import mongoose, { Schema, Document } from 'mongoose';

export interface ICoachAvailability extends Document {
  // Coach info
  coachId: mongoose.Types.ObjectId;
  coachName: string;

  // Availability type: 'recurring' for weekly or 'specific' for one-time date
  availabilityType: 'recurring' | 'specific';

  // Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday) - for recurring
  dayOfWeek?: number;

  // Specific date - for one-time availability
  specificDate?: Date;

  // Time range
  startTime: string; // Format: "14:00"
  endTime: string;   // Format: "18:00"

  // Block duration in minutes (how long each class slot is)
  blockDurationMinutes: number; // e.g., 15, 20, 30, 45, 60

  // Pricing
  individualPrice: number;
  groupPricePerPerson: number;
  maxGroupCapacity: number;

  // Status
  isActive: boolean;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const CoachAvailabilitySchema: Schema = new Schema({
  // Coach info
  coachId: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
  },
  coachName: {
    type: String,
    required: true,
  },

  // Availability type
  availabilityType: {
    type: String,
    enum: ['recurring', 'specific'],
    default: 'recurring',
    required: true,
  },

  // Day of week (for recurring)
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6,
  },

  // Specific date (for one-time availability)
  specificDate: {
    type: Date,
  },

  // Time range
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },

  // Block duration
  blockDurationMinutes: {
    type: Number,
    required: true,
    default: 45,
    min: 15,
    max: 120,
  },

  // Pricing
  individualPrice: {
    type: Number,
    required: true,
    default: 45000,
  },
  groupPricePerPerson: {
    type: Number,
    required: true,
    default: 25000,
  },
  maxGroupCapacity: {
    type: Number,
    required: true,
    default: 4,
  },

  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes for performance
CoachAvailabilitySchema.index({ coachId: 1, dayOfWeek: 1 });
CoachAvailabilitySchema.index({ coachId: 1, isActive: 1 });

// Method to generate time slots (in hours) within the availability window
CoachAvailabilitySchema.methods.generateTimeSlots = function(this: ICoachAvailability): string[] {
  const slots: string[] = [];
  const [startHour] = this.startTime.split(':').map(Number);
  const [endHour] = this.endTime.split(':').map(Number);

  for (let hour = startHour; hour < endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
  }

  return slots;
};

// Prevent duplicate compilation in development
const CoachAvailability = mongoose.models.CoachAvailability || mongoose.model<ICoachAvailability>('CoachAvailability', CoachAvailabilitySchema);

export default CoachAvailability;
