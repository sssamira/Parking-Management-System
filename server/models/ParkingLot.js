import mongoose from 'mongoose';

const parkingLotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  address: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['paid', 'free', 'mixed'],
    default: 'paid'
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  amenities: [{
    type: String,
    enum: ['security', 'cctv', 'lighting', 'roofed', 'valet']
  }],
  openingHours: {
    open: {
      type: String,
      default: '06:00'
    },
    close: {
      type: String,
      default: '22:00'
    }
  }, 
  ownerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], default: 'approved' }
}, {
  timestamps: true
});

// Link to ParkingSpot
parkingLotSchema.virtual('spots', {
  ref: 'ParkingSpot',
  localField: 'name',
  foreignField: 'parkingLotName',
  justOne: false
});

const ParkingLot = mongoose.model('ParkingLot', parkingLotSchema);
export default ParkingLot;
