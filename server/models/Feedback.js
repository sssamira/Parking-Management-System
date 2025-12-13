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
  // Keep existing field for backward compatibility
  isResolved: {
    type: Boolean,
    default: false
  },
  // Add status field for more granular control
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved', 'rejected'],
    default: 'pending'
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminResponse: {
    type: String,
    trim: true,
    maxlength: [500, 'Admin response cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
feedbackSchema.index({ user: 1, createdAt: -1 });
feedbackSchema.index({ category: 1, rating: -1 });
feedbackSchema.index({ status: 1, createdAt: -1 });

// Virtual for formatted created date
feedbackSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Keep isResolved in sync with status
feedbackSchema.pre('save', function(next) {
  if (this.status === 'resolved') {
    this.isResolved = true;
    if (!this.resolvedAt) {
      this.resolvedAt = new Date();
    }
  } else {
    this.isResolved = false;
  }
  next();
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;