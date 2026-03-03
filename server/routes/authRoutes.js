import express from 'express';
import { register, login, getMe, googleAuth, savePaymentMethod, removePaymentMethod, forgotPassword, resetPassword } from '../controllers/authController.js';
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
  body('vehicles.*.carYear')
    .custom((value) => {
      const year = parseInt(value, 10);
      const currentYear = new Date().getFullYear();
      if (isNaN(year) || year < 1900 || year > currentYear + 1) {
        throw new Error('Car year must be between 1900 and ' + (currentYear + 1));
      }
      return true;
    })
    .withMessage('Valid car year is required for all vehicles'),
  handleValidationErrors,
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  handleValidationErrors,
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors,
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);
router.post('/google', googleAuth);
router.get('/me', protect, getMe);
router.post('/payment-method', protect, savePaymentMethod);
router.delete('/payment-method', protect, removePaymentMethod);

export default router;


