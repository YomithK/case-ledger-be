import CaseProgress from '../models/CaseProgress.js';

/**
 * Create new case progress entry
 * @param {Object} progressData - Progress data
 * @returns {Promise<Object>} Created progress document
 */
export const create = async (progressData) => {
    return await CaseProgress.create(progressData);
};

/**
 * Find progress entries by case ID
 * @param {string} caseId - Case ID
 * @param {Object} options - Query options
 * @param {string} options.sort - Sort order (default: '-createdAt')
 * @returns {Promise<Array>} List of progress entries
 */
export const findByCaseId = async (caseId, options = {}) => {
    const sort = options.sort || '-createdAt';

    return await CaseProgress.find({ caseId })
        .populate('updatedBy', 'name email role')
        .sort(sort);
};

/**
 * Find progress entry by ID
 * @param {string} id - Progress ID
 * @returns {Promise<Object|null>} Progress document or null
 */
export const findById = async (id) => {
    return await CaseProgress.findById(id)
        .populate('updatedBy', 'name email role');
};

/**
 * Update progress entry by ID
 * @param {string} id - Progress ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object|null>} Updated progress document or null
 */
export const updateById = async (id, updateData) => {
    return await CaseProgress.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    ).populate('updatedBy', 'name email role');
};

/**
 * Delete progress entry by ID
 * @param {string} id - Progress ID
 * @returns {Promise<Object|null>} Deleted progress document or null
 */
export const deleteById = async (id) => {
    return await CaseProgress.findByIdAndDelete(id);
};
