import express from 'express';
import { body } from 'express-validator';
import { protect, admin, parkingOwner } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import {
  createSpotRequest,
  getMySpotRequests,
  getPendingSpotRequests,
  approveSpotRequest,
  rejectSpotRequest,
} from '../controllers/spotRequestController.js';

const router = express.Router();

const requestValidation = [
  body('floor').isInt({ min: 0 }).withMessage('floor must be a non-negative integer'),
  body('vehicleType').optional().isIn(['Car', 'Bike', 'All']).withMessage('vehicleType must be Car, Bike, or All'),
  body('pricePerHour').optional().isFloat({ min: 0 }).withMessage('pricePerHour must be a non-negative number'),
  body('tags').optional().isArray().withMessage('tags must be an array of strings'),
  body('numberOfSpots').isInt({ min: 1, max: 100 }).withMessage('numberOfSpots must be between 1 and 100'),
  body('parkingLotName').custom((value) => {
    if (!String(value || '').trim()) {
      throw new Error('parkingLotName is required');
    }
    return true;
  }),
  body('area').custom((value) => {
    if (!String(value || '').trim()) {
      throw new Error('area is required');
    }
    return true;
  }),
  handleValidationErrors,
];

router.post('/', protect, parkingOwner, requestValidation, createSpotRequest);
router.get('/mine', protect, parkingOwner, getMySpotRequests);

router.get('/admin/pending', protect, admin, getPendingSpotRequests);
router.patch('/admin/:id/approve', protect, admin, approveSpotRequest);
router.patch('/admin/:id/reject', protect, admin, rejectSpotRequest);

export default router;
