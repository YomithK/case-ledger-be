import express from 'express';
import * as caseProgressController from '../controllers/caseProgressController.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router({ mergeParams: true }); // mergeParams allows access to :id from parent router (cases)

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/cases/:id/progress
 * @desc    Add a progress update to a case
 * @access  Assigned Investigator only (enforced in controller/service)
 */
router.post('/', authorize('INVESTIGATOR'), caseProgressController.addProgress);

/**
 * @route   GET /api/v1/cases/:id/progress
 * @desc    Get progress timeline for a case (newest first)
 * @access  Authenticated (role-based access enforced in controller/service)
 */
router.get('/', caseProgressController.getCaseProgress);

export default router;
