import express from 'express';
import { body } from 'express-validator';
import { 
  createBooking, 
  getUserBookings, 
  getPendingBookings, 
  approveBooking, 
  rejectBooking,
  testEmail,
  recordEntry,
  recordExit,
  cancelBooking,
  requestRefund
} from '../controllers/bookingController.js';
import { protect, admin } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

const bookingValidation = [
  body('parkingSpotId').trim().notEmpty().withMessage('parkingSpotId is required'),
  body('startTime').isISO8601().toDate().withMessage('startTime must be a valid ISO date'),
  body('endTime').isISO8601().toDate().withMessage('endTime must be a valid ISO date'),
  body('vehicle').optional().isObject().withMessage('vehicle must be an object'),
  body('vehicle.licensePlate').optional().isString().withMessage('licensePlate must be a string'),
  body('vehicle.carType').optional().isString().withMessage('carType must be a string'),
  handleValidationErrors,
];

router.post('/', protect, bookingValidation, createBooking);
router.get('/', protect, getUserBookings);
router.patch('/:id/cancel', protect, cancelBooking);
router.post('/:id/request-refund', protect, requestRefund);

// Admin routes
router.get('/admin/pending', protect, admin, getPendingBookings);
router.post('/test-email', protect, admin, testEmail);
router.patch('/:id/approve', protect, admin, approveBooking);
router.patch('/:id/reject', protect, admin, rejectBooking);

// Entry/Exit tracking routes
router.post('/:id/entry', protect, admin, recordEntry);
router.post('/:id/exit', protect, admin, recordExit);

export default router;




