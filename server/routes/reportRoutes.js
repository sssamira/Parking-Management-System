import express from 'express'
import { protect, admin } from '../middleware/auth.js'
import { getOverview } from '../controllers/reportController.js'

const router = express.Router()

router.get('/overview', protect, admin, getOverview)

export default router
