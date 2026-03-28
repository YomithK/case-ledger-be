// Mock upload middleware to bypass Cloudinary and inject a fake req.file
jest.mock('../../middleware/upload.middleware.js', () => ({
    __esModule: true,
    default: {
        single: () => (req, res, next) => {
            // Ensure req.body is set before injecting file
            if (!req.body) req.body = {};
            req.file = {
                path: 'https://res.cloudinary.com/test/image/upload/v1/test/photo.jpg',
                filename: 'test/evidence_photo',
                originalname: 'test-photo.jpg',
                mimetype: 'image/jpeg',
                size: 102400,
            };
            next();
        },
    },
}));

// Mock Cloudinary to prevent real API calls on delete
jest.mock('../../config/cloudinary.js', () => ({
    __esModule: true,
    default: {
        uploader: {
            destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
            upload_stream: jest.fn(),
        },
    },
}));

import request from 'supertest';
import app from '../../app.js';
import {
    createAdminUser,
    createNGOUser,
    createInvestigatorUser,
    createCase,
    createEvidence,
    authHeader,
} from '../helpers/testHelpers.js';

describe('Evidence Routes - Integration', () => {
    let admin, ngoUser, investigator, caseDoc;

    beforeEach(async () => {
        admin = await createAdminUser();
        ngoUser = await createNGOUser();
        investigator = await createInvestigatorUser();

        caseDoc = await createCase(ngoUser._id, {
            status: 'UNDER_INVESTIGATION',
            assignedInvestigator: investigator._id,
        });
    });

    describe('POST /api/v1/cases/:caseId/evidence', () => {
        it('should return 201 for assigned INVESTIGATOR uploading evidence', async () => {
            const res = await request(app)
                .post(`/api/v1/cases/${caseDoc._id}/evidence`)
                .set(authHeader(investigator._id, 'INVESTIGATOR', investigator.email))
                .send({ description: 'Key evidence photo' });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.evidence).toBeDefined();
        });

        it('should return 201 for ADMIN uploading evidence', async () => {
            const res = await request(app)
                .post(`/api/v1/cases/${caseDoc._id}/evidence`)
                .set(authHeader(admin._id, 'ADMIN', admin.email))
                .send({ description: 'Admin evidence' });

            expect(res.status).toBe(201);
        });

        it('should return 403 for unassigned investigator', async () => {
            const otherInvestigator = await createInvestigatorUser({
                email: `other_inv_${Date.now()}@test.com`,
                nic: `${String(Date.now()).slice(-9)}X`,
            });

            const res = await request(app)
                .post(`/api/v1/cases/${caseDoc._id}/evidence`)
                .set(authHeader(otherInvestigator._id, 'INVESTIGATOR', otherInvestigator.email))
                .send({ description: 'Unauthorized upload' });

            expect(res.status).toBe(403);
        });

        it('should return 403 for NGO trying to upload', async () => {
            const res = await request(app)
                .post(`/api/v1/cases/${caseDoc._id}/evidence`)
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email))
                .send({ description: 'NGO upload attempt' });

            expect(res.status).toBe(403);
        });
    });

    describe('GET /api/v1/cases/:caseId/evidence', () => {
        beforeEach(async () => {
            await createEvidence(caseDoc._id, investigator._id);
        });

        it('should return 200 for ADMIN listing evidence', async () => {
            const res = await request(app)
                .get(`/api/v1/cases/${caseDoc._id}/evidence`)
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data.evidence)).toBe(true);
        });

        it('should return 200 for assigned INVESTIGATOR', async () => {
            const res = await request(app)
                .get(`/api/v1/cases/${caseDoc._id}/evidence`)
                .set(authHeader(investigator._id, 'INVESTIGATOR', investigator.email));

            expect(res.status).toBe(200);
        });

        it('should return 200 for NGO viewing their case evidence', async () => {
            // NGO can see PUBLIC evidence for their own cases
            await createEvidence(caseDoc._id, investigator._id, { accessLevel: 'PUBLIC' });

            const res = await request(app)
                .get(`/api/v1/cases/${caseDoc._id}/evidence`)
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email));

            expect(res.status).toBe(200);
        });
    });

    describe('GET /api/v1/evidence/:id', () => {
        it('should return 200 for ADMIN', async () => {
            const ev = await createEvidence(caseDoc._id, investigator._id);
            const res = await request(app)
                .get(`/api/v1/evidence/${ev._id}`)
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
        });

        it('should return 404 for non-existent evidence', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const res = await request(app)
                .get(`/api/v1/evidence/${fakeId}`)
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/v1/evidence/:id', () => {
        it('should return 200 for ADMIN updating evidence metadata', async () => {
            const ev = await createEvidence(caseDoc._id, investigator._id);
            const res = await request(app)
                .put(`/api/v1/evidence/${ev._id}`)
                .set(authHeader(admin._id, 'ADMIN', admin.email))
                .send({ description: 'Updated description', tags: ['important'] });

            expect(res.status).toBe(200);
        });

        it('should return 403 for unrelated NGO', async () => {
            const ev = await createEvidence(caseDoc._id, investigator._id);
            const res = await request(app)
                .put(`/api/v1/evidence/${ev._id}`)
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email))
                .send({ description: 'NGO hack' });

            expect(res.status).toBe(403);
        });
    });

    describe('PUT /api/v1/evidence/:id/verify', () => {
        it('should return 200 for ADMIN verifying evidence', async () => {
            const ev = await createEvidence(caseDoc._id, investigator._id);
            const res = await request(app)
                .put(`/api/v1/evidence/${ev._id}/verify`)
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
        });

        it('should return 403 for INVESTIGATOR verifying evidence', async () => {
            const ev = await createEvidence(caseDoc._id, investigator._id);
            const res = await request(app)
                .put(`/api/v1/evidence/${ev._id}/verify`)
                .set(authHeader(investigator._id, 'INVESTIGATOR', investigator.email));

            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /api/v1/evidence/:id', () => {
        it('should return 200 for ADMIN deleting evidence', async () => {
            const ev = await createEvidence(caseDoc._id, investigator._id);
            const res = await request(app)
                .delete(`/api/v1/evidence/${ev._id}`)
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
        });

        it('should return 403 for INVESTIGATOR deleting evidence', async () => {
            const ev = await createEvidence(caseDoc._id, investigator._id);
            const res = await request(app)
                .delete(`/api/v1/evidence/${ev._id}`)
                .set(authHeader(investigator._id, 'INVESTIGATOR', investigator.email));

            expect(res.status).toBe(403);
        });
    });
});
// Coverage: POST/GET /cases/:caseId/evidence, GET/PUT/DELETE/verify /evidence/:id
