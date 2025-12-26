import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
  parkingLotName: {
    type: String,
    required: true,
    trim: true,
  },
  normalizedParkingLotName: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  offerPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  priceAfterOffer: {
    type: Number,
    required: true,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  notes: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

offerSchema.pre('validate', function(next) {
  if (this.parkingLotName) {
    this.normalizedParkingLotName = this.parkingLotName.trim().toLowerCase();
  }

  if (this.startDate && this.endDate && this.startDate > this.endDate) {
    return next(new Error('startDate must be before endDate'));
  }

  return next();
});

offerSchema.index({ normalizedParkingLotName: 1, startDate: 1, endDate: 1 }, { unique: true });

export default mongoose.model('Offer', offerSchema);
