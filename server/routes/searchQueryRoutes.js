import express from 'express';
import { saveSearchQuery, getUserSearchQueries, getAllSearchQueries } from '../controllers/searchQueryController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// Routes
router.post('/', protect, saveSearchQuery);
router.get('/', protect, getUserSearchQueries);
router.get('/admin/all', protect, admin, getAllSearchQueries);

export default router;




