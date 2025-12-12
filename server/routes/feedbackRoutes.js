import express from 'express';
import { body } from 'express-validator';
import {
  submitFeedback,
  getMyFeedback,
  getAllFeedback
} from '../controllers/feedbackController.js';
import { protect, admin } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import Feedback from '../models/Feedback.js';

const router = express.Router();

// Validation for feedback submission
const feedbackValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Comment must be between 10 and 500 characters'),
  body('category')
    .isIn(['Complaint', 'Suggestion', 'Experience'])
    .withMessage('Category must be Complaint, Suggestion, or Experience'),
  handleValidationErrors
];

// All feedback routes require authentication
router.use(protect);

// @route   POST /api/feedback
// @desc    Submit feedback (Module 1 - Member 3)
router.post('/', feedbackValidation, submitFeedback);

// @route   GET /api/feedback/my
// @desc    Get logged in user's feedback
router.get('/my', getMyFeedback);

// @route   GET /api/feedback
// @desc    Get all feedback (admin only)
router.get('/', admin, getAllFeedback);

// ADD THESE NEW ROUTES:

// @route   PUT /api/feedback/:id/status
// @desc    Update feedback status (admin only)
router.put('/:id/status', admin, async (req, res) => {
  try {
    const { status, adminResponse } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'in-progress', 'resolved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    const feedback = await Feedback.findById(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    // Update fields
    feedback.status = status;
    
    if (adminResponse) {
      feedback.adminResponse = adminResponse;
    }
    
    if (status === 'resolved') {
      feedback.resolvedAt = new Date();
      feedback.resolvedBy = req.user._id;
    }
    
    await feedback.save();

    res.json({ 
      success: true, 
      message: `Feedback marked as ${status}`,
      data: feedback 
    });
  } catch (error) {
    console.error('Error updating feedback status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/feedback/:id
// @desc    Update feedback (admin only) - alternative
router.put('/:id', admin, async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    res.json({ 
      success: true, 
      message: 'Feedback updated successfully',
      data: feedback 
    });
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;