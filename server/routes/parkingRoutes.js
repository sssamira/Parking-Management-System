import express from 'express';
import { getAvailableSpots, createParkingSpot, getParkingLotSummary } from '../controllers/parkingController.js';
import { protect, admin } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { body } from 'express-validator';

const router = express.Router();

router.get('/lots', getParkingLotSummary);
router.get('/', getAvailableSpots);


const createSpotValidation = [
	body('floor').isInt().withMessage('floor must be an integer'),
	body('vehicleType').optional().isIn(['Car', 'Bike', 'All']).withMessage('vehicleType must be Car, Bike, or All'),
	body('pricePerHour').optional().isFloat({ min: 0 }).withMessage('pricePerHour must be a non-negative number'),
	body('tags').optional().isArray().withMessage('tags must be an array of strings'),
	body('numberOfSpots').optional().isInt({ min: 1, max: 100 }).withMessage('numberOfSpots must be between 1 and 100'),
	body('parkingLotName').custom((value, { req }) => {
		const fallback = req.body.parkinglotName;
		const normalized = (value || fallback || '').trim();
		if (!normalized) {
			throw new Error('parkingLotName is required');
		}
		req.body.parkingLotName = normalized;
		return true;
	}),
	body('location').custom((value, { req }) => {
		const fallback = req.body.area;
		const normalized = (value || fallback || '').trim();
		if (!normalized) {
			throw new Error('area is required');
		}
		req.body.location = normalized;
		return true;
	}),
	handleValidationErrors,
];

router.post('/', protect, admin, createSpotValidation, createParkingSpot);

export default router;
