jest.mock('../../../repository/caseProgress.repository.js');
jest.mock('../../../repository/case.repository.js');

import * as caseProgressService from '../../../services/caseProgressService.js';
import * as caseProgressRepository from '../../../repository/caseProgress.repository.js';
import * as caseRepository from '../../../repository/case.repository.js';
import mongoose from 'mongoose';

const caseId = new mongoose.Types.ObjectId();
const adminId = new mongoose.Types.ObjectId();
const investigatorId = new mongoose.Types.ObjectId();
const ngoId = new mongoose.Types.ObjectId();
const entryId = new mongoose.Types.ObjectId();

const mockActiveCase = {
    _id: caseId,
    status: 'UNDER_INVESTIGATION',
    assignedInvestigator: investigatorId,
    isArchived: false,
};

const mockEntry = {
    _id: entryId,
    caseId,
    message: 'Progress update',
    updatedBy: { _id: investigatorId, toString: () => investigatorId.toString() },
    createdAt: new Date(),
};

describe('caseProgress service', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('createProgressEntry', () => {
        it('should throw 404 when case not found', async () => {
            caseRepository.findById.mockResolvedValue(null);
            await expect(caseProgressService.createProgressEntry({
                caseId, message: 'Update', statusSnapshot: 'UNDER_INVESTIGATION', updatedBy: investigatorId,
            })).rejects.toMatchObject({ statusCode: 404 });
        });

        it('should throw 400 for CLOSED case', async () => {
            caseRepository.findById.mockResolvedValue({ ...mockActiveCase, status: 'CLOSED' });
            await expect(caseProgressService.createProgressEntry({
                caseId, message: 'Update', updatedBy: investigatorId,
            })).rejects.toMatchObject({ statusCode: 400 });
        });

        it('should create entry and use case status as default snapshot', async () => {
            caseRepository.findById.mockResolvedValue(mockActiveCase);
            const created = { _id: entryId, caseId, statusSnapshot: 'UNDER_INVESTIGATION' };
            caseProgressRepository.create.mockResolvedValue(created);
            caseProgressRepository.findById.mockResolvedValue(created);
            caseRepository.updateStatus.mockResolvedValue({ ...mockActiveCase, status: 'UNDER_INVESTIGATION' });

            await caseProgressService.createProgressEntry({
                caseId, message: 'Progress', updatedBy: investigatorId,
            });

            const createArgs = caseProgressRepository.create.mock.calls[0][0];
            expect(createArgs.statusSnapshot).toBe('UNDER_INVESTIGATION');
        });

        it('should update the case status to the progress snapshot after creation', async () => {
            caseRepository.findById.mockResolvedValue(mockActiveCase);
            const created = { _id: entryId, caseId, statusSnapshot: 'EVIDENCE_COLLECTED' };
            caseProgressRepository.create.mockResolvedValue(created);
            caseProgressRepository.findById.mockResolvedValue(created);
            caseRepository.updateStatus.mockResolvedValue({ ...mockActiveCase, status: 'EVIDENCE_COLLECTED' });

            await caseProgressService.createProgressEntry({
                caseId, message: 'Evidence gathered', statusSnapshot: 'EVIDENCE_COLLECTED', updatedBy: investigatorId,
            });

            expect(caseRepository.updateStatus).toHaveBeenCalledWith(caseId, 'EVIDENCE_COLLECTED');
        });
    });

    describe('getCaseProgress', () => {
        it('should throw 404 when case not found', async () => {
            caseRepository.findById.mockResolvedValue(null);
            await expect(caseProgressService.getCaseProgress(caseId))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should return progress entries when case exists', async () => {
            caseRepository.findById.mockResolvedValue(mockActiveCase);
            caseProgressRepository.findByCaseId.mockResolvedValue([mockEntry]);

            const result = await caseProgressService.getCaseProgress(caseId);
            expect(result).toHaveLength(1);
        });
    });

    describe('updateProgressEntry', () => {
        it('should throw 404 when entry not found', async () => {
            caseProgressRepository.findById.mockResolvedValue(null);
            await expect(caseProgressService.updateProgressEntry(entryId, {}, adminId, 'ADMIN'))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should throw 403 for NGO users', async () => {
            caseProgressRepository.findById.mockResolvedValue(mockEntry);
            await expect(caseProgressService.updateProgressEntry(entryId, {}, ngoId, 'NGO'))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should throw 403 for investigator editing another\'s entry', async () => {
            const otherInvestigator = new mongoose.Types.ObjectId();
            caseProgressRepository.findById.mockResolvedValue(mockEntry);
            await expect(caseProgressService.updateProgressEntry(entryId, {}, otherInvestigator, 'INVESTIGATOR'))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should throw 400 for investigator editing after 15-min window', async () => {
            const oldEntry = {
                ...mockEntry,
                updatedBy: { _id: investigatorId, toString: () => investigatorId.toString() },
                createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 mins ago
            };
            caseProgressRepository.findById.mockResolvedValue(oldEntry);

            await expect(caseProgressService.updateProgressEntry(entryId, {}, investigatorId, 'INVESTIGATOR'))
                .rejects.toMatchObject({ statusCode: 400 });
        });

        it('should allow ADMIN to edit any entry at any time', async () => {
            const oldEntry = { ...mockEntry, createdAt: new Date(Date.now() - 60 * 60 * 1000) };
            caseProgressRepository.findById.mockResolvedValue(oldEntry);
            caseProgressRepository.updateById.mockResolvedValue({ ...oldEntry, message: 'Updated' });

            const result = await caseProgressService.updateProgressEntry(entryId, { message: 'Updated' }, adminId, 'ADMIN');
            expect(result).toBeDefined();
        });
    });

    describe('deleteProgressEntry', () => {
        it('should throw 403 for non-ADMIN', async () => {
            await expect(caseProgressService.deleteProgressEntry(entryId, 'INVESTIGATOR'))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should throw 404 when entry not found', async () => {
            caseProgressRepository.findById.mockResolvedValue(null);
            await expect(caseProgressService.deleteProgressEntry(entryId, 'ADMIN'))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should delete entry for ADMIN', async () => {
            caseProgressRepository.findById.mockResolvedValue(mockEntry);
            caseProgressRepository.deleteById.mockResolvedValue(true);

            const result = await caseProgressService.deleteProgressEntry(entryId, 'ADMIN');
            expect(result.message).toMatch(/deleted/i);
        });
    });
});
