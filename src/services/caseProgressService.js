import * as caseProgressRepository from '../repository/caseProgress.repository.js';
import * as caseRepository from '../repository/case.repository.js';
import * as userRepository from '../repository/user.repository.js';
import { sendVictimProgressUpdateEmail } from './email.service.js';

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

    // 4. Sync case status to the progress snapshot
    await caseRepository.updateStatus(caseId, progressData.statusSnapshot);

    // 5. Notify victim if assigned
    if (caseDoc.victim) {
        const victim = await userRepository.findById(caseDoc.victim);
        if (victim) {
            sendVictimProgressUpdateEmail({
                victimEmail: victim.email,
                victimName: victim.name,
                caseTitle: caseDoc.title,
                caseNumber: caseDoc.caseNumber,
                caseId: caseDoc._id.toString(),
                progressMessage: message,
                newStatus: progressData.statusSnapshot,
            }).catch(() => {});
        }
    }

    // 6. Return populated entry
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

/**
 * Update progress entry
 * Business Logic:
 * - Admin: Can update any entry
 * - Investigator: Can only update their own entries within 15 minutes of creation
 * @param {string} entryId - Progress entry ID
 * @param {Object} updateData - Data to update
 * @param {string} userId - User ID requesting update
 * @param {string} userRole - User role
 * @returns {Promise<Object>} Updated progress entry
 */
export const updateProgressEntry = async (entryId, updateData, userId, userRole) => {
    const entry = await caseProgressRepository.findById(entryId);

    if (!entry) {
        const error = new Error('Progress entry not found');
        error.statusCode = 404;
        throw error;
    }

    // RBAC & Time Window Logic
    if (userRole === 'INVESTIGATOR') {
        // 1. Check Ownership
        if (entry.updatedBy._id.toString() !== userId.toString()) {
            const error = new Error('Access forbidden. You can only edit your own progress updates.');
            error.statusCode = 403;
            throw error;
        }

        // 2. Check Time Window (15 minutes)
        const createdTime = new Date(entry.createdAt).getTime();
        const currentTime = new Date().getTime();
        const timeDiffMinutes = (currentTime - createdTime) / (1000 * 60);

        if (timeDiffMinutes > 15) {
            const error = new Error('Edit window expired. You can only edit progress updates within 15 minutes of creation.');
            error.statusCode = 400; // or 403
            throw error;
        }
    } else if (userRole !== 'ADMIN') {
        // NGO or others cannot edit
        const error = new Error('Access forbidden. Insufficient permissions.');
        error.statusCode = 403;
        throw error;
    }

    // Perform Update
    // Prevent updating critical fields like caseId or createdBy if sent
    const { caseId, updatedBy, createdAt, ...allowedUpdates } = updateData;

    return await caseProgressRepository.updateById(entryId, allowedUpdates);
};

/**
 * Delete progress entry
 * Business Logic:
 * - Only Admin can delete
 * @param {string} entryId - Progress entry ID
 * @param {string} userRole - User role
 * @returns {Promise<Object>} Success message/Deleted entry
 */
export const deleteProgressEntry = async (entryId, userRole) => {
    if (userRole !== 'ADMIN') {
        const error = new Error('Access forbidden. Only Administrators can delete progress updates.');
        error.statusCode = 403;
        throw error;
    }

    const entry = await caseProgressRepository.findById(entryId);
    if (!entry) {
        const error = new Error('Progress entry not found');
        error.statusCode = 404;
        throw error;
    }

    await caseProgressRepository.deleteById(entryId);
    return { message: 'Progress entry deleted successfully' };
};
