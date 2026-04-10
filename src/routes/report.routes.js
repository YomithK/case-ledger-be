import express from 'express';
import * as reportController from '../controllers/report.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
    analyticsQueryValidation,
    monthlyQueryValidation,
    longestOpenQueryValidation,
    investigatorIdParamValidation,
    createReportValidation,
    updateReportValidation,
    reportIdValidation,
    getReportsQueryValidation,
} from '../validations/report.validation.js';

const router = express.Router();

// All report routes require authentication
router.use(authenticate);

// ─────────────────────────────────────────────────────────────
// 1. DASHBOARD
// ─────────────────────────────────────────────────────────────

/**
 * @route   GET /reports/dashboard/summary
 * @desc    Get overall system dashboard summary
 * @access  ADMIN only
 */
router.get(
    '/dashboard/summary',
    authorize('ADMIN'),
    reportController.getDashboardSummary
);

// ─────────────────────────────────────────────────────────────
// 2. CASE ANALYTICS
// ─────────────────────────────────────────────────────────────

/**
 * @route   GET /reports/cases/by-status
 * @access  ADMIN, NGO (own cases only)
 */
router.get(
    '/cases/by-status',
    authorize('ADMIN', 'NGO'),
    analyticsQueryValidation,
    reportController.getCasesByStatus
);

/**
 * @route   GET /reports/cases/by-priority
 * @access  ADMIN, NGO (own cases only)
 */
router.get(
    '/cases/by-priority',
    authorize('ADMIN', 'NGO'),
    analyticsQueryValidation,
    reportController.getCasesByPriority
);

/**
 * @route   GET /reports/cases/by-category
 * @access  ADMIN, NGO (own cases only)
 */
router.get(
    '/cases/by-category',
    authorize('ADMIN', 'NGO'),
    analyticsQueryValidation,
    reportController.getCasesByCategory
);

/**
 * @route   GET /reports/cases/monthly
 * @access  ADMIN, NGO (own cases only)
 */
router.get(
    '/cases/monthly',
    authorize('ADMIN', 'NGO'),
    monthlyQueryValidation,
    reportController.getCasesMonthly
);

/**
 * @route   GET /reports/cases/yearly
 * @access  ADMIN, NGO (own cases only)
 */
router.get(
    '/cases/yearly',
    authorize('ADMIN', 'NGO'),
    analyticsQueryValidation,
    reportController.getCasesYearly
);

// ─────────────────────────────────────────────────────────────
// 3. RESOLUTION ANALYTICS
// ─────────────────────────────────────────────────────────────

/**
 * @route   GET /reports/cases/average-resolution-time
 * @access  ADMIN only
 */
router.get(
    '/cases/average-resolution-time',
    authorize('ADMIN'),
    analyticsQueryValidation,
    reportController.getAverageResolutionTime
);

/**
 * @route   GET /reports/cases/longest-open
 * @access  ADMIN only
 */
router.get(
    '/cases/longest-open',
    authorize('ADMIN'),
    longestOpenQueryValidation,
    reportController.getLongestOpenCases
);

// ─────────────────────────────────────────────────────────────
// 4. INVESTIGATOR PERFORMANCE
// ─────────────────────────────────────────────────────────────

/**
 * @route   GET /reports/investigator/:id/performance
 * @access  ADMIN (any investigator), INVESTIGATOR (own only)
 */
router.get(
    '/investigator/:id/performance',
    authorize('ADMIN', 'INVESTIGATOR'),
    investigatorIdParamValidation,
    reportController.getInvestigatorPerformance
);

// ─────────────────────────────────────────────────────────────
// 5. EVIDENCE ANALYTICS
// ─────────────────────────────────────────────────────────────

/**
 * @route   GET /reports/evidence/distribution
 * @access  ADMIN only
 */
router.get(
    '/evidence/distribution',
    authorize('ADMIN'),
    reportController.getEvidenceDistribution
);

/**
 * @route   GET /reports/evidence/verification-ratio
 * @access  ADMIN only
 */
router.get(
    '/evidence/verification-ratio',
    authorize('ADMIN'),
    reportController.getEvidenceVerificationRatio
);

// ─────────────────────────────────────────────────────────────
// 7. CSV DOWNLOAD
// ─────────────────────────────────────────────────────────────

/**
 * @route   GET /reports/cases/download
 * @desc    Download filtered cases as CSV
 * @access  ADMIN, NGO (own cases only)
 */
router.get(
    '/cases/download',
    authorize('ADMIN', 'NGO'),
    reportController.downloadCasesCsv
);

// ─────────────────────────────────────────────────────────────
// 6. SAVED REPORT CRUD
// ─────────────────────────────────────────────────────────────

/**
 * @route   POST /reports
 * @desc    Create a saved report configuration
 * @access  ADMIN only
 */
router.post(
    '/',
    authorize('ADMIN'),
    createReportValidation,
    reportController.createReport
);

/**
 * @route   GET /reports
 * @desc    List all saved report configurations
 * @access  ADMIN only
 */
router.get(
    '/',
    authorize('ADMIN'),
    getReportsQueryValidation,
    reportController.getReports
);

/**
 * @route   GET /reports/:id
 * @desc    Get a single saved report configuration
 * @access  ADMIN only
 */
router.get(
    '/:id',
    authorize('ADMIN'),
    reportIdValidation,
    reportController.getReportById
);

/**
 * @route   PUT /reports/:id
 * @desc    Update a saved report configuration
 * @access  ADMIN only
 */
router.put(
    '/:id',
    authorize('ADMIN'),
    updateReportValidation,
    reportController.updateReport
);

/**
 * @route   DELETE /reports/:id
 * @desc    Soft-delete a saved report configuration
 * @access  ADMIN only
 */
router.delete(
    '/:id',
    authorize('ADMIN'),
    reportIdValidation,
    reportController.deleteReport
);

export default router;
