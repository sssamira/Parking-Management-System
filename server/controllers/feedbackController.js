import Feedback from '../models/Feedback.js';

// @desc    Submit feedback (Module 1 - Member 3)
// @route   POST /api/feedback
// @access  Private
export const submitFeedback = async (req, res) => {
  try {
    const { rating, comment, category } = req.body;
    const userId = req.user.id; // From auth middleware

    // Validation
    if (!rating || !comment || !category) {
      return res.status(400).json({ 
        success: false,
        message: 'All fields (rating, comment, category) are required' 
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false,
        message: 'Rating must be between 1 and 5' 
      });
    }

    const allowedCategories = ['Complaint', 'Suggestion', 'Experience'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ 
        success: false,
        message: 'Category must be Complaint, Suggestion, or Experience' 
      });
    }

    // Create feedback
    const feedback = await Feedback.create({
      user: userId,
      rating,
      comment,
      category
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback
    });

  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback. Please try again.'
    });
  }
};

// @desc    Get user's own feedback (Module 1 - Member 3)
// @route   GET /api/feedback/my
// @access  Private
export const getMyFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ user: req.user.id })
      .sort('-createdAt')
      .select('-__v');

    res.json({
      success: true,
      count: feedbacks.length,
      data: feedbacks
    });

  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback'
    });
  }
};

// @desc    Get all feedback for admin (Module 1 - Member 3)
// @route   GET /api/feedback
// @access  Private/Admin
export const getAllFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({})
      .sort('-createdAt')
      .populate('user', 'name email')
      .select('-__v');

    // Calculate statistics
    const stats = {
      total: feedbacks.length,
      complaints: feedbacks.filter(f => f.category === 'Complaint').length,
      suggestions: feedbacks.filter(f => f.category === 'Suggestion').length,
      experiences: feedbacks.filter(f => f.category === 'Experience').length,
      resolved: feedbacks.filter(f => f.isResolved).length,
      averageRating: feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length || 0
    };

    res.json({
      success: true,
      count: feedbacks.length,
      stats,
      data: feedbacks
    });

  } catch (error) {
    console.error('Get all feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback'
    });
  }
};