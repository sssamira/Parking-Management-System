import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { body } from 'express-validator';

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('driverLicense').trim().notEmpty().withMessage('Driver license number is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('vehicles').isArray({ min: 1 }).withMessage('At least one vehicle is required'),
  body('vehicles.*.licensePlate').trim().notEmpty().withMessage('License plate is required for all vehicles'),
  body('vehicles.*.carType').notEmpty().withMessage('Car type is required for all vehicles'),
  body('vehicles.*.carModel').trim().notEmpty().withMessage('Car model is required for all vehicles'),
  body('vehicles.*.carColor').trim().notEmpty().withMessage('Car color is required for all vehicles'),
  body('vehicles.*.carYear').isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Valid car year is required for all vehicles'),
  handleValidationErrors,
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);

export default router;


