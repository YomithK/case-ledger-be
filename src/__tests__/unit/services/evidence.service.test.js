jest.mock('../../../repository/evidence.repository.js');
jest.mock('../../../repository/case.repository.js');
jest.mock('../../../repository/caseProgress.repository.js');
jest.mock('../../../config/cloudinary.js', () => ({
    __esModule: true,
    default: {
        uploader: {
            destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
        },
    },
}));

import * as evidenceService from '../../../services/evidence.service.js';
import * as evidenceRepository from '../../../repository/evidence.repository.js';
import * as caseRepository from '../../../repository/case.repository.js';
import * as caseProgressRepository from '../../../repository/caseProgress.repository.js';
import cloudinary from '../../../config/cloudinary.js';
import mongoose from 'mongoose';

const adminId = new mongoose.Types.ObjectId();
const investigatorId = new mongoose.Types.ObjectId();
const ngoId = new mongoose.Types.ObjectId();
const caseId = new mongoose.Types.ObjectId();
const evidenceId = new mongoose.Types.ObjectId();
const progressId = new mongoose.Types.ObjectId();

const mockCase = {
    _id: caseId,
    status: 'UNDER_INVESTIGATION',
    assignedInvestigator: investigatorId,
    reportedBy: ngoId,
    isArchived: false,
    toString: () => caseId.toString(),
};

const mockEvidence = {
    _id: evidenceId,
    caseId,
    fileUrl: 'https://res.cloudinary.com/test/image.jpg',
    publicId: 'test/image_123',
    fileCategory: 'PHOTO',
    isVerified: false,
    isArchived: false,
    accessLevel: 'INTERNAL',
    uploadedBy: { _id: investigatorId, toString: () => investigatorId.toString() },
};

const mockFile = {
    path: 'https://res.cloudinary.com/test/image.jpg',
    filename: 'test/image_123',
    originalname: 'photo.jpg',
    mimetype: 'image/jpeg',
    size: 102400,
};

describe('evidence service', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('uploadEvidence', () => {
        it('should throw 404 when case not found', async () => {
            caseRepository.findById.mockResolvedValue(null);
            await expect(evidenceService.uploadEvidence(caseId, mockFile, {}, { userId: adminId, role: 'ADMIN' }))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should throw 400 for CLOSED case', async () => {
            caseRepository.findById.mockResolvedValue({ ...mockCase, status: 'CLOSED' });
            await expect(evidenceService.uploadEvidence(caseId, mockFile, {}, { userId: adminId, role: 'ADMIN' }))
                .rejects.toMatchObject({ statusCode: 400 });
        });

        it('should throw 403 for unassigned investigator', async () => {
            const otherId = new mongoose.Types.ObjectId();
            caseRepository.findById.mockResolvedValue(mockCase);

            await expect(evidenceService.uploadEvidence(caseId, mockFile, {}, { userId: otherId, role: 'INVESTIGATOR' }))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should create evidence for assigned investigator', async () => {
            caseRepository.findById.mockResolvedValue(mockCase);
            evidenceRepository.create.mockResolvedValue({ _id: evidenceId });
            caseProgressRepository.create.mockResolvedValue({ _id: progressId });
            evidenceRepository.updateById.mockResolvedValue({});
            evidenceRepository.findById.mockResolvedValue(mockEvidence);

            const result = await evidenceService.uploadEvidence(
                caseId, mockFile, { description: 'Photo' },
                { userId: investigatorId, role: 'INVESTIGATOR' }
            );
            expect(result).toBeDefined();
            expect(evidenceRepository.create).toHaveBeenCalledTimes(1);
        });
    });

    describe('getEvidenceById', () => {
        it('should throw 404 when evidence not found', async () => {
            evidenceRepository.findById.mockResolvedValue(null);
            await expect(evidenceService.getEvidenceById(evidenceId, { userId: adminId, role: 'ADMIN' }))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should return evidence for ADMIN', async () => {
            evidenceRepository.findById.mockResolvedValue(mockEvidence);
            const result = await evidenceService.getEvidenceById(evidenceId, { userId: adminId, role: 'ADMIN' });
            expect(result).toBeDefined();
        });
    });

    describe('updateEvidence', () => {
        it('should throw 404 when evidence not found', async () => {
            evidenceRepository.findById.mockResolvedValue(null);
            await expect(evidenceService.updateEvidence(evidenceId, {}, { userId: adminId, role: 'ADMIN' }))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should throw 403 for non-ADMIN non-uploader', async () => {
            const outsider = new mongoose.Types.ObjectId();
            evidenceRepository.findById.mockResolvedValue(mockEvidence);
            await expect(evidenceService.updateEvidence(evidenceId, {}, { userId: outsider, role: 'NGO' }))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should update description and tags for ADMIN', async () => {
            evidenceRepository.findById.mockResolvedValue(mockEvidence);
            evidenceRepository.updateById.mockResolvedValue({ ...mockEvidence, description: 'Updated' });

            const result = await evidenceService.updateEvidence(
                evidenceId, { description: 'Updated' }, { userId: adminId, role: 'ADMIN' }
            );
            expect(result).toBeDefined();
        });
    });

    describe('verifyEvidence', () => {
        it('should throw 403 for non-ADMIN', async () => {
            await expect(evidenceService.verifyEvidence(evidenceId, { userId: investigatorId, role: 'INVESTIGATOR' }))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should throw 404 when evidence not found', async () => {
            evidenceRepository.findById.mockResolvedValue(null);
            await expect(evidenceService.verifyEvidence(evidenceId, { userId: adminId, role: 'ADMIN' }))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should throw 400 when already verified', async () => {
            evidenceRepository.findById.mockResolvedValue({ ...mockEvidence, isVerified: true });
            await expect(evidenceService.verifyEvidence(evidenceId, { userId: adminId, role: 'ADMIN' }))
                .rejects.toMatchObject({ statusCode: 400 });
        });

        it('should verify evidence for ADMIN', async () => {
            evidenceRepository.findById.mockResolvedValue(mockEvidence);
            evidenceRepository.updateById.mockResolvedValue({ ...mockEvidence, isVerified: true });

            const result = await evidenceService.verifyEvidence(evidenceId, { userId: adminId, role: 'ADMIN' });
            expect(result).toBeDefined();
        });
    });

    describe('deleteEvidence', () => {
        it('should throw 403 for non-ADMIN', async () => {
            await expect(evidenceService.deleteEvidence(evidenceId, { userId: investigatorId, role: 'INVESTIGATOR' }))
                .rejects.toMatchObject({ statusCode: 403 });
        });

        it('should throw 404 when evidence not found', async () => {
            evidenceRepository.findById.mockResolvedValue(null);
            await expect(evidenceService.deleteEvidence(evidenceId, { userId: adminId, role: 'ADMIN' }))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should delete from Cloudinary and soft-delete from DB', async () => {
            evidenceRepository.findById.mockResolvedValue(mockEvidence);
            evidenceRepository.softDeleteById.mockResolvedValue({ ...mockEvidence, isArchived: true });

            const result = await evidenceService.deleteEvidence(evidenceId, { userId: adminId, role: 'ADMIN' });
            expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(mockEvidence.publicId, { resource_type: 'auto' });
            expect(result.message).toMatch(/deleted/i);
        });
    });
});
