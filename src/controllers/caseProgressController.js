import asyncHandler from 'express-async-handler';
import * as caseProgressService from '../services/caseProgressService.js';
import * as caseService from '../services/case.service.js';

/**
 * @route   POST /api/v1/cases/:id/progress
 * @desc    Add a progress update to a case
 * @access  Assigned Investigator only
 */
export const addProgress = asyncHandler(async (req, res) => {
    const { id: caseId } = req.params;
    const { message, statusSnapshot, files } = req.body;
    const { userId, role } = req.user;

    // 1. RBAC: Only Assigned Investigator can add progress
    if (role !== 'INVESTIGATOR') {
        const error = new Error('Access forbidden. Only Investigators can add progress updates.');
        error.statusCode = 403;
        throw error;
    }

    // 2. Fetch Case to verify assignment and status (reusing caseService for consistency)
    // Note: getCaseById already enforces that Investigator is assigned to the case
    const caseDoc = await caseService.getCaseById(caseId, userId, role);

    // Double check assignment (explicitly requested)
    // although getCaseById handles strict "view" rights for investigator which implies assignment,
    // we want to be explicit for "edit/add" rights.
    if (!caseDoc.assignedInvestigator || caseDoc.assignedInvestigator._id.toString() !== userId.toString()) {
        const error = new Error('Access forbidden. You are not assigned to this case.');
        error.statusCode = 403;
        throw error;
    }

    // 3. Create Progress Entry
    // Note: caseProgressService.createProgressEntry checks if case is CLOSED
    const progressEntry = await caseProgressService.createProgressEntry({
        caseId,
        statusSnapshot: statusSnapshot || caseDoc.status,
        message,
        files,
        updatedBy: userId
    });

    res.status(201).json({
        success: true,
        message: 'Progress update added successfully',
        data: { progress: progressEntry },
    });
});

/**
 * @route   GET /api/v1/cases/:id/progress
 * @desc    Get progress timeline for a case
 * @access  Admin, Assigned Investigator, Reporting NGO
 */
export const getCaseProgress = asyncHandler(async (req, res) => {
    const { id: caseId } = req.params;
    const { userId, role } = req.user;

    // 1. Verify Access Rights
    // Reusing caseService.getCaseById ensures:
    // - Admin sees all
    // - Investigator sees only assigned
    // - NGO sees only reported by them
    await caseService.getCaseById(caseId, userId, role);

    // 2. Fetch Progress Timeline
    const progressDocs = await caseProgressService.getCaseProgress(caseId);

    res.status(200).json({
        success: true,
        message: 'Case progress timeline retrieved successfully',
        data: { progress: progressDocs },
    });
});
