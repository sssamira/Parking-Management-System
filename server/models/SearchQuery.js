import mongoose from 'mongoose';

const searchQuerySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
  startTime: {
    type: Date
  },
  endTime: {
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

// Index for better query performance
searchQuerySchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('SearchQuery', searchQuerySchema);




