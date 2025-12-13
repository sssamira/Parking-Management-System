import express from 'express';
import Fine from '../models/Fine.js';
import FineCalculator from '../utils/fineCalculator.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();
const fineCalculator = new FineCalculator();

// @route   GET /api/fines/overtime-check
// @desc    Check for overtime vehicles and issue fines
// @access  Admin
router.get('/overtime-check', protect, admin, async (req, res) => {
  try {
    const fines = await fineCalculator.checkOvertimeVehicles();
    
    res.json({
      success: true,
      message: `Issued ${fines.length} fines for overtime vehicles`,
      data: fines
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/fines
// @desc    Get all fines
// @access  Admin
router.get('/', protect, admin, async (req, res) => {
  try {
    const fines = await Fine.find()
      .populate('bookingId', 'startTime endTime vehicle licensePlate')
      .populate('userId', 'name email')
      .sort({ issuedAt: -1 });

    res.json({ success: true, count: fines.length, data: fines });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/fines/:id
// @desc    Get single fine
// @access  Admin
router.get('/:id', protect, admin, async (req, res) => {
  try {
    const fine = await Fine.findById(req.params.id)
      .populate('bookingId', 'startTime endTime vehicle licensePlate')
      .populate('userId', 'name email');

    if (!fine) {
      return res.status(404).json({ success: false, message: 'Fine not found' });
    }

    res.json({ success: true, data: fine });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/fines/:id/pay
// @desc    Mark fine as paid
// @access  Admin
router.put('/:id/pay', protect, admin, async (req, res) => {
  try {
    const fine = await Fine.findById(req.params.id);

    if (!fine) {
      return res.status(404).json({ success: false, message: 'Fine not found' });
    }

    fine.isPaid = true;
    fine.paidAt = new Date();
    fine.status = 'paid';
    await fine.save();

    res.json({ 
      success: true, 
      message: 'Fine marked as paid',
      data: fine 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/fines/:id/waive
// @desc    Waive fine
// @access  Admin
router.put('/:id/waive', protect, admin, async (req, res) => {
  try {
    const fine = await Fine.findById(req.params.id);

    if (!fine) {
      return res.status(404).json({ success: false, message: 'Fine not found' });
    }

    fine.status = 'waived';
    fine.isPaid = false;
    await fine.save();

    res.json({ 
      success: true, 
      message: 'Fine waived',
      data: fine 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/fines/my-fines
// @desc    Get fines for the logged-in user
// @access  Private (any authenticated user)
router.get('/my-fines', protect, async (req, res) => {
    try {
      const fines = await Fine.find({ userId: req.user._id })
        .populate('bookingId', 'startTime endTime vehicle parkingLotName')
        .sort({ issuedAt: -1 });
  
      res.json({ 
        success: true, 
        count: fines.length, 
        data: fines 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });
  
  // @route   PUT /api/fines/:id/pay-by-user
  // @desc    User pays their fine
  // @access  Private (user can only pay their own fines)
  router.put('/:id/pay-by-user', protect, async (req, res) => {
    try {
      const fine = await Fine.findById(req.params.id);
  
      if (!fine) {
        return res.status(404).json({ success: false, message: 'Fine not found' });
      }
  
      // Check if fine belongs to user
      if (fine.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not authorized to pay this fine' 
        });
      }
  
      // Check if already paid
      if (fine.isPaid) {
        return res.status(400).json({ 
          success: false, 
          message: 'Fine is already paid' 
        });
      }
  
      // Mark as paid
      fine.isPaid = true;
      fine.paidAt = new Date();
      fine.status = 'paid';
      await fine.save();
  
      res.json({ 
        success: true, 
        message: 'Fine paid successfully',
        data: fine 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

export default router;