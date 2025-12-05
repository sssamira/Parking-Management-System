import express from 'express';
import { getAvailableSpots, createParkingSpot } from '../controllers/parkingController.js';
import { protect, admin } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { body } from 'express-validator';

const router = express.Router();



router.get('/', getAvailableSpots);


const createSpotValidation = [
	body('spotNum').trim().notEmpty().withMessage('spotNum is required'),
	body('parkinglotName').trim().notEmpty().withMessage('parkinglotName is required'),
	body('floor').isInt().withMessage('floor must be an integer'),
	body('location').trim().notEmpty().withMessage('location is required'),
	body('vehicleType').optional().isIn(['Car', 'Bike', 'All']).withMessage('vehicleType must be Car, Bike, or All'),
	body('pricePerHour').optional().isFloat({ min: 0 }).withMessage('pricePerHour must be a non-negative number'),
	body('tags').optional().isArray().withMessage('tags must be an array of strings'),
	handleValidationErrors,
];

router.post('/', protect, admin, createSpotValidation, createParkingSpot);

export default router;
