import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  comment: {
    type: String,
    required: [true, 'Comment is required'],
    trim: true,
    minlength: [10, 'Comment must be at least 10 characters'],
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['Complaint', 'Suggestion', 'Experience'],
      message: 'Category must be Complaint, Suggestion, or Experience'
    },
    default: 'Experience'
  },
  isResolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
feedbackSchema.index({ user: 1, createdAt: -1 });
feedbackSchema.index({ category: 1, rating: -1 });
feedbackSchema.index({ isResolved: 1, createdAt: -1 });

// Virtual for formatted created date
feedbackSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;