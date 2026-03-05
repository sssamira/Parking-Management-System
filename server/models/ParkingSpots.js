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
  area: {         // Alias for location, used by some database indexes (area_1_spotNum_1)
    type: String,
    required: false,
    default: function() {
      // Default to location or parkingLotName to avoid null values
      return this.location || this.parkingLotName || 'default';
    }
  }, 
  vehicleType: { 
    type: String, 
    enum: ['Car', 'Bus', 'Bike', 'Vaan', 'Ambulance', 'Fire Ambulance', 'Security Force Vehicles'], 
    default: 'Car' 
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
  // CRITICAL: Never allow parkingLotName to be null/undefined/empty
  if (!this.parkingLotName || this.parkingLotName.trim() === '') {
    console.error('❌ Error: parkingLotName is null/empty in pre-save hook. This should never happen!');
    // Set a default value to prevent database errors
    this.parkingLotName = this.location || 'default';
  } else {
    this.parkingLotName = this.parkingLotName.trim();
  }
  
  if (this.spotNum) {
    this.spotNum = this.spotNum.trim();
  }
  
  // Ensure area field is set to location value (never null) to avoid conflicts with area_1_spotNum_1 index
  if (!this.area && this.location) {
    this.area = this.location;
  } else if (!this.area && this.parkingLotName) {
    this.area = this.parkingLotName;
  } else if (!this.area) {
    this.area = 'default';
  }
  
  // Final safety check: ensure parkingLotName is never null
  if (!this.parkingLotName || this.parkingLotName.trim() === '') {
    this.parkingLotName = 'default';
  }
  
  next();
});

// Unique compound index: ensures no duplicate spot numbers within the same parking lot
// This allows the same spot number in different parking lots (e.g., Spot #1 in "New Market" and Spot #1 in "Apollo Hospital")
parkingSpotSchema.index({ parkingLotName: 1, spotNum: 1 }, { unique: true });

export default mongoose.model('ParkingSpot', parkingSpotSchema);
