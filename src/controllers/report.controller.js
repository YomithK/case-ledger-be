import asyncHandler from 'express-async-handler';
import * as reportService from '../services/report.service.js';

// ─────────────────────────────────────────────────────────────
// 1. DASHBOARD
// ─────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/reports/dashboard/summary
 * @desc    Get overall system dashboard summary
 * @access  ADMIN only
 */
export const getDashboardSummary = asyncHandler(async (req, res) => {
    const { userId, role } = req.user;
    const data = await reportService.getDashboardSummary(userId, role);

    res.status(200).json({
        success: true,
        message: 'Dashboard summary retrieved successfully',
        data,
    });
});

// ─────────────────────────────────────────────────────────────
// 2. CASE ANALYTICS
// ─────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/reports/cases/by-status
 * @access  ADMIN, NGO (own cases)
 */
export const getCasesByStatus = asyncHandler(async (req, res) => {
    const { userId, role } = req.user;
    const { startDate, endDate, priority, category } = req.query;
    const filters = { startDate, endDate, priority: priority?.split(','), category: category?.split(',') };

    const data = await reportService.getCasesByStatus(filters, userId, role);

    res.status(200).json({
        success: true,
        message: 'Cases by status retrieved successfully',
        data,
    });
});

/**
 * @route   GET /api/v1/reports/cases/by-priority
 * @access  ADMIN, NGO (own cases)
 */
export const getCasesByPriority = asyncHandler(async (req, res) => {
    const { userId, role } = req.user;
    const { startDate, endDate, status, category } = req.query;
    const filters = { startDate, endDate, status: status?.split(','), category: category?.split(',') };

    const data = await reportService.getCasesByPriority(filters, userId, role);

    res.status(200).json({
        success: true,
        message: 'Cases by priority retrieved successfully',
        data,
    });
});

/**
 * @route   GET /api/v1/reports/cases/by-category
 * @access  ADMIN, NGO (own cases)
 */
export const getCasesByCategory = asyncHandler(async (req, res) => {
    const { userId, role } = req.user;
    const { startDate, endDate, status, priority } = req.query;
    const filters = { startDate, endDate, status: status?.split(','), priority: priority?.split(',') };

    const data = await reportService.getCasesByCategory(filters, userId, role);

    res.status(200).json({
        success: true,
        message: 'Cases by category retrieved successfully',
        data,
    });
});

/**
 * @route   GET /api/v1/reports/cases/monthly
 * @access  ADMIN, NGO (own cases)
 */
export const getCasesMonthly = asyncHandler(async (req, res) => {
    const { userId, role } = req.user;
    const { startDate, endDate, year } = req.query;
    const filters = { startDate, endDate };

    const data = await reportService.getCasesMonthly(filters, userId, role, year ? parseInt(year) : null);

    res.status(200).json({
        success: true,
        message: 'Monthly case trends retrieved successfully',
        data,
    });
});

/**
 * @route   GET /api/v1/reports/cases/yearly
 * @access  ADMIN, NGO (own cases)
 */
export const getCasesYearly = asyncHandler(async (req, res) => {
    const { userId, role } = req.user;
    const { startDate, endDate } = req.query;
    const filters = { startDate, endDate };

    const data = await reportService.getCasesYearly(filters, userId, role);

    res.status(200).json({
        success: true,
        message: 'Yearly case trends retrieved successfully',
        data,
    });
});

// ─────────────────────────────────────────────────────────────
// 3. RESOLUTION ANALYTICS
// ─────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/reports/cases/average-resolution-time
 * @access  ADMIN only
 */
export const getAverageResolutionTime = asyncHandler(async (req, res) => {
    const { userId, role } = req.user;
    const { startDate, endDate } = req.query;
    const filters = { startDate, endDate };

    const data = await reportService.getAverageResolutionTime(filters, userId, role);

    res.status(200).json({
        success: true,
        message: 'Average resolution time retrieved successfully',
        data,
    });
});

/**
 * @route   GET /api/v1/reports/cases/longest-open
 * @access  ADMIN only
 */
export const getLongestOpenCases = asyncHandler(async (req, res) => {
    const { userId, role } = req.user;
    const { startDate, endDate, limit } = req.query;
    const filters = { startDate, endDate };

    const data = await reportService.getLongestOpenCases(
        filters,
        userId,
        role,
        limit ? parseInt(limit) : 10
    );

    res.status(200).json({
        success: true,
        message: 'Longest open cases retrieved successfully',
        data,
    });
});

// ─────────────────────────────────────────────────────────────
// 4. INVESTIGATOR PERFORMANCE
// ─────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/reports/investigator/:id/performance
 * @access  ADMIN (any), INVESTIGATOR (own only)
 */
export const getInvestigatorPerformance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId, role } = req.user;

    const data = await reportService.getInvestigatorPerformance(id, userId, role);

    res.status(200).json({
        success: true,
        message: 'Investigator performance retrieved successfully',
        data,
    });
});

// ─────────────────────────────────────────────────────────────
// 5. EVIDENCE ANALYTICS
// ─────────────────────────────────────────────────────────────

/**
 * @route   GET /api/v1/reports/evidence/distribution
 * @access  ADMIN only
 */
export const getEvidenceDistribution = asyncHandler(async (req, res) => {
    const { userId, role } = req.user;
    const data = await reportService.getEvidenceDistribution(userId, role);

    res.status(200).json({
        success: true,
        message: 'Evidence distribution retrieved successfully',
        data,
    });
});

/**
 * @route   GET /api/v1/reports/evidence/verification-ratio
 * @access  ADMIN only
 */
export const getEvidenceVerificationRatio = asyncHandler(async (req, res) => {
    const { userId, role } = req.user;
    const data = await reportService.getEvidenceVerificationRatio(userId, role);

    res.status(200).json({
        success: true,
        message: 'Evidence verification ratio retrieved successfully',
        data,
    });
});

// ─────────────────────────────────────────────────────────────
// 6. SAVED REPORT CRUD
// ─────────────────────────────────────────────────────────────

/**
 * @route   POST /api/v1/reports
 * @desc    Create a saved report configuration
 * @access  ADMIN only
 */
export const createReport = asyncHandler(async (req, res) => {
    const { userId, role } = req.user;
    const report = await reportService.createReport(req.body, userId, role);

    res.status(201).json({
        success: true,
        message: 'Report created successfully',
        data: { report },
    });
});

/**
 * @route   GET /api/v1/reports
 * @desc    List all saved report configurations
 * @access  ADMIN only
 */
export const getReports = asyncHandler(async (req, res) => {
    const { userId, role } = req.user;
    const { reportType, page, limit } = req.query;
    const filters = { reportType };
    const pagination = { page, limit };

    const result = await reportService.getReports(filters, pagination, userId, role);

    res.status(200).json({
        success: true,
        message: 'Reports retrieved successfully',
        data: {
            reports: result.reports,
            pagination: result.pagination,
        },
    });
});

/**
 * @route   GET /api/v1/reports/:id
 * @desc    Get a single saved report configuration
 * @access  ADMIN only
 */
export const getReportById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId, role } = req.user;

    const report = await reportService.getReportById(id, userId, role);

    res.status(200).json({
        success: true,
        message: 'Report retrieved successfully',
        data: { report },
    });
});

/**
 * @route   PUT /api/v1/reports/:id
 * @desc    Update a saved report configuration
 * @access  ADMIN only
 */
export const updateReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId, role } = req.user;

    const report = await reportService.updateReport(id, req.body, userId, role);

    res.status(200).json({
        success: true,
        message: 'Report updated successfully',
        data: { report },
    });
});

/**
 * @route   DELETE /api/v1/reports/:id
 * @desc    Soft-delete a saved report configuration
 * @access  ADMIN only
 */
export const deleteReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId, role } = req.user;

    const result = await reportService.deleteReport(id, userId, role);

    res.status(200).json({
        success: true,
        message: result.message,
    });
});
