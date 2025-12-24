import mongoose from 'mongoose';

const parkingSpotSchema = new mongoose.Schema({
  spotNum: {    // A-12
    type: String, 
    required: true, 
    trim: true 
  }, 
  parkingLotName: {  // Bashundhara city, Aarong etc
    type: String, 
    required: true, 
    trim: true 
  }, 
  floor: { 
    type: Number, 
    required: true 
  },
  location: {     // dhanmondi, gulshan, banani etc. So if someone search for a parking spot in dhanmondi that will be filtered by this field.
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

// Pre-save hook to normalize parkingLotName for consistent case handling
parkingSpotSchema.pre('save', function(next) {
  // Normalize parkingLotName: trim and ensure consistent formatting
  if (this.parkingLotName) {
    this.parkingLotName = this.parkingLotName.trim();
  }
  if (this.spotNum) {
    this.spotNum = this.spotNum.trim();
  }
  next();
});

// Unique compound index: ensures no duplicate spot numbers within the same parking lot
// This allows the same spot number in different parking lots (e.g., Spot #1 in "New Market" and Spot #1 in "Apollo Hospital")
parkingSpotSchema.index({ parkingLotName: 1, spotNum: 1 }, { unique: true });

export default mongoose.model('ParkingSpot', parkingSpotSchema);
