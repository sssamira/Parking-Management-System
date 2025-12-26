import express from 'express';
import { protect, admin } from '../middleware/auth.js';
import {
  getActiveOffers,
  getOffers,
  createOffer,
  updateOffer,
  deleteOffer,
} from '../controllers/offerController.js';

const router = express.Router();

// Public endpoint to fetch currently active offers
router.get('/active', getActiveOffers);

// Admin endpoints
router.use(protect, admin);
router.get('/', getOffers);
router.post('/', createOffer);
router.patch('/:id', updateOffer);
router.delete('/:id', deleteOffer);

export default router;
