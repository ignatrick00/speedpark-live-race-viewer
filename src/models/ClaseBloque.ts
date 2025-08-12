import mongoose, { Schema, Document } from 'mongoose';

export interface IClaseBloque extends Document {
  instructorId: string;
  
  // Schedule
  date: Date;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  duration: number;  // in minutes
  
  // Class configuration
  isGroupClass: boolean;
  maxCapacity: number;
  currentBookings: number;
  
  // Pricing
  pricePerPerson: number;
  
  // Class details
  title?: string;
  description?: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
  
  // Status
  status: 'available' | 'full' | 'cancelled' | 'completed';
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const ClaseBloqueSchema: Schema = new Schema({
  instructorId: {
    type: Schema.Types.ObjectId,
    ref: 'Instructor',
    required: true,
  },
  
  // Schedule
  date: {
    type: Date,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  duration: {
    type: Number,
    required: true,
    min: 30, // minimum 30 minutes
    default: 60, // default 1 hour
  },
  
  // Class configuration
  isGroupClass: {
    type: Boolean,
    default: true,
  },
  maxCapacity: {
    type: Number,
    required: true,
    min: 1,
    default: 6,
  },
  currentBookings: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // Pricing
  pricePerPerson: {
    type: Number,
    required: true,
    min: 0,
  },
  
  // Class details
  title: {
    type: String,
    trim: true,
    default: null,
  },
  description: {
    type: String,
    trim: true,
    default: null,
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'all'],
    default: 'all',
  },
  
  // Status
  status: {
    type: String,
    enum: ['available', 'full', 'cancelled', 'completed'],
    default: 'available',
  },
}, {
  timestamps: true,
});

// Indexes for performance
ClaseBloqueSchema.index({ instructorId: 1 });
ClaseBloqueSchema.index({ date: 1 });
ClaseBloqueSchema.index({ status: 1 });
ClaseBloqueSchema.index({ date: 1, startTime: 1 });
ClaseBloqueSchema.index({ instructorId: 1, date: 1 });

// Virtual for availability check
ClaseBloqueSchema.virtual('isAvailable').get(function(this: IClaseBloque) {
  return this.status === 'available' && this.currentBookings < this.maxCapacity && this.date >= new Date();
});

// Virtual for remaining spots
ClaseBloqueSchema.virtual('spotsRemaining').get(function(this: IClaseBloque) {
  return this.maxCapacity - this.currentBookings;
});

// Method to check if class can accept more bookings
ClaseBloqueSchema.methods.canAcceptBookings = function(this: IClaseBloque, requestedSpots: number = 1) {
  return this.status === 'available' && 
         this.currentBookings + requestedSpots <= this.maxCapacity &&
         this.date >= new Date();
};

// Method to add booking
ClaseBloqueSchema.methods.addBooking = function(this: IClaseBloque, spots: number = 1) {
  if (this.canAcceptBookings(spots)) {
    this.currentBookings += spots;
    if (this.currentBookings >= this.maxCapacity) {
      this.status = 'full';
    }
    return true;
  }
  return false;
};

// Method to remove booking
ClaseBloqueSchema.methods.removeBooking = function(this: IClaseBloque, spots: number = 1) {
  this.currentBookings = Math.max(0, this.currentBookings - spots);
  if (this.status === 'full' && this.currentBookings < this.maxCapacity) {
    this.status = 'available';
  }
};

// Method to get formatted date and time
ClaseBloqueSchema.methods.getFormattedDateTime = function(this: IClaseBloque) {
  return {
    date: this.date.toLocaleDateString('es-CL'),
    time: `${this.startTime} - ${this.endTime}`,
    dayOfWeek: this.date.toLocaleDateString('es-CL', { weekday: 'long' })
  };
};

// Prevent duplicate compilation in development
const ClaseBloque = mongoose.models.ClaseBloque || mongoose.model<IClaseBloque>('ClaseBloque', ClaseBloqueSchema);

export default ClaseBloque;