import express from 'express';
import { saveSearchQuery, getUserSearchQueries } from '../controllers/searchQueryController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Routes
router.post('/', protect, saveSearchQuery);
router.get('/', protect, getUserSearchQueries);

export default router;


