import Evidence from '../models/Evidence.js';

/**
 * Create a new evidence document
 * @param {Object} evidenceData
 * @returns {Promise<Object>} Created evidence
 */
export const create = async (evidenceData) => {
    return await Evidence.create(evidenceData);
};

/**
 * Find evidence by ID (excludes archived by default)
 * @param {string} id
 * @param {Object} options
 * @param {boolean} options.includeArchived - Include archived documents
 * @returns {Promise<Object|null>}
 */
export const findById = async (id, options = {}) => {
    const filter = { _id: id };
    if (!options.includeArchived) {
        filter.isArchived = false;
    }
    return await Evidence.findOne(filter)
        .populate('uploadedBy', 'name email role')
        .populate('verifiedBy', 'name email role')
        .populate('caseId', 'caseNumber title status')
        .populate('relatedProgressId', 'message statusSnapshot');
};

/**
 * Find all evidence for a case with pagination
 * @param {string} caseId
 * @param {Object} filters
 * @param {Object} pagination
 * @returns {Promise<Array>}
 */
export const findByCaseId = async (caseId, filters = {}, pagination = {}) => {
    const query = { caseId, isArchived: false };

    if (filters.fileCategory) {
        query.fileCategory = filters.fileCategory;
    }
    if (filters.accessLevel) {
        query.accessLevel = filters.accessLevel;
    }
    if (filters.isVerified !== undefined) {
        query.isVerified = filters.isVerified;
    }

    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const skip = (page - 1) * limit;
    const sort = pagination.sort || '-createdAt';

    return await Evidence.find(query)
        .populate('uploadedBy', 'name email role')
        .populate('verifiedBy', 'name email role')
        .sort(sort)
        .skip(skip)
        .limit(limit);
};

/**
 * Count evidence documents for a case
 * @param {string} caseId
 * @param {Object} filters
 * @returns {Promise<number>}
 */
export const countByCaseId = async (caseId, filters = {}) => {
    const query = { caseId, isArchived: false };

    if (filters.fileCategory) query.fileCategory = filters.fileCategory;
    if (filters.accessLevel) query.accessLevel = filters.accessLevel;
    if (filters.isVerified !== undefined) query.isVerified = filters.isVerified;

    return await Evidence.countDocuments(query);
};

/**
 * Update evidence by ID
 * @param {string} id
 * @param {Object} updateData
 * @returns {Promise<Object|null>}
 */
export const updateById = async (id, updateData) => {
    return await Evidence.findOneAndUpdate(
        { _id: id, isArchived: false },
        updateData,
        { new: true, runValidators: true }
    )
        .populate('uploadedBy', 'name email role')
        .populate('verifiedBy', 'name email role');
};

/**
 * Soft delete evidence by ID (set isArchived = true)
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export const softDeleteById = async (id) => {
    return await Evidence.findByIdAndUpdate(
        id,
        { isArchived: true },
        { new: true }
    );
};
