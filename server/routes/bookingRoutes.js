import express from 'express';
import { body } from 'express-validator';
import { createBooking, getUserBookings } from '../controllers/bookingController.js';
import { protect } from '../middleware/auth.js';
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

export default router;




