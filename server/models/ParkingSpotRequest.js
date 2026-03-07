import mongoose from 'mongoose';

const parkingSpotRequestSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    parkingLotName: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String,
      required: true,
      trim: true,
    },
    floor: {
      type: Number,
      required: true,
      min: 0,
    },
    vehicleType: {
      type: String,
      enum: ['Car', 'Bike', 'All'],
      default: 'All',
    },
    pricePerHour: {
      type: Number,
      default: 50,
      min: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
    numberOfSpots: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminNote: {
      type: String,
      default: '',
      trim: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    approvedResult: {
      createdLot: {
        type: Boolean,
        default: false,
      },
      createdSpotsCount: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true }
);

parkingSpotRequestSchema.index({ ownerId: 1, status: 1, createdAt: -1 });
parkingSpotRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('ParkingSpotRequest', parkingSpotRequestSchema);
