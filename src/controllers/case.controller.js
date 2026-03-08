import asyncHandler from 'express-async-handler';
import * as caseService from '../services/case.service.js';

/**
 * @route   POST /api/v1/cases
 * @desc    Create new case
 * @access  NGO only
 */
export const createCase = asyncHandler(async (req, res) => {
    const caseData = req.body;
    const { userId, role } = req.user;

    const createdCase = await caseService.createCase(caseData, userId, role);

    res.status(201).json({
        success: true,
        message: 'Case created successfully',
        data: { case: createdCase },
    });
});

/**
 * @route   GET /api/v1/cases
 * @desc    Get all cases with filtering and pagination
 * @access  Authenticated (role-based filtering applied)
 */
export const getCases = asyncHandler(async (req, res) => {
    const { status, priority, category, page, limit, search } = req.query;
    const { userId, role } = req.user;

    const filters = {
        status,
        priority,
        category,
        search,
    };

    const pagination = {
        page,
        limit,
    };

    const result = await caseService.getCases(filters, pagination, userId, role);

    res.status(200).json({
        success: true,
        message: 'Cases retrieved successfully',
        data: {
            cases: result.cases,
            pagination: result.pagination,
        },
    });
});

/**
 * @route   GET /api/v1/cases/:id
 * @desc    Get case by ID
 * @access  Authenticated (role-based access control)
 */
export const getCaseById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { userId, role } = req.user;

    const caseData = await caseService.getCaseById(id, userId, role);

    res.status(200).json({
        success: true,
        message: 'Case retrieved successfully',
        data: { case: caseData },
    });
});

/**
 * @route   PUT /api/v1/cases/:id
 * @desc    Update case
 * @access  ADMIN or assigned INVESTIGATOR
 */
export const updateCase = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const { userId, role } = req.user;

    const updatedCase = await caseService.updateCase(id, updateData, userId, role);

    res.status(200).json({
        success: true,
        message: 'Case updated successfully',
        data: { case: updatedCase },
    });
});

/**
 * @route   DELETE /api/v1/cases/:id
 * @desc    Delete case (soft delete)
 * @access  ADMIN only
 */
export const deleteCase = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.user;

    const result = await caseService.deleteCase(id, role);

    res.status(200).json({
        success: true,
        message: result.message,
    });
});

/**
 * @route   PUT /api/v1/cases/:id/assign
 * @desc    Assign investigator to case
 * @access  ADMIN only
 */
export const assignInvestigator = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { investigatorId } = req.body;
    const { role } = req.user;

    const updatedCase = await caseService.assignInvestigator(id, investigatorId, role);

    res.status(200).json({
        success: true,
        message: 'Investigator assigned successfully',
        data: { case: updatedCase },
    });
});

/**
 * @route   PUT /api/v1/cases/:id/status
 * @desc    Update case status
 * @access  ADMIN or assigned INVESTIGATOR
 */
export const updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const { userId, role } = req.user;

    const updatedCase = await caseService.updateStatus(id, status, userId, role);

    res.status(200).json({
        success: true,
        message: 'Case status updated successfully',
        data: { case: updatedCase },
    });
});

/**
 * @route   GET /api/v1/cases/public
 * @desc    Get all public, non-archived cases
 * @access  Public (no authentication required)
 */
export const getPublicCases = asyncHandler(async (req, res) => {
    const { page, limit } = req.query;

    const result = await caseService.getPublicCases({ page, limit });

    res.status(200).json({
        success: true,
        message: 'Public cases retrieved successfully',
        data: {
            cases: result.cases,
            pagination: result.pagination,
        },
    });
});

/**
 * @route   GET /api/v1/cases/associated
 * @desc    Get cases associated with the authenticated user
 *          (reportedBy | assignedInvestigator | relatedUsers.user)
 * @access  Authenticated
 */
export const getAssociatedCases = asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const { userId } = req.user;

    const result = await caseService.getAssociatedCases(userId, { page, limit });

    res.status(200).json({
        success: true,
        message: 'Associated cases retrieved successfully',
        data: {
            cases: result.cases,
            pagination: result.pagination,
        },
    });
});
