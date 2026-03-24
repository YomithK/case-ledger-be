jest.mock('../../../repository/case.repository.js');
jest.mock('../../../repository/user.repository.js');

import * as caseService from '../../../services/case.service.js';
import * as caseRepository from '../../../repository/case.repository.js';
import * as userRepository from '../../../repository/user.repository.js';
import mongoose from 'mongoose';

const adminId = new mongoose.Types.ObjectId();
const ngoId = new mongoose.Types.ObjectId();
const investigatorId = new mongoose.Types.ObjectId();
const caseId = new mongoose.Types.ObjectId();

const mockCase = {
    _id: caseId,
    title: 'Test Case',
    status: 'REPORTED',
    reportedBy: { _id: ngoId, toString: () => ngoId.toString() },
    assignedInvestigator: null,
    isArchived: false,
    toString: () => caseId.toString(),
};

const mockInvestigator = {
    _id: investigatorId,
    role: 'INVESTIGATOR',
    isActive: true,
};

describe('case service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createCase', () => {
        it('should throw 403 for non-NGO users', async () => {
            await expect(caseService.createCase({}, adminId, 'ADMIN'))
                .rejects.toMatchObject({ statusCode: 403 });
            await expect(caseService.createCase({}, investigatorId, 'INVESTIGATOR'))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should create and return case for NGO user', async () => {
            const created = { _id: caseId, ...mockCase };
            caseRepository.create.mockResolvedValue(created);
            caseRepository.findById.mockResolvedValue(created);

            const result = await caseService.createCase(
                { title: 'Test', description: 'Desc', category: 'OTHER', incidentDate: new Date('2025-01-01'), location: 'Colombo' },
                ngoId, 'NGO'
            );

            expect(caseRepository.create).toHaveBeenCalledTimes(1);
            expect(result).toBeDefined();
        });
    });

    describe('getCases', () => {
        it('should filter by reportedBy for NGO users', async () => {
            caseRepository.findAll.mockResolvedValue([]);
            caseRepository.countCases.mockResolvedValue(0);

            await caseService.getCases({}, {}, ngoId, 'NGO');

            const filtersUsed = caseRepository.findAll.mock.calls[0][0];
            expect(filtersUsed.reportedBy).toBe(ngoId);
        });

        it('should filter by assignedInvestigator for INVESTIGATOR', async () => {
            caseRepository.findAll.mockResolvedValue([]);
            caseRepository.countCases.mockResolvedValue(0);

            await caseService.getCases({}, {}, investigatorId, 'INVESTIGATOR');

            const filtersUsed = caseRepository.findAll.mock.calls[0][0];
            expect(filtersUsed.assignedInvestigator).toBe(investigatorId);
        });

        it('should apply no extra filter for ADMIN', async () => {
            caseRepository.findAll.mockResolvedValue([]);
            caseRepository.countCases.mockResolvedValue(0);

            await caseService.getCases({}, {}, adminId, 'ADMIN');

            const filtersUsed = caseRepository.findAll.mock.calls[0][0];
            expect(filtersUsed.reportedBy).toBeUndefined();
            expect(filtersUsed.assignedInvestigator).toBeUndefined();
        });
    });

    describe('getCaseById', () => {
        it('should throw 404 when case not found', async () => {
            caseRepository.findById.mockResolvedValue(null);
            await expect(caseService.getCaseById(caseId, adminId, 'ADMIN'))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should throw 403 for NGO viewing another NGO\'s case', async () => {
            const otherNgoId = new mongoose.Types.ObjectId();
            caseRepository.findById.mockResolvedValue(mockCase);

            await expect(caseService.getCaseById(caseId, otherNgoId, 'NGO'))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should throw 403 for unassigned investigator', async () => {
            caseRepository.findById.mockResolvedValue({ ...mockCase, assignedInvestigator: null });

            await expect(caseService.getCaseById(caseId, investigatorId, 'INVESTIGATOR'))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should return case for ADMIN regardless of assignment', async () => {
            caseRepository.findById.mockResolvedValue(mockCase);
            const result = await caseService.getCaseById(caseId, adminId, 'ADMIN');
            expect(result).toBeDefined();
        });
    });

    describe('updateCase', () => {
        it('should throw 404 when case not found', async () => {
            caseRepository.findById.mockResolvedValue(null);
            await expect(caseService.updateCase(caseId, {}, adminId, 'ADMIN'))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should throw 400 for CLOSED cases', async () => {
            caseRepository.findById.mockResolvedValue({ ...mockCase, status: 'CLOSED' });
            await expect(caseService.updateCase(caseId, {}, adminId, 'ADMIN'))
                .rejects.toMatchObject({ statusCode: 400 });
        });

        it('should throw 400 for REJECTED cases', async () => {
            caseRepository.findById.mockResolvedValue({ ...mockCase, status: 'REJECTED' });
            await expect(caseService.updateCase(caseId, {}, adminId, 'ADMIN'))
                .rejects.toMatchObject({ statusCode: 400 });
        });

        it('should throw 403 for NGO users', async () => {
            caseRepository.findById.mockResolvedValue(mockCase);
            await expect(caseService.updateCase(caseId, {}, ngoId, 'NGO'))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should update for ADMIN', async () => {
            caseRepository.findById.mockResolvedValue(mockCase);
            caseRepository.updateById.mockResolvedValue({ ...mockCase, title: 'Updated' });

            const result = await caseService.updateCase(caseId, { title: 'Updated' }, adminId, 'ADMIN');
            expect(result.title).toBe('Updated');
        });
    });

    describe('assignInvestigator', () => {
        it('should throw 403 for INVESTIGATOR role', async () => {
            await expect(caseService.assignInvestigator(caseId, investigatorId, 'INVESTIGATOR'))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should throw 404 when case not found', async () => {
            caseRepository.findById.mockResolvedValue(null);
            await expect(caseService.assignInvestigator(caseId, investigatorId, 'ADMIN'))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should throw 400 when target user is not INVESTIGATOR role', async () => {
            caseRepository.findById.mockResolvedValue(mockCase);
            userRepository.findById.mockResolvedValue({ _id: ngoId, role: 'NGO' });

            await expect(caseService.assignInvestigator(caseId, ngoId, 'ADMIN'))
                .rejects.toMatchObject({ statusCode: 400 });
        });

        it('should assign investigator for ADMIN', async () => {
            caseRepository.findById.mockResolvedValue(mockCase);
            userRepository.findById.mockResolvedValue(mockInvestigator);
            caseRepository.assignInvestigator.mockResolvedValue({ ...mockCase, assignedInvestigator: investigatorId });

            const result = await caseService.assignInvestigator(caseId, investigatorId, 'ADMIN');
            expect(result).toBeDefined();
        });
    });

    describe('updateStatus', () => {
        it('should throw 404 when case not found', async () => {
            caseRepository.findById.mockResolvedValue(null);
            await expect(caseService.updateStatus(caseId, 'UNDER_INVESTIGATION', adminId, 'ADMIN'))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should throw 400 for invalid status transition (REPORTED → RESOLVED)', async () => {
            caseRepository.findById.mockResolvedValue({ ...mockCase, status: 'REPORTED' });
            await expect(caseService.updateStatus(caseId, 'RESOLVED', adminId, 'ADMIN'))
                .rejects.toMatchObject({ statusCode: 400 });
        });

        it('should allow valid transition REPORTED → UNDER_INVESTIGATION', async () => {
            caseRepository.findById.mockResolvedValue({ ...mockCase, status: 'REPORTED' });
            caseRepository.updateStatus.mockResolvedValue({ ...mockCase, status: 'UNDER_INVESTIGATION' });

            const result = await caseService.updateStatus(caseId, 'UNDER_INVESTIGATION', adminId, 'ADMIN');
            expect(result.status).toBe('UNDER_INVESTIGATION');
        });

        it('should throw 403 for NGO users', async () => {
            caseRepository.findById.mockResolvedValue(mockCase);
            await expect(caseService.updateStatus(caseId, 'UNDER_INVESTIGATION', ngoId, 'NGO'))
                .rejects.toMatchObject({ statusCode: 403 });
        });
    });

    describe('deleteCase', () => {
        it('should throw 403 for non-ADMIN', async () => {
            await expect(caseService.deleteCase(caseId, 'NGO'))
                .rejects.toMatchObject({ statusCode: 403 });
            await expect(caseService.deleteCase(caseId, 'INVESTIGATOR'))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should soft-delete for ADMIN', async () => {
            caseRepository.findById.mockResolvedValue(mockCase);
            caseRepository.softDeleteById.mockResolvedValue({ ...mockCase, isArchived: true });

            const result = await caseService.deleteCase(caseId, 'ADMIN');
            expect(result.message).toMatch(/deleted/i);
        });
    });
});
