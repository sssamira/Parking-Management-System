import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  parkingSpot: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ParkingSpot', 
    required: true 
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
    required: true 
  },
  endTime: { 
    type: Date, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['booked','completed','cancelled'], 
    default: 'booked' 
  },
  discountApplied: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Discount', 
    default: null 
  },
  price: { 
    type: Number, 
    required: true 
  }
}, { timestamps: true });

export default mongoose.model('Booking', bookingSchema);
