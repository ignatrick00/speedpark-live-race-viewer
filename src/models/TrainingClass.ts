import mongoose, { Schema, Document } from 'mongoose';

export interface ITrainingClass extends Document {
  // Coach/Instructor info
  coachId: mongoose.Types.ObjectId;
  coachName: string;

  // Class details
  title: string;
  description?: string;
  specialties: string[]; // e.g., ["Principiantes", "Técnica de Frenado", "Racing Line"]

  // Schedule
  date: Date;
  startTime: string; // Format: "14:00"
  endTime: string;   // Format: "15:00"
  durationMinutes: number;

  // Booking type and capacity
  bookingType: 'individual' | 'group' | 'both'; // Can be booked as individual OR group
  maxGroupCapacity: number; // Max students in group mode (e.g., 4)

  // Pricing
  individualPrice: number;
  groupPricePerPerson: number;

  // Individual booking (if booked as individual, blocks entire slot)
  individualBooking?: {
    studentId: mongoose.Types.ObjectId;
    studentName: string;
    bookedAt: Date;
    status: 'pending' | 'confirmed' | 'cancelled';
  };

  // Group bookings (multiple students can join)
  groupBookings: Array<{
    studentId: mongoose.Types.ObjectId;
    studentName: string;
    bookedAt: Date;
    status: 'pending' | 'confirmed' | 'cancelled';
  }>;

  // Status
  status: 'available' | 'partially_booked' | 'fully_booked' | 'cancelled';

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const TrainingClassSchema: Schema = new Schema({
  // Coach/Instructor info
  coachId: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
  },
  coachName: {
    type: String,
    required: true,
  },

  // Class details
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  specialties: [{
    type: String,
    trim: true,
  }],

  // Schedule
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  durationMinutes: {
    type: Number,
    required: true,
    default: 60,
  },

  // Booking type and capacity
  bookingType: {
    type: String,
    enum: ['individual', 'group', 'both'],
    default: 'both',
  },
  maxGroupCapacity: {
    type: Number,
    required: true,
    default: 4,
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

  // Individual booking
  individualBooking: {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'WebUser',
    },
    studentName: String,
    bookedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
    },
  },

  // Group bookings
  groupBookings: [{
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'WebUser',
      required: true,
    },
    studentName: {
      type: String,
      required: true,
    },
    bookedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
  }],

  // Status
  status: {
    type: String,
    enum: ['available', 'partially_booked', 'fully_booked', 'cancelled'],
    default: 'available',
  },
}, {
  timestamps: true,
});

// Indexes for performance
TrainingClassSchema.index({ coachId: 1, date: 1 });
TrainingClassSchema.index({ date: 1, startTime: 1 });
TrainingClassSchema.index({ status: 1 });

// Method to check if individual booking is available
TrainingClassSchema.methods.isIndividualAvailable = function(this: ITrainingClass) {
  return !this.individualBooking && this.groupBookings.length === 0;
};

// Method to check if group booking is available
TrainingClassSchema.methods.isGroupAvailable = function(this: ITrainingClass) {
  return !this.individualBooking && this.groupBookings.length < this.maxGroupCapacity;
};

// Method to update status based on bookings
TrainingClassSchema.methods.updateStatus = function(this: ITrainingClass) {
  if (this.status === 'cancelled') {
    return;
  }

  if (this.individualBooking) {
    this.status = 'fully_booked';
  } else if (this.groupBookings.length >= this.maxGroupCapacity) {
    this.status = 'fully_booked';
  } else if (this.groupBookings.length > 0) {
    this.status = 'partially_booked';
  } else {
    this.status = 'available';
  }
};

// Prevent duplicate compilation in development
const TrainingClass = mongoose.models.TrainingClass || mongoose.model<ITrainingClass>('TrainingClass', TrainingClassSchema);

export default TrainingClass;
