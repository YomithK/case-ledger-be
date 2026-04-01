import express from 'express';
import * as refController from '../controllers/ref.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /ref/assignable-users
 * @desc    Search for users with role USER for linking to cases
 * @access  ADMIN, NGO, INVESTIGATOR
 */
router.get('/assignable-users', authorize('ADMIN', 'NGO', 'INVESTIGATOR'), refController.getAssignableUsers);

export default router;
