import asyncHandler from 'express-async-handler';
import * as evidenceService from '../services/evidence.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * @route   POST /api/v1/cases/:caseId/evidence
 * @desc    Upload evidence for a case
 * @access  ADMIN, Assigned INVESTIGATOR
 */
export const uploadEvidence = asyncHandler(async (req, res) => {
    const { caseId } = req.params;

    if (!req.file) {
        return sendError(res, 400, 'No file uploaded. Please attach a file with field name "file".');
    }

    const evidence = await evidenceService.uploadEvidence(
        caseId,
        req.file,
        req.body,
        req.user
    );

    sendSuccess(res, 201, 'Evidence uploaded successfully', { evidence });
});

/**
 * @route   GET /api/v1/cases/:caseId/evidence
 * @desc    Get all evidence for a case (paginated)
 * @access  ADMIN, Assigned INVESTIGATOR, Reporting NGO
 */
export const getEvidenceByCase = asyncHandler(async (req, res) => {
    const { caseId } = req.params;

    const result = await evidenceService.getEvidenceByCase(caseId, req.query, req.user);

    sendSuccess(res, 200, 'Evidence retrieved successfully', {
        evidence: result.evidence,
        pagination: {
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: Math.ceil(result.total / result.limit),
        },
    });
});

/**
 * @route   GET /api/v1/evidence/:id
 * @desc    Get a single evidence document
 * @access  ADMIN, Assigned INVESTIGATOR, Reporting NGO (PUBLIC only)
 */
export const getEvidenceById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const evidence = await evidenceService.getEvidenceById(id, req.user);

    sendSuccess(res, 200, 'Evidence retrieved successfully', { evidence });
});

/**
 * @route   PUT /api/v1/evidence/:id
 * @desc    Update evidence metadata (description, tags)
 * @access  ADMIN or uploader
 */
export const updateEvidence = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const evidence = await evidenceService.updateEvidence(id, req.body, req.user);

    sendSuccess(res, 200, 'Evidence updated successfully', { evidence });
});

/**
 * @route   DELETE /api/v1/evidence/:id
 * @desc    Soft delete evidence + remove from Cloudinary
 * @access  ADMIN only
 */
export const deleteEvidence = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await evidenceService.deleteEvidence(id, req.user);

    sendSuccess(res, 200, result.message, null);
});

/**
 * @route   PUT /api/v1/evidence/:id/verify
 * @desc    Mark evidence as verified
 * @access  ADMIN only
 */
export const verifyEvidence = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const evidence = await evidenceService.verifyEvidence(id, req.user);

    sendSuccess(res, 200, 'Evidence verified successfully', { evidence });
});
