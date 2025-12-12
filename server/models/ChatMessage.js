import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['user', 'admin'], required: true },
    sender: { type: String, default: '' },
    message: { type: String, required: true, trim: true },
    readByUser: { type: Boolean, default: false },
    readByAdmin: { type: Boolean, default: false }
  },
  { timestamps: true }
);

chatMessageSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('ChatMessage', chatMessageSchema);