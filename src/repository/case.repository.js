import Case from '../models/Case.js';

/**
 * Create new case
 * @param {Object} caseData - Case data
 * @returns {Promise<Object>} Created case document
 */
export const create = async (caseData) => {
    return await Case.create(caseData);
};

/**
 * Find case by ID
 * @param {string} caseId - Case ID
 * @param {Object} options - Query options
 * @param {boolean} options.populate - Populate referenced fields
 * @param {boolean} options.activeOnly - Only find non-archived cases
 * @returns {Promise<Object|null>} Case document or null
 */
export const findById = async (caseId, options = {}) => {
    const filter = { _id: caseId };

    if (options.activeOnly !== false) {
        filter.isArchived = false;
    }

    let query = Case.findOne(filter);

    if (options.populate) {
        query = query
            .populate('reportedBy', 'name email role organizationName')
            .populate('assignedInvestigator', 'name email nic');
    }

    return await query;
};

/**
 * Find all cases with filtering and pagination
 * @param {Object} filters - Filter criteria
 * @param {string} filters.status - Filter by status
 * @param {string} filters.priority - Filter by priority
 * @param {string} filters.category - Filter by category
 * @param {string} filters.assignedInvestigator - Filter by assigned investigator
 * @param {string} filters.reportedBy - Filter by reporter
 * @param {string} filters.search - Search in title (case-insensitive)
 * @param {Object} pagination - Pagination options
 * @param {number} pagination.page - Page number (default: 1)
 * @param {number} pagination.limit - Items per page (default: 10)
 * @param {string} pagination.sort - Sort field (default: '-createdAt')
 * @returns {Promise<Array>} Array of case documents
 */
export const findAll = async (filters = {}, pagination = {}) => {
    const query = {};

    // Apply filters
    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.priority) {
        query.priority = filters.priority;
    }

    if (filters.category) {
        query.category = filters.category;
    }

    if (filters.assignedInvestigator) {
        query.assignedInvestigator = filters.assignedInvestigator;
    }

    if (filters.reportedBy) {
        query.reportedBy = filters.reportedBy;
    }

    if (filters.search) {
        query.title = { $regex: filters.search, $options: 'i' };
    }

    // Always exclude archived cases unless explicitly requested
    if (filters.includeArchived !== true) {
        query.isArchived = false;
    }

    // Pagination
    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const skip = (page - 1) * limit;
    const sort = pagination.sort || '-createdAt';

    return await Case.find(query)
        .populate('reportedBy', 'name email role organizationName')
        .populate('assignedInvestigator', 'name email nic')
        .sort(sort)
        .skip(skip)
        .limit(limit);
};

/**
 * Count cases matching filters
 * @param {Object} filters - Filter criteria
 * @returns {Promise<number>} Count of matching cases
 */
export const countCases = async (filters = {}) => {
    const query = {};

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.priority) {
        query.priority = filters.priority;
    }

    if (filters.category) {
        query.category = filters.category;
    }

    if (filters.assignedInvestigator) {
        query.assignedInvestigator = filters.assignedInvestigator;
    }

    if (filters.reportedBy) {
        query.reportedBy = filters.reportedBy;
    }

    if (filters.search) {
        query.title = { $regex: filters.search, $options: 'i' };
    }

    if (filters.includeArchived !== true) {
        query.isArchived = false;
    }

    return await Case.countDocuments(query);
};

/**
 * Update case by ID
 * @param {string} caseId - Case ID
 * @param {Object} updateData - Data to update
 * @param {Object} options - Update options
 * @param {boolean} options.activeOnly - Only update non-archived cases
 * @returns {Promise<Object|null>} Updated case document or null
 */
export const updateById = async (caseId, updateData, options = {}) => {
    const filter = { _id: caseId };

    if (options.activeOnly !== false) {
        filter.isArchived = false;
    }

    return await Case.findOneAndUpdate(filter, updateData, {
        new: true,
        runValidators: true,
    })
        .populate('reportedBy', 'name email role organizationName')
        .populate('assignedInvestigator', 'name email nic');
};

/**
 * Soft delete case by ID
 * @param {string} caseId - Case ID
 * @returns {Promise<Object|null>} Updated case document or null
 */
export const softDeleteById = async (caseId) => {
    return await Case.findByIdAndUpdate(
        caseId,
        { isArchived: true },
        { new: true }
    );
};

/**
 * Assign investigator to case
 * @param {string} caseId - Case ID
 * @param {string} investigatorId - Investigator user ID
 * @returns {Promise<Object|null>} Updated case document or null
 */
export const assignInvestigator = async (caseId, investigatorId) => {
    return await Case.findByIdAndUpdate(
        caseId,
        {
            assignedInvestigator: investigatorId,
            assignedAt: new Date(),
        },
        { new: true, runValidators: true }
    )
        .populate('reportedBy', 'name email role organizationName')
        .populate('assignedInvestigator', 'name email nic');
};

/**
 * Update case status
 * @param {string} caseId - Case ID
 * @param {string} newStatus - New status
 * @returns {Promise<Object|null>} Updated case document or null
 */
export const updateStatus = async (caseId, newStatus) => {
    return await Case.findByIdAndUpdate(
        caseId,
        { status: newStatus },
        { new: true, runValidators: true }
    )
        .populate('reportedBy', 'name email role organizationName')
        .populate('assignedInvestigator', 'name email nic');
};

/**
 * Check if case exists
 * @param {string} caseId - Case ID
 * @returns {Promise<boolean>} True if case exists
 */
export const caseExists = async (caseId) => {
    const caseDoc = await Case.findOne({ _id: caseId, isArchived: false });
    return !!caseDoc;
};
