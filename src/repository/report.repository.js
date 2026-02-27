import Report from '../models/Report.js';

/**
 * Create a new saved report configuration.
 * @param {Object} data - Report data
 * @returns {Promise<Object>} Created report document
 */
export const create = async (data) => {
    const report = await Report.create(data);
    return report.populate('createdBy', 'name email role');
};

/**
 * Find a report by ID (non-archived only).
 * @param {string} reportId
 * @returns {Promise<Object|null>}
 */
export const findById = async (reportId) => {
    return await Report.findOne({ _id: reportId, isArchived: false }).populate(
        'createdBy',
        'name email role'
    );
};

/**
 * Find all saved reports with optional filtering and pagination.
 * @param {Object} filters
 * @param {string} [filters.createdBy]   - Filter by creator userId
 * @param {string} [filters.reportType]  - Filter by report type
 * @param {Object} pagination
 * @param {number} [pagination.page=1]
 * @param {number} [pagination.limit=10]
 * @returns {Promise<Array>}
 */
export const findAll = async (filters = {}, pagination = {}) => {
    const query = { isArchived: false };

    if (filters.createdBy) query.createdBy = filters.createdBy;
    if (filters.reportType) query.reportType = filters.reportType;

    const page = parseInt(pagination.page) || 1;
    const limit = parseInt(pagination.limit) || 10;
    const skip = (page - 1) * limit;

    return await Report.find(query)
        .populate('createdBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

/**
 * Count reports matching filters.
 * @param {Object} filters
 * @returns {Promise<number>}
 */
export const countReports = async (filters = {}) => {
    const query = { isArchived: false };
    if (filters.createdBy) query.createdBy = filters.createdBy;
    if (filters.reportType) query.reportType = filters.reportType;
    return await Report.countDocuments(query);
};

/**
 * Update a report configuration by ID.
 * @param {string} reportId
 * @param {Object} updateData
 * @returns {Promise<Object|null>}
 */
export const updateById = async (reportId, updateData) => {
    return await Report.findOneAndUpdate(
        { _id: reportId, isArchived: false },
        updateData,
        { new: true, runValidators: true }
    ).populate('createdBy', 'name email role');
};

/**
 * Soft-delete a report by setting isArchived = true.
 * @param {string} reportId
 * @returns {Promise<Object|null>}
 */
export const softDeleteById = async (reportId) => {
    return await Report.findByIdAndUpdate(
        reportId,
        { isArchived: true },
        { new: true }
    );
};
