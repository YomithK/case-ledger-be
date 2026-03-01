import express from 'express';
import * as caseController from '../controllers/case.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
    createCaseValidation,
    updateCaseValidation,
    assignInvestigatorValidation,
    updateStatusValidation,
    getCasesValidation,
    caseIdValidation,
} from '../validations/case.validation.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /cases
 * @desc    Create new case
 * @access  NGO only
 */
router.post('/', authorize('NGO'), createCaseValidation, caseController.createCase);

/**
 * @route   GET /cases
 * @desc    Get all cases with filtering and pagination
 * @access  Authenticated (role-based filtering applied in service)
 */
router.get('/', getCasesValidation, caseController.getCases);

/**
 * @route   GET /cases/:id
 * @desc    Get case by ID
 * @access  Authenticated (role-based access control in service)
 */
router.get('/:id', caseIdValidation, caseController.getCaseById);

/**
 * @route   PUT /cases/:id
 * @desc    Update case
 * @access  ADMIN or assigned INVESTIGATOR (validated in service)
 */
router.put('/:id', updateCaseValidation, caseController.updateCase);

/**
 * @route   PUT /cases/:id/assign
 * @desc    Assign investigator to case
 * @access  ADMIN or NGO
 */
router.put(
    '/:id/assign',
    authorize('ADMIN', 'NGO'),
    assignInvestigatorValidation,
    caseController.assignInvestigator
);

/**
 * @route   PUT /cases/:id/status
 * @desc    Update case status
 * @access  ADMIN or assigned INVESTIGATOR (validated in service)
 */
router.put('/:id/status', updateStatusValidation, caseController.updateStatus);

/**
 * @route   DELETE /cases/:id
 * @desc    Delete case (soft delete)
 * @access  ADMIN only
 */
router.delete('/:id', authorize('ADMIN'), caseIdValidation, caseController.deleteCase);

export default router;
