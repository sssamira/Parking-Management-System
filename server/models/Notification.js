import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    forRole: {
      type: String,
      enum: ['admin'],
      default: 'admin',
    },
    type: {
      type: String,
      enum: ['booking_cancelled', 'booking_request'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    link: {
      type: String,
      default: null,
      trim: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userName: {
      type: String,
      default: null,
      trim: true,
    },
    userEmail: {
      type: String,
      default: null,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
