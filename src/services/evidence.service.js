import cloudinary from '../config/cloudinary.js';
import * as evidenceRepository from '../repository/evidence.repository.js';
import * as caseRepository from '../repository/case.repository.js';
import * as caseProgressRepository from '../repository/caseProgress.repository.js';

/**
 * Upload evidence for a case
 * Business Logic:
 * - Only ADMIN or assigned INVESTIGATOR can upload
 * - Case must exist and must not be CLOSED or REJECTED
 * - After upload, auto-create a CaseProgress entry
 *
 * @param {string} caseId
 * @param {Object} fileData - Data from multer (req.file)
 * @param {Object} body - Request body (description, tags, fileCategory, accessLevel, isConfidential)
 * @param {Object} user - Authenticated user (userId, role)
 * @returns {Promise<Object>} Created evidence document
 */
export const uploadEvidence = async (caseId, fileData, body, user) => {
    const { userId, role } = user;

    // 1. Validate case exists
    const caseDoc = await caseRepository.findById(caseId, { activeOnly: true });
    if (!caseDoc) {
        const error = new Error('Case not found');
        error.statusCode = 404;
        throw error;
    }

    // 2. Block upload if case is CLOSED or REJECTED
    if (['CLOSED', 'REJECTED'].includes(caseDoc.status)) {
        const error = new Error(`Cannot upload evidence to a ${caseDoc.status} case`);
        error.statusCode = 400;
        throw error;
    }

    // 3. RBAC: ADMIN can always upload; INVESTIGATOR must be assigned
    if (role === 'INVESTIGATOR') {
        const assignedId = caseDoc.assignedInvestigator?.toString();
        if (assignedId !== userId.toString()) {
            const error = new Error('Access forbidden. You are not the assigned investigator for this case.');
            error.statusCode = 403;
            throw error;
        }
    }

    // 4. Determine file category from MIME type if not provided
    const mimeType = fileData.mimetype || '';
    let derivedCategory = body.fileCategory;
    if (!derivedCategory) {
        if (mimeType.startsWith('image/')) derivedCategory = 'PHOTO';
        else if (mimeType.startsWith('video/')) derivedCategory = 'VIDEO';
        else if (mimeType.startsWith('audio/')) derivedCategory = 'AUDIO';
        else derivedCategory = 'DOCUMENT';
    }

    // 5. Build evidence data
    const evidenceData = {
        caseId,
        fileUrl: fileData.path,          // secure_url from Cloudinary
        publicId: fileData.filename,     // public_id from Cloudinary
        fileName: fileData.originalname,
        fileType: mimeType,
        fileCategory: derivedCategory,
        fileSize: fileData.size,
        description: body.description,
        tags: body.tags ? (Array.isArray(body.tags) ? body.tags : [body.tags]) : [],
        accessLevel: body.accessLevel || 'INTERNAL',
        isConfidential: body.isConfidential === 'true' || body.isConfidential === true,
        uploadedBy: userId,
    };

    // 6. Save to MongoDB
    const newEvidence = await evidenceRepository.create(evidenceData);

    // 7. Auto-create CaseProgress entry
    const progressEntry = await caseProgressRepository.create({
        caseId,
        statusSnapshot: caseDoc.status,
        message: `Evidence uploaded: ${fileData.originalname}`,
        files: [fileData.path],
        updatedBy: userId,
    });

    // 8. Link progress entry back to evidence
    await evidenceRepository.updateById(newEvidence._id, {
        relatedProgressId: progressEntry._id,
    });

    // 9. Return fully populated evidence
    return await evidenceRepository.findById(newEvidence._id);
};

/**
 * Get all evidence for a case (with pagination & role-based filtering)
 * @param {string} caseId
 * @param {Object} query - Request query params (page, limit, fileCategory, accessLevel, isVerified)
 * @param {Object} user - Authenticated user
 * @returns {Promise<Object>} { evidence, total, page, limit }
 */
export const getEvidenceByCase = async (caseId, query, user) => {
    const { userId, role } = user;

    // Validate case exists
    const caseDoc = await caseRepository.findById(caseId, { activeOnly: true });
    if (!caseDoc) {
        const error = new Error('Case not found');
        error.statusCode = 404;
        throw error;
    }

    // RBAC:
    // - NGO can only see PUBLIC evidence for cases they reported
    // - INVESTIGATOR can only see evidence for their assigned case
    // - ADMIN sees all
    const filters = {};

    if (role === 'NGO') {
        if (caseDoc.reportedBy?.toString() !== userId.toString()) {
            const error = new Error('Access forbidden. You can only view evidence for cases you reported.');
            error.statusCode = 403;
            throw error;
        }
        filters.accessLevel = 'PUBLIC';
    }

    if (role === 'INVESTIGATOR') {
        const assignedId = caseDoc.assignedInvestigator?.toString();
        if (assignedId !== userId.toString()) {
            const error = new Error('Access forbidden. You are not assigned to this case.');
            error.statusCode = 403;
            throw error;
        }
        // Investigators can see PUBLIC and INTERNAL but not CONFIDENTIAL
        // (implement via exclusion - you can tune this per your policy)
    }

    // Apply optional filters from query
    if (query.fileCategory) filters.fileCategory = query.fileCategory;
    if (query.isVerified !== undefined) filters.isVerified = query.isVerified === 'true';

    const pagination = {
        page: query.page,
        limit: query.limit,
        sort: query.sort,
    };

    const [evidence, total] = await Promise.all([
        evidenceRepository.findByCaseId(caseId, filters, pagination),
        evidenceRepository.countByCaseId(caseId, filters),
    ]);

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;

    return { evidence, total, page, limit };
};

/**
 * Get a single evidence document by ID
 * @param {string} evidenceId
 * @param {Object} user
 * @returns {Promise<Object>}
 */
export const getEvidenceById = async (evidenceId, user) => {
    const evidence = await evidenceRepository.findById(evidenceId);
    if (!evidence) {
        const error = new Error('Evidence not found');
        error.statusCode = 404;
        throw error;
    }

    const { userId, role } = user;

    // NGO can only see PUBLIC evidence for their cases
    if (role === 'NGO') {
        const caseDoc = await caseRepository.findById(evidence.caseId._id || evidence.caseId);
        if (!caseDoc || caseDoc.reportedBy?.toString() !== userId.toString()) {
            const err = new Error('Access forbidden.');
            err.statusCode = 403;
            throw err;
        }
        if (evidence.accessLevel !== 'PUBLIC') {
            const err = new Error('Access forbidden. This evidence is restricted.');
            err.statusCode = 403;
            throw err;
        }
    }

    return evidence;
};

/**
 * Update evidence metadata (description, tags)
 * - ADMIN or the uploader can update
 * - File replacement is NOT allowed
 * @param {string} evidenceId
 * @param {Object} updateData - { description, tags }
 * @param {Object} user
 * @returns {Promise<Object>}
 */
export const updateEvidence = async (evidenceId, updateData, user) => {
    const { userId, role } = user;

    const evidence = await evidenceRepository.findById(evidenceId);
    if (!evidence) {
        const error = new Error('Evidence not found');
        error.statusCode = 404;
        throw error;
    }

    // Only ADMIN or the original uploader
    if (role !== 'ADMIN' && evidence.uploadedBy?._id.toString() !== userId.toString()) {
        const error = new Error('Access forbidden. Only the uploader or an Administrator can edit this evidence.');
        error.statusCode = 403;
        throw error;
    }

    // Strip any file-related or immutable fields
    const { fileUrl, publicId, fileName, fileType, fileSize, caseId, uploadedBy, ...allowed } = updateData;

    // Only allow description and tags to be updated
    const safeUpdate = {};
    if (allowed.description !== undefined) safeUpdate.description = allowed.description;
    if (allowed.tags !== undefined) {
        safeUpdate.tags = Array.isArray(allowed.tags) ? allowed.tags : [allowed.tags];
    }

    return await evidenceRepository.updateById(evidenceId, safeUpdate);
};

/**
 * Delete evidence (soft delete - isArchived = true) + remove from Cloudinary
 * - ADMIN only
 * @param {string} evidenceId
 * @param {Object} user
 * @returns {Promise<Object>} { message }
 */
export const deleteEvidence = async (evidenceId, user) => {
    if (user.role !== 'ADMIN') {
        const error = new Error('Access forbidden. Only Administrators can delete evidence.');
        error.statusCode = 403;
        throw error;
    }

    const evidence = await evidenceRepository.findById(evidenceId);
    if (!evidence) {
        const error = new Error('Evidence not found');
        error.statusCode = 404;
        throw error;
    }

    // 1. Destroy file from Cloudinary
    if (evidence.publicId) {
        await cloudinary.uploader.destroy(evidence.publicId, { resource_type: 'auto' });
    }

    // 2. Soft delete in MongoDB
    await evidenceRepository.softDeleteById(evidenceId);

    return { message: 'Evidence deleted successfully' };
};

/**
 * Verify evidence (set isVerified = true)
 * - ADMIN only
 * @param {string} evidenceId
 * @param {Object} user
 * @returns {Promise<Object>} Updated evidence
 */
export const verifyEvidence = async (evidenceId, user) => {
    if (user.role !== 'ADMIN') {
        const error = new Error('Access forbidden. Only Administrators can verify evidence.');
        error.statusCode = 403;
        throw error;
    }

    const evidence = await evidenceRepository.findById(evidenceId);
    if (!evidence) {
        const error = new Error('Evidence not found');
        error.statusCode = 404;
        throw error;
    }

    if (evidence.isVerified) {
        const error = new Error('Evidence is already verified');
        error.statusCode = 400;
        throw error;
    }

    return await evidenceRepository.updateById(evidenceId, {
        isVerified: true,
        verifiedBy: user.userId,
    });
};
