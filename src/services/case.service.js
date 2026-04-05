import * as caseRepository from '../repository/case.repository.js';
import * as userRepository from '../repository/user.repository.js';

/**
 * Status transition rules
 * Defines valid next statuses for each current status
 */
const STATUS_TRANSITIONS = {
    REPORTED: ['UNDER_INVESTIGATION', 'REJECTED'],
    UNDER_INVESTIGATION: ['EVIDENCE_COLLECTED', 'REJECTED'],
    EVIDENCE_COLLECTED: ['RESOLVED', 'UNDER_INVESTIGATION'],
    RESOLVED: ['CLOSED'],
    REJECTED: [],
    CLOSED: [],
};

/**
 * Validate status transition
 * @param {string} currentStatus - Current case status
 * @param {string} newStatus - New status to transition to
 * @returns {boolean} True if transition is valid
 */
const isValidStatusTransition = (currentStatus, newStatus) => {
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
};

/**
 * Create new case
 * Business Logic: Only NGO role can create cases
 * @param {Object} caseData - Case data
 * @param {string} userId - User ID creating the case
 * @param {string} userRole - User role
 * @returns {Promise<Object>} Created case
 */
export const createCase = async (caseData, userId, userRole) => {
    // Validate: Only NGO can create cases
    if (userRole !== 'NGO') {
        const error = new Error('Only NGO users can create cases');
        error.statusCode = 403;
        throw error;
    }

    // Set reportedBy to current user
    const newCaseData = {
        ...caseData,
        reportedBy: userId,
        status: 'REPORTED', // Default status
    };

    // Create case
    const createdCase = await caseRepository.create(newCaseData);

    // Populate and return
    return await caseRepository.findById(createdCase._id, { populate: true });
};

/**
 * Get all cases with filtering and pagination
 * Business Logic: Role-based access control
 * - NGO: Only see cases they reported
 * - INVESTIGATOR: Only see assigned cases
 * - ADMIN: See all cases
 * @param {Object} filters - Filter criteria
 * @param {Object} pagination - Pagination options
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @returns {Promise<Object>} Cases with pagination metadata
 */
export const getCases = async (filters = {}, pagination = {}, userId, userRole) => {
    // Apply role-based filtering
    const appliedFilters = { ...filters };

    if (userRole === 'NGO') {
        // NGO can only see their own cases
        appliedFilters.reportedBy = userId;
    } else if (userRole === 'INVESTIGATOR') {
        // INVESTIGATOR can only see assigned cases
        appliedFilters.assignedInvestigator = userId;
    } else if (userRole === 'VICTIM') {
        // VICTIM can only see cases where they are the assigned victim
        appliedFilters.victim = userId;
    }
    // ADMIN can see all cases (no additional filter)

    // Get cases and total count
    const [cases, totalCount] = await Promise.all([
        caseRepository.findAll(appliedFilters, pagination),
        caseRepository.countCases(appliedFilters),
    ]);

    // Calculate pagination metadata
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const totalPages = Math.ceil(totalCount / limit);

    return {
        cases,
        pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    };
};

/**
 * Get case by ID
 * Business Logic: Role-based access control
 * @param {string} caseId - Case ID
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @returns {Promise<Object>} Case data
 */
export const getCaseById = async (caseId, userId, userRole) => {
    // Find case
    const caseDoc = await caseRepository.findById(caseId, {
        populate: true,
        activeOnly: true,
    });

    // Validate case exists
    if (!caseDoc) {
        const error = new Error('Case not found');
        error.statusCode = 404;
        throw error;
    }

    // Validate access based on role
    if (userRole === 'NGO') {
        // NGO can only see their own cases
        if (caseDoc.reportedBy._id.toString() !== userId.toString()) {
            const error = new Error('Access forbidden. You can only view cases you reported.');
            error.statusCode = 403;
            throw error;
        }
    } else if (userRole === 'INVESTIGATOR') {
        // INVESTIGATOR can only see assigned cases
        if (
            !caseDoc.assignedInvestigator ||
            caseDoc.assignedInvestigator._id.toString() !== userId.toString()
        ) {
            const error = new Error('Access forbidden. You can only view cases assigned to you.');
            error.statusCode = 403;
            throw error;
        }
    } else if (userRole === 'VICTIM') {
        // VICTIM can only see cases where they are assigned as victim
        if (!caseDoc.victim || caseDoc.victim._id.toString() !== userId.toString()) {
            const error = new Error('Access forbidden. You can only view cases related to you.');
            error.statusCode = 403;
            throw error;
        }
    }
    // ADMIN can see all cases

    return caseDoc;
};

/**
 * Update case
 * Business Logic:
 * - Only ADMIN or assigned INVESTIGATOR can update
 * - CLOSED and REJECTED cases cannot be modified
 * - Cannot update status or assignment through this method
 * @param {string} caseId - Case ID
 * @param {Object} updateData - Update data
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @returns {Promise<Object>} Updated case
 */
export const updateCase = async (caseId, updateData, userId, userRole) => {
    // Find case
    const caseDoc = await caseRepository.findById(caseId, { activeOnly: true });

    // Validate case exists
    if (!caseDoc) {
        const error = new Error('Case not found');
        error.statusCode = 404;
        throw error;
    }

    // Validate: CLOSED and REJECTED cases cannot be modified
    if (caseDoc.status === 'CLOSED' || caseDoc.status === 'REJECTED') {
        const error = new Error(`Cannot modify ${caseDoc.status.toLowerCase()} cases`);
        error.statusCode = 400;
        throw error;
    }

    // Validate: Only ADMIN or assigned INVESTIGATOR can update
    if (userRole === 'ADMIN') {
        // ADMIN can update any case
    } else if (userRole === 'INVESTIGATOR') {
        // INVESTIGATOR can only update assigned cases
        if (
            !caseDoc.assignedInvestigator ||
            caseDoc.assignedInvestigator.toString() !== userId.toString()
        ) {
            const error = new Error('Access forbidden. You can only update cases assigned to you.');
            error.statusCode = 403;
            throw error;
        }
    } else {
        // NGO cannot update cases
        const error = new Error('Access forbidden. Insufficient permissions.');
        error.statusCode = 403;
        throw error;
    }

    // Prevent updates to protected fields
    const {
        status,
        assignedInvestigator,
        assignedAt,
        reportedBy,
        isArchived,
        caseNumber,
        ...allowedUpdates
    } = updateData;

    // Update case
    const updatedCase = await caseRepository.updateById(caseId, allowedUpdates, {
        activeOnly: true,
    });

    if (!updatedCase) {
        const error = new Error('Failed to update case');
        error.statusCode = 500;
        throw error;
    }

    return updatedCase;
};

/**
 * Assign investigator to case
 * Business Logic:
 * - Only ADMIN can assign
 * - investigatorId must reference a user with role INVESTIGATOR
 * @param {string} caseId - Case ID
 * @param {string} investigatorId - Investigator user ID
 * @param {string} userRole - User role
 * @returns {Promise<Object>} Updated case
 */
export const assignInvestigator = async (caseId, investigatorId, userRole) => {
    // Validate: Only ADMIN or NGO can assign
    if (userRole !== 'ADMIN' && userRole !== 'NGO') {
        const error = new Error('Only administrators or NGO users can assign investigators');
        error.statusCode = 403;
        throw error;
    }

    // Find case
    const caseDoc = await caseRepository.findById(caseId, { activeOnly: true });

    if (!caseDoc) {
        const error = new Error('Case not found');
        error.statusCode = 404;
        throw error;
    }

    // Validate investigator exists and has INVESTIGATOR role
    const investigator = await userRepository.findById(investigatorId, { activeOnly: true });

    if (!investigator) {
        const error = new Error('Investigator not found');
        error.statusCode = 404;
        throw error;
    }

    if (investigator.role !== 'INVESTIGATOR') {
        const error = new Error('User must have INVESTIGATOR role to be assigned to cases');
        error.statusCode = 400;
        throw error;
    }

    // Assign investigator
    const updatedCase = await caseRepository.assignInvestigator(caseId, investigatorId);

    if (!updatedCase) {
        const error = new Error('Failed to assign investigator');
        error.statusCode = 500;
        throw error;
    }

    return updatedCase;
};

/**
 * Update case status
 * Business Logic:
 * - Only ADMIN or assigned INVESTIGATOR can update status
 * - Status transitions must follow valid lifecycle
 * @param {string} caseId - Case ID
 * @param {string} newStatus - New status
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @returns {Promise<Object>} Updated case
 */
export const updateStatus = async (caseId, newStatus, userId, userRole) => {
    // Find case
    const caseDoc = await caseRepository.findById(caseId, { activeOnly: true });

    if (!caseDoc) {
        const error = new Error('Case not found');
        error.statusCode = 404;
        throw error;
    }

    // Validate: Only ADMIN or assigned INVESTIGATOR can update status
    if (userRole === 'ADMIN') {
        // ADMIN can update any case status
    } else if (userRole === 'INVESTIGATOR') {
        // INVESTIGATOR can only update assigned cases
        if (
            !caseDoc.assignedInvestigator ||
            caseDoc.assignedInvestigator.toString() !== userId.toString()
        ) {
            const error = new Error('Access forbidden. You can only update status of cases assigned to you.');
            error.statusCode = 403;
            throw error;
        }
    } else {
        // NGO cannot update status
        const error = new Error('Access forbidden. Insufficient permissions.');
        error.statusCode = 403;
        throw error;
    }

    // Validate status transition
    if (!isValidStatusTransition(caseDoc.status, newStatus)) {
        const allowedStatuses = STATUS_TRANSITIONS[caseDoc.status];
        const error = new Error(
            `Invalid status transition from ${caseDoc.status} to ${newStatus}. ` +
            `Allowed transitions: ${allowedStatuses.length > 0 ? allowedStatuses.join(', ') : 'none'}`
        );
        error.statusCode = 400;
        throw error;
    }

    // Update status
    const updatedCase = await caseRepository.updateStatus(caseId, newStatus);

    if (!updatedCase) {
        const error = new Error('Failed to update case status');
        error.statusCode = 500;
        throw error;
    }

    return updatedCase;
};

/**
 * Delete case (soft delete)
 * Business Logic: Only ADMIN can delete
 * @param {string} caseId - Case ID
 * @param {string} userRole - User role
 * @returns {Promise<Object>} Success message
 */
export const deleteCase = async (caseId, userRole) => {
    // Validate: Only ADMIN can delete
    if (userRole !== 'ADMIN') {
        const error = new Error('Only administrators can delete cases');
        error.statusCode = 403;
        throw error;
    }

    // Find case
    const caseDoc = await caseRepository.findById(caseId, { activeOnly: true });

    if (!caseDoc) {
        const error = new Error('Case not found');
        error.statusCode = 404;
        throw error;
    }

    // Soft delete
    const deletedCase = await caseRepository.softDeleteById(caseId);

    if (!deletedCase) {
        const error = new Error('Failed to delete case');
        error.statusCode = 500;
        throw error;
    }

    return { message: 'Case deleted successfully' };
};

/**
 * Assign victim to case
 * @param {string} caseId - Case ID
 * @param {string} victimId - Victim user ID (optional)
 * @param {string} inviteEmail - Email to invite if victim not in system (optional)
 * @param {string} userId - Requesting user ID
 * @param {string} userRole - Requesting user role
 * @returns {Promise<Object>} Updated case
 */
export const assignVictim = async (caseId, victimId, inviteEmail, userId, userRole) => {
    const caseDoc = await caseRepository.findById(caseId, { activeOnly: true });

    if (!caseDoc) {
        const error = new Error('Case not found');
        error.statusCode = 404;
        throw error;
    }

    // INVESTIGATOR must be assigned to the case
    if (userRole === 'INVESTIGATOR') {
        if (!caseDoc.assignedInvestigator || caseDoc.assignedInvestigator.toString() !== userId.toString()) {
            const error = new Error('Access forbidden. You can only assign victims to cases assigned to you.');
            error.statusCode = 403;
            throw error;
        }
    }

    if (victimId) {
        const victim = await userRepository.findById(victimId, { activeOnly: true });
        if (!victim) {
            const error = new Error('Victim user not found');
            error.statusCode = 404;
            throw error;
        }
        if (victim.role !== 'VICTIM') {
            const error = new Error('User must have VICTIM role to be assigned as case victim');
            error.statusCode = 400;
            throw error;
        }
    }

    const updatedCase = await caseRepository.updateById(caseId, { victim: victimId || null });
    if (!updatedCase) {
        const error = new Error('Failed to assign victim');
        error.statusCode = 500;
        throw error;
    }

    return updatedCase;
};

/**
 * Get all public cases (no auth required)
 * @param {Object} pagination - Pagination options
 * @returns {Promise<Object>} Cases with pagination metadata
 */
export const getPublicCases = async (pagination = {}) => {
    const [cases, totalCount] = await Promise.all([
        caseRepository.findPublicCases(pagination),
        caseRepository.countPublicCases(),
    ]);

    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const totalPages = Math.ceil(totalCount / limit);

    return {
        cases,
        pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    };
};

/**
 * Get cases associated with the authenticated user
 * @param {string} userId - User ID
 * @param {Object} pagination - Pagination options
 * @returns {Promise<Object>} Cases with pagination metadata
 */
export const getAssociatedCases = async (userId, pagination = {}) => {
    const [cases, totalCount] = await Promise.all([
        caseRepository.findAssociatedCases(userId, pagination),
        caseRepository.countAssociatedCases(userId),
    ]);

    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const totalPages = Math.ceil(totalCount / limit);

    return {
        cases,
        pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    };
};
