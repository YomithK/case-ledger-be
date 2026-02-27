import asyncHandler from 'express-async-handler';
import * as evidenceService from '../services/evidence.service.js';

/**
 * @route   POST /api/v1/cases/:caseId/evidence
 * @desc    Upload evidence for a case
 * @access  ADMIN, Assigned INVESTIGATOR
 */
export const uploadEvidence = asyncHandler(async (req, res) => {
    const { caseId } = req.params;

    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'No file uploaded. Please attach a file with field name "file".',
        });
    }

    const evidence = await evidenceService.uploadEvidence(
        caseId,
        req.file,
        req.body,
        req.user
    );

    res.status(201).json({
        success: true,
        message: 'Evidence uploaded successfully',
        data: { evidence },
    });
});

/**
 * @route   GET /api/v1/cases/:caseId/evidence
 * @desc    Get all evidence for a case (paginated)
 * @access  ADMIN, Assigned INVESTIGATOR, Reporting NGO
 */
export const getEvidenceByCase = asyncHandler(async (req, res) => {
    const { caseId } = req.params;

    const result = await evidenceService.getEvidenceByCase(caseId, req.query, req.user);

    res.status(200).json({
        success: true,
        message: 'Evidence retrieved successfully',
        data: {
            evidence: result.evidence,
            pagination: {
                total: result.total,
                page: result.page,
                limit: result.limit,
                totalPages: Math.ceil(result.total / result.limit),
            },
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

    res.status(200).json({
        success: true,
        message: 'Evidence retrieved successfully',
        data: { evidence },
    });
});

/**
 * @route   PUT /api/v1/evidence/:id
 * @desc    Update evidence metadata (description, tags)
 * @access  ADMIN or uploader
 */
export const updateEvidence = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const evidence = await evidenceService.updateEvidence(id, req.body, req.user);

    res.status(200).json({
        success: true,
        message: 'Evidence updated successfully',
        data: { evidence },
    });
});

/**
 * @route   DELETE /api/v1/evidence/:id
 * @desc    Soft delete evidence + remove from Cloudinary
 * @access  ADMIN only
 */
export const deleteEvidence = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await evidenceService.deleteEvidence(id, req.user);

    res.status(200).json({
        success: true,
        message: result.message,
    });
});

/**
 * @route   PUT /api/v1/evidence/:id/verify
 * @desc    Mark evidence as verified
 * @access  ADMIN only
 */
export const verifyEvidence = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const evidence = await evidenceService.verifyEvidence(id, req.user);

    res.status(200).json({
        success: true,
        message: 'Evidence verified successfully',
        data: { evidence },
    });
});
