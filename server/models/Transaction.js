import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  gateway: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'canceled'],
    default: 'pending',
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
  },
  fineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fine',
  },
  tran_id: {
    type: String,
    required: true,
    unique: true,
  },
  sessionkey: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
