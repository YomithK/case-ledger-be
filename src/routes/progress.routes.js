import express from 'express';
import * as caseProgressController from '../controllers/caseProgressController.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   PUT /api/v1/progress/:id
 * @desc    Update a progress entry
 * @access  Admin or Assigned Investigator within 15-minute window (enforced in service)
 */
router.put('/:id', authorize('ADMIN', 'INVESTIGATOR'), caseProgressController.updateProgress);

/**
 * @route   DELETE /api/v1/progress/:id
 * @desc    Delete a progress entry
 * @access  Admin only
 */
router.delete('/:id', authorize('ADMIN'), caseProgressController.deleteProgress);

export default router;
