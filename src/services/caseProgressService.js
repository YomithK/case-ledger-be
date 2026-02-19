import * as caseProgressRepository from '../repository/caseProgress.repository.js';
import * as caseRepository from '../repository/case.repository.js';

/**
 * Create a new progress entry for a case
 * Business Logic:
 * - Validates that the case exists
 * - Validates that the case is not CLOSED (unless re-opening rules apply, but for now strict check)
 * - Creates the progress entry
 * 
 * @param {Object} entryData - Data for the progress entry
 * @param {string} entryData.caseId - The ID of the case
 * @param {string} entryData.statusSnapshot - The status of the case at the time of update
 * @param {string} entryData.message - Description of the progress
 * @param {Array<string>} entryData.files - Array of file URLs/paths
 * @param {string} entryData.updatedBy - User ID of the person making the update
 * @returns {Promise<Object>} Created progress entry
 * @throws {Error} If case not found or case is closed
 */
export const createProgressEntry = async ({ caseId, statusSnapshot, message, files, updatedBy }) => {
    // 1. Verify Case Exists and Check Status
    const caseDoc = await caseRepository.findById(caseId, { activeOnly: true });

    if (!caseDoc) {
        const error = new Error('Case not found');
        error.statusCode = 404;
        throw error;
    }

    // Constraint: Cannot add progress if Case status is CLOSED
    // Note: If the logic intends to allow "Re-opening" a case, this check might need adjustment,
    // but the requirement says "Cannot add progress if Case status is CLOSED".
    if (caseDoc.status === 'CLOSED') {
        const error = new Error('Cannot add progress updates to a CLOSED case');
        error.statusCode = 400;
        throw error;
    }

    // 2. Prepare data
    const progressData = {
        caseId,
        statusSnapshot: statusSnapshot || caseDoc.status, // Use current case status if not provided
        message,
        files: files || [],
        updatedBy
    };

    // 3. Create Entry
    const newEntry = await caseProgressRepository.create(progressData);

    // 4. Return populated entry
    return await caseProgressRepository.findById(newEntry._id);
};

/**
 * Get progress timeline for a case
 * @param {string} caseId - Case ID
 * @returns {Promise<Array>} List of progress entries (newest first)
 */
export const getCaseProgress = async (caseId) => {
    const caseDoc = await caseRepository.findById(caseId, { activeOnly: true });
    if (!caseDoc) {
        const error = new Error('Case not found');
        error.statusCode = 404;
        throw error;
    }

    return await caseProgressRepository.findByCaseId(caseId);
};
