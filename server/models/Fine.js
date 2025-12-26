import mongoose from 'mongoose';

const fineSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  licensePlate: {
    type: String,
    required: true
  },
  checkInTime: {
    type: Date,
    required: true
  },
  paidUntil: {
    type: Date,
    required: true
  },
  actualExitTime: {
    type: Date
  },
  overtimeHours: {
    type: Number,
    default: 0
  },
  hourlyRate: {
    type: Number,
    default: 10 // $10 per overtime hour
  },
  fineAmount: {
    type: Number,
    default: 0
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  paidAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['pending', 'issued', 'paid', 'waived'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'cash', 'bank_transfer', 'mobile_banking'],
    default: 'card'
  },
  transactionId: {
    type: String,
    default: null
  },
  paymentIntentId: {
    type: String,
    default: null
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  stripeCustomerId: {
    type: String,
    default: null
  },
  paymentMethodId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

export default mongoose.model('Fine', fineSchema);