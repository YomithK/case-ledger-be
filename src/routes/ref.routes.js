import express from 'express';
import * as refController from '../controllers/ref.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /ref/assignable-users
 * @desc    Search for investigators for case assignment
 * @access  ADMIN, NGO, INVESTIGATOR
 */
router.get('/assignable-users', authorize('ADMIN', 'NGO', 'INVESTIGATOR'), refController.getAssignableUsers);

/**
 * @route   GET /ref/victim-users
 * @desc    Search for victim users for case victim assignment
 * @access  ADMIN, INVESTIGATOR
 */
router.get('/victim-users', authorize('ADMIN', 'INVESTIGATOR'), refController.getVictimUsers);

export default router;
