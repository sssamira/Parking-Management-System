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
    enum: ['booked','completed','cancelled', 'search_query'], 
    default: 'search_query' 
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
  }
}, { timestamps: true });

export default mongoose.model('Booking', bookingSchema);
