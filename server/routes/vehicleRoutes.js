import express from 'express';
import { addVehicle, updateVehicle, deleteVehicle, getVehicles } from '../controllers/vehicleController.js';
import { protect } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { body } from 'express-validator';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Validation rules
const vehicleValidation = [
  body('licensePlate').trim().notEmpty().withMessage('License plate is required'),
  body('carType').notEmpty().withMessage('Car type is required'),
  body('carModel').trim().notEmpty().withMessage('Car model is required'),
  body('carColor').trim().notEmpty().withMessage('Car color is required'),
  body('carYear').isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Valid car year is required'),
  handleValidationErrors,
];

// Routes
router.get('/', getVehicles);
router.post('/', vehicleValidation, addVehicle);
router.put('/:vehicleId', vehicleValidation, updateVehicle);
router.delete('/:vehicleId', deleteVehicle);

export default router;

