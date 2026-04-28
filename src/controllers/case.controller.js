import asyncHandler from 'express-async-handler';
import * as caseService from '../services/case.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * @route   POST /api/v1/cases
 * @desc    Create new case
 * @access  NGO only
 */
export const createCase = asyncHandler(async (req, res) => {
    const caseData = req.body;
    const { userId, role } = req.user;

    const createdCase = await caseService.createCase(caseData, userId, role);

    sendSuccess(res, 201, 'Case created successfully', { case: createdCase });
});

/**
 * @route   GET /api/v1/cases
 * @desc    Get all cases with filtering and pagination
 * @access  Authenticated (role-based filtering applied)
 */
export const getCases = asyncHandler(async (req, res) => {
    const { status, priority, category, page, limit, search } = req.query;
    const { userId, role } = req.user;

    const filters = { status, priority, category, search };
    const pagination = { page, limit };

    const result = await caseService.getCases(filters, pagination, userId, role);

    sendSuccess(res, 200, 'Cases retrieved successfully', {
        cases: result.cases,
        pagination: result.pagination,
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

    sendSuccess(res, 200, 'Case retrieved successfully', { case: caseData });
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

    sendSuccess(res, 200, 'Case updated successfully', { case: updatedCase });
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

    sendSuccess(res, 200, result.message, null);
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

    sendSuccess(res, 200, 'Investigator assigned successfully', { case: updatedCase });
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

    sendSuccess(res, 200, 'Case status updated successfully', { case: updatedCase });
});

/**
 * @route   PUT /api/v1/cases/:id/assign-victim
 * @desc    Assign victim to case
 * @access  INVESTIGATOR (assigned) or ADMIN
 */
export const assignVictim = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { victimId, inviteEmail } = req.body;
    const { userId, role } = req.user;

    const updatedCase = await caseService.assignVictim(id, victimId, inviteEmail, userId, role);

    sendSuccess(res, 200, 'Victim assigned successfully', { case: updatedCase });
});

/**
 * @route   GET /api/v1/cases/public
 * @desc    Get all public, non-archived cases
 * @access  Public (no authentication required)
 */
export const getPublicCases = asyncHandler(async (req, res) => {
    const { page, limit } = req.query;

    const result = await caseService.getPublicCases({ page, limit });

    sendSuccess(res, 200, 'Public cases retrieved successfully', {
        cases: result.cases,
        pagination: result.pagination,
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

    sendSuccess(res, 200, 'Associated cases retrieved successfully', {
        cases: result.cases,
        pagination: result.pagination,
    });
});
