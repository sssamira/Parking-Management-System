import mongoose from 'mongoose';

const parkingSpotSchema = new mongoose.Schema({
  spotNum: { 
    type: String, 
    required: true, 
    trim: true 
  }, 
  parkinglotName: { 
    type: String, 
    required: true, 
    trim: true 
  }, 
  floor: { 
    type: Number, 
    required: true 
  },
  location: { 
    type: String, 
    required: true 
  }, 
  vehicleType: { 
    type: String, 
    enum: ['Car','Bike','All'], 
    default: 'All' 
  },
  pricePerHour: { 
    type: Number, 
    required: true, 
    default: 50 
  },
  tags: { 
    type: [String], 
    default: [] 
  }
}, { timestamps: true });

parkingSpotSchema.index({ parkinglotName: 1, spotNum: 1 }, { unique: true });

export default mongoose.model('ParkingSpot', parkingSpotSchema);
