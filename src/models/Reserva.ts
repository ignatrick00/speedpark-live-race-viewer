import mongoose, { Schema, Document } from 'mongoose';

export interface IReserva extends Document {
  userId: string;
  claseBloqueId: string;
  
  // Booking details
  spotsReserved: number;
  totalAmount: number;
  
  // Student information
  studentInfo: {
    name: string;
    email?: string;
    phone?: string;
    emergencyContact?: {
      name: string;
      phone: string;
    };
  };
  
  // Payment information
  payment: {
    status: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
    method?: 'transbank' | 'transfer' | 'cash';
    transactionId?: string;
    paidAt?: Date;
    refundedAt?: Date;
    amount: number;
  };
  
  // Booking status
  bookingStatus: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  
  // Additional information
  specialRequirements?: string;
  notes?: string;
  
  // Timestamps
  bookedAt: Date;
  cancelledAt?: Date;
  completedAt?: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual properties
  isPaid: boolean;
  isActive: boolean;
  
  // Methods
  cancel(): boolean;
  complete(): boolean;
  markAsPaid(transactionId: string, method: string): void;
  processRefund(): boolean;
  getBookingInfo(): {
    spotsReserved: number;
    totalAmount: number;
    studentName: string;
    isPaid: boolean;
    isActive: boolean;
    status: string;
    paymentStatus: string;
  };
}

const ReservaSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'WebUser',
    required: true,
  },
  claseBloqueId: {
    type: Schema.Types.ObjectId,
    ref: 'ClaseBloque',
    required: true,
  },
  
  // Booking details
  spotsReserved: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  
  // Student information
  studentInfo: {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    emergencyContact: {
      name: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
    },
  },
  
  // Payment information
  payment: {
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
    },
    method: {
      type: String,
      enum: ['transbank', 'transfer', 'cash'],
      default: null,
    },
    transactionId: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  
  // Booking status
  bookingStatus: {
    type: String,
    enum: ['confirmed', 'cancelled', 'completed', 'no_show'],
    default: 'confirmed',
  },
  
  // Additional information
  specialRequirements: {
    type: String,
    trim: true,
    default: null,
  },
  notes: {
    type: String,
    trim: true,
    default: null,
  },
  
  // Timestamps
  bookedAt: {
    type: Date,
    default: Date.now,
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes for performance
ReservaSchema.index({ userId: 1 });
ReservaSchema.index({ claseBloqueId: 1 });
ReservaSchema.index({ 'payment.status': 1 });
ReservaSchema.index({ bookingStatus: 1 });
ReservaSchema.index({ bookedAt: -1 });
ReservaSchema.index({ userId: 1, bookedAt: -1 });

// Virtual for checking if payment is completed
ReservaSchema.virtual('isPaid').get(function(this: IReserva) {
  return this.payment.status === 'paid';
});

// Virtual for checking if booking is active
ReservaSchema.virtual('isActive').get(function(this: IReserva) {
  return this.bookingStatus === 'confirmed' && this.payment.status === 'paid';
});

// Method to cancel booking
ReservaSchema.methods.cancel = function(this: IReserva) {
  if (this.bookingStatus === 'confirmed') {
    this.bookingStatus = 'cancelled';
    this.cancelledAt = new Date();
    
    // Update payment status if needed
    if (this.payment.status === 'pending') {
      this.payment.status = 'cancelled';
    }
    
    return true;
  }
  return false;
};

// Method to complete booking
ReservaSchema.methods.complete = function(this: IReserva) {
  if (this.bookingStatus === 'confirmed' && this.isPaid) {
    this.bookingStatus = 'completed';
    this.completedAt = new Date();
    return true;
  }
  return false;
};

// Method to mark payment as paid
ReservaSchema.methods.markAsPaid = function(this: IReserva, transactionId: string, method: string) {
  this.payment.status = 'paid';
  this.payment.paidAt = new Date();
  this.payment.transactionId = transactionId;
  this.payment.method = method as any;
};

// Method to process refund
ReservaSchema.methods.processRefund = function(this: IReserva) {
  if (this.payment.status === 'paid') {
    this.payment.status = 'refunded';
    this.payment.refundedAt = new Date();
    return true;
  }
  return false;
};

// Method to get formatted booking info
ReservaSchema.methods.getBookingInfo = function(this: IReserva) {
  return {
    spotsReserved: this.spotsReserved,
    totalAmount: this.totalAmount,
    studentName: this.studentInfo.name,
    isPaid: this.isPaid,
    isActive: this.isActive,
    status: this.bookingStatus,
    paymentStatus: this.payment.status
  };
};

// Prevent duplicate compilation in development
const Reserva = mongoose.models.Reserva || mongoose.model<IReserva>('Reserva', ReservaSchema);

export default Reserva;