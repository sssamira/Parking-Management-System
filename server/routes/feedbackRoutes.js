import express from 'express';
import { body } from 'express-validator';
import {
  submitFeedback,
  getMyFeedback,
  getAllFeedback
} from '../controllers/feedbackController.js';
import { protect, admin } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

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

export default router;