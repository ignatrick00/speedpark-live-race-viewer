import mongoose, { Schema, Document } from 'mongoose';

export interface IInstructor extends Document {
  name: string;
  email: string;
  phone?: string;
  photo?: string;
  
  // Professional info
  specialties: string[];
  experience: string;
  rating: number;
  totalClasses: number;
  
  // Availability
  availableDays: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  availableHours: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  
  // Pricing
  pricePerHourIndividual: number;
  pricePerHourGroup: number;
  
  // Status
  isActive: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const InstructorSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    trim: true,
    default: null,
  },
  photo: {
    type: String,
    default: null,
  },
  
  // Professional info
  specialties: [{
    type: String,
    required: true,
  }],
  experience: {
    type: String,
    required: true,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  totalClasses: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Availability
  availableDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  }],
  availableHours: {
    start: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
    end: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    },
  },
  
  // Pricing
  pricePerHourIndividual: {
    type: Number,
    required: true,
    min: 0,
  },
  pricePerHourGroup: {
    type: Number,
    required: true,
    min: 0,
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
InstructorSchema.index({ email: 1 });
InstructorSchema.index({ isActive: 1 });
InstructorSchema.index({ specialties: 1 });
InstructorSchema.index({ rating: -1 });

// Method to check availability for a specific day
InstructorSchema.methods.isAvailableOnDay = function(this: IInstructor, dayOfWeek: string) {
  return this.isActive && this.availableDays.includes(dayOfWeek as any);
};

// Method to get formatted rating
InstructorSchema.methods.getFormattedRating = function(this: IInstructor) {
  return this.rating.toFixed(1);
};

// Prevent duplicate compilation in development
const Instructor = mongoose.models.Instructor || mongoose.model<IInstructor>('Instructor', InstructorSchema);

export default Instructor;