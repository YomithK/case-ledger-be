import request from 'supertest';
import app from '../../app.js';
import {
    createAdminUser,
    createNGOUser,
    createInvestigatorUser,
    createCase,
    createProgressEntry,
    authHeader,
} from '../helpers/testHelpers.js';

describe('Case Progress Routes - Integration', () => {
    let admin, ngoUser, investigator, caseDoc;

    beforeEach(async () => {
        admin = await createAdminUser();
        ngoUser = await createNGOUser();
        investigator = await createInvestigatorUser();

        // Create a case and assign investigator
        caseDoc = await createCase(ngoUser._id, {
            status: 'UNDER_INVESTIGATION',
            assignedInvestigator: investigator._id,
        });
    });

    describe('POST /api/v1/cases/:id/progress', () => {
        it('should return 201 for INVESTIGATOR adding progress to assigned case', async () => {
            const res = await request(app)
                .post(`/api/v1/cases/${caseDoc._id}/progress`)
                .set(authHeader(investigator._id, 'INVESTIGATOR', investigator.email))
                .send({ message: 'Investigation started', statusSnapshot: 'UNDER_INVESTIGATION' });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
        });

        it('should return 403 for ADMIN adding progress (INVESTIGATOR-only route)', async () => {
            const res = await request(app)
                .post(`/api/v1/cases/${caseDoc._id}/progress`)
                .set(authHeader(admin._id, 'ADMIN', admin.email))
                .send({ message: 'Admin progress note', statusSnapshot: 'UNDER_INVESTIGATION' });

            expect(res.status).toBe(403);
        });

        it('should return 403 for NGO adding progress', async () => {
            const res = await request(app)
                .post(`/api/v1/cases/${caseDoc._id}/progress`)
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email))
                .send({ message: 'NGO attempt', statusSnapshot: 'UNDER_INVESTIGATION' });

            expect(res.status).toBe(403);
        });

        it('should return 400 when assigned investigator adds progress to CLOSED case', async () => {
            const closedCase = await createCase(ngoUser._id, {
                status: 'CLOSED',
                assignedInvestigator: investigator._id,
            });
            const res = await request(app)
                .post(`/api/v1/cases/${closedCase._id}/progress`)
                .set(authHeader(investigator._id, 'INVESTIGATOR', investigator.email))
                .send({ message: 'Post-close update', statusSnapshot: 'CLOSED' });

            expect(res.status).toBe(400);
        });

        it('should return 404 for non-existent case', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const res = await request(app)
                .post(`/api/v1/cases/${fakeId}/progress`)
                .set(authHeader(investigator._id, 'INVESTIGATOR', investigator.email))
                .send({ message: 'Update', statusSnapshot: 'UNDER_INVESTIGATION' });

            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/v1/cases/:id/progress', () => {
        beforeEach(async () => {
            await createProgressEntry(caseDoc._id, investigator._id);
        });

        it('should return 200 with progress timeline for ADMIN', async () => {
            const res = await request(app)
                .get(`/api/v1/cases/${caseDoc._id}/progress`)
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data.progress)).toBe(true);
        });

        it('should return 200 for assigned INVESTIGATOR', async () => {
            const res = await request(app)
                .get(`/api/v1/cases/${caseDoc._id}/progress`)
                .set(authHeader(investigator._id, 'INVESTIGATOR', investigator.email));

            expect(res.status).toBe(200);
        });

        it('should return 401 without token', async () => {
            const res = await request(app).get(`/api/v1/cases/${caseDoc._id}/progress`);
            expect(res.status).toBe(401);
        });
    });

    describe('PUT /api/v1/progress/:id', () => {
        it('should return 200 for ADMIN updating any progress entry', async () => {
            const entry = await createProgressEntry(caseDoc._id, investigator._id);
            const res = await request(app)
                .put(`/api/v1/progress/${entry._id}`)
                .set(authHeader(admin._id, 'ADMIN', admin.email))
                .send({ message: 'Admin updated message' });

            expect(res.status).toBe(200);
        });

        it('should return 200 for INVESTIGATOR updating own entry within time window', async () => {
            const entry = await createProgressEntry(caseDoc._id, investigator._id);
            const res = await request(app)
                .put(`/api/v1/progress/${entry._id}`)
                .set(authHeader(investigator._id, 'INVESTIGATOR', investigator.email))
                .send({ message: 'Updated within window' });

            expect(res.status).toBe(200);
        });

        it('should return 403 for NGO updating progress', async () => {
            const entry = await createProgressEntry(caseDoc._id, investigator._id);
            const res = await request(app)
                .put(`/api/v1/progress/${entry._id}`)
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email))
                .send({ message: 'NGO hack attempt' });

            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /api/v1/progress/:id', () => {
        it('should return 200 for ADMIN deleting a progress entry', async () => {
            const entry = await createProgressEntry(caseDoc._id, investigator._id);
            const res = await request(app)
                .delete(`/api/v1/progress/${entry._id}`)
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
        });

        it('should return 403 for INVESTIGATOR deleting progress entry', async () => {
            const entry = await createProgressEntry(caseDoc._id, investigator._id);
            const res = await request(app)
                .delete(`/api/v1/progress/${entry._id}`)
                .set(authHeader(investigator._id, 'INVESTIGATOR', investigator.email));

            expect(res.status).toBe(403);
        });
    });
});
// Coverage: POST/GET /cases/:id/progress, PUT/DELETE /progress/:id with time window
