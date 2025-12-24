import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  parkingSpot: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ParkingSpot', 
    required: false 
  },
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  vehicle: {
    licensePlate: { type: String },
    carType: { type: String }
  },
  startTime: { 
    type: Date, 
    required: false 
  },
  endTime: { 
    type: Date, 
    required: false 
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'booked', 'completed', 'cancelled', 'search_query'], 
    default: 'pending' 
  },
  discountApplied: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Discount', 
    default: null 
  },
  price: { 
    type: Number, 
    required: false,
    default: 0
  },
  // Search query details
  parkingLotName: {
    type: String,
    trim: true
  },
  // Keep location for backward compatibility (deprecated, use parkingLotName)
  location: {
    type: String,
    trim: true
  },
  vehicleType: {
    type: String,
    enum: ['Car', 'Bike', 'All', ''],
    default: ''
  },
  date: {
    type: Date
  },
  carModel: {
    type: String,
    trim: true
  },
  driverName: {
    type: String,
    trim: true
  },
  licenseNumber: {
    type: String,
    trim: true
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date
  },
  emailError: {
    type: String
  },
  paidUntil: { 
    type: Date,
    required: false
  },
  fineIssued: {
    type: Boolean,
    default: false
  },
  fineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fine',
    default: null
  },
  // Entry/Exit Tracking
  actualEntryTime: {
    type: Date,
    default: null
  },
  actualExitTime: {
    type: Date,
    default: null
  },
  // Payment Tracking
  actualPrice: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentIntentId: {
    type: String,
    default: null
  },
  paymentMethodId: {
    type: String,
    default: null
  },
  chargedAt: {
    type: Date,
    default: null
  },
  paymentError: {
    type: String,
    default: null
  }

}, { timestamps: true });

export default mongoose.model('Booking', bookingSchema);
