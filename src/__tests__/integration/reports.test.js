import request from 'supertest';
import app from '../../app.js';
import {
    createAdminUser,
    createNGOUser,
    createInvestigatorUser,
    authHeader,
} from '../helpers/testHelpers.js';

const REPORT_PAYLOAD = {
    name: 'Monthly Case Summary',
    description: 'Summary of all cases for the month',
    reportType: 'CASE_ANALYTICS',
};

describe('Report Routes - Integration', () => {
    let admin, ngoUser, investigator;

    beforeEach(async () => {
        admin = await createAdminUser();
        ngoUser = await createNGOUser();
        investigator = await createInvestigatorUser();
    });

    describe('GET /api/v1/reports/dashboard/summary', () => {
        it('should return 200 for ADMIN with new summary fields', async () => {
            const res = await request(app)
                .get('/api/v1/reports/dashboard/summary')
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('totalCases');
            expect(res.body.data).toHaveProperty('totalEvidence');
            expect(res.body.data).toHaveProperty('totalUsers');
            expect(Array.isArray(res.body.data.casesByStatus)).toBe(true);
            expect(Array.isArray(res.body.data.casesByPriority)).toBe(true);
        });

        it('should return 403 for NGO', async () => {
            const res = await request(app)
                .get('/api/v1/reports/dashboard/summary')
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email));

            expect(res.status).toBe(403);
        });

        it('should return 403 for INVESTIGATOR', async () => {
            const res = await request(app)
                .get('/api/v1/reports/dashboard/summary')
                .set(authHeader(investigator._id, 'INVESTIGATOR', investigator.email));

            expect(res.status).toBe(403);
        });
    });

    describe('GET /api/v1/reports/cases/by-status', () => {
        it('should return 200 for ADMIN', async () => {
            const res = await request(app)
                .get('/api/v1/reports/cases/by-status')
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should return 200 for NGO (own cases only)', async () => {
            const res = await request(app)
                .get('/api/v1/reports/cases/by-status')
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email));

            expect(res.status).toBe(200);
        });

        it('should return 403 for INVESTIGATOR', async () => {
            const res = await request(app)
                .get('/api/v1/reports/cases/by-status')
                .set(authHeader(investigator._id, 'INVESTIGATOR', investigator.email));

            expect(res.status).toBe(403);
        });
    });

    describe('GET /api/v1/reports/cases/by-priority', () => {
        it('should return 200 for ADMIN', async () => {
            const res = await request(app)
                .get('/api/v1/reports/cases/by-priority')
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
        });

        it('should return 200 for NGO', async () => {
            const res = await request(app)
                .get('/api/v1/reports/cases/by-priority')
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email));

            expect(res.status).toBe(200);
        });
    });

    describe('GET /api/v1/reports/cases/by-category', () => {
        it('should return 200 for ADMIN', async () => {
            const res = await request(app)
                .get('/api/v1/reports/cases/by-category')
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
        });
    });

    describe('GET /api/v1/reports/cases/monthly', () => {
        it('should return 200 for ADMIN', async () => {
            const res = await request(app)
                .get('/api/v1/reports/cases/monthly')
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
        });
    });

    describe('GET /api/v1/reports/cases/average-resolution-time', () => {
        it('should return 200 for ADMIN', async () => {
            const res = await request(app)
                .get('/api/v1/reports/cases/average-resolution-time')
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
        });

        it('should return 403 for NGO', async () => {
            const res = await request(app)
                .get('/api/v1/reports/cases/average-resolution-time')
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email));

            expect(res.status).toBe(403);
        });
    });

    describe('GET /api/v1/reports/investigator/:id/performance', () => {
        it('should return 200 for ADMIN viewing investigator performance', async () => {
            const res = await request(app)
                .get(`/api/v1/reports/investigator/${investigator._id}/performance`)
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('investigator');
        });

        it('should return 200 for investigator viewing own performance', async () => {
            const res = await request(app)
                .get(`/api/v1/reports/investigator/${investigator._id}/performance`)
                .set(authHeader(investigator._id, 'INVESTIGATOR', investigator.email));

            expect(res.status).toBe(200);
        });

        it('should return 403 for NGO', async () => {
            const res = await request(app)
                .get(`/api/v1/reports/investigator/${investigator._id}/performance`)
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email));

            expect(res.status).toBe(403);
        });
    });

    describe('POST /api/v1/reports', () => {
        it('should return 201 for ADMIN creating a report with reportData snapshot', async () => {
            const res = await request(app)
                .post('/api/v1/reports')
                .set(authHeader(admin._id, 'ADMIN', admin.email))
                .send(REPORT_PAYLOAD);

            expect(res.status).toBe(201);
            expect(res.body.data.report.name).toBe(REPORT_PAYLOAD.name);
            expect(res.body.data.report).toHaveProperty('reportData');
            expect(res.body.data.report).toHaveProperty('generatedAt');
        });

        it('should return 403 for NGO', async () => {
            const res = await request(app)
                .post('/api/v1/reports')
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email))
                .send(REPORT_PAYLOAD);

            expect(res.status).toBe(403);
        });

        it('should return 400 for missing required name field', async () => {
            const res = await request(app)
                .post('/api/v1/reports')
                .set(authHeader(admin._id, 'ADMIN', admin.email))
                .send({ reportType: 'DASHBOARD' });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/v1/reports', () => {
        beforeEach(async () => {
            await request(app)
                .post('/api/v1/reports')
                .set(authHeader(admin._id, 'ADMIN', admin.email))
                .send(REPORT_PAYLOAD);
        });

        it('should return 200 with report list for ADMIN', async () => {
            const res = await request(app)
                .get('/api/v1/reports')
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('reports');
            expect(res.body.data).toHaveProperty('pagination');
        });

        it('should return 403 for NGO', async () => {
            const res = await request(app)
                .get('/api/v1/reports')
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email));

            expect(res.status).toBe(403);
        });
    });

    describe('PUT /api/v1/reports/:id', () => {
        it('should return 200 for ADMIN updating a report', async () => {
            const createRes = await request(app)
                .post('/api/v1/reports')
                .set(authHeader(admin._id, 'ADMIN', admin.email))
                .send(REPORT_PAYLOAD);

            const reportId = createRes.body.data.report._id;

            const res = await request(app)
                .put(`/api/v1/reports/${reportId}`)
                .set(authHeader(admin._id, 'ADMIN', admin.email))
                .send({ name: 'Updated Report Name' });

            expect(res.status).toBe(200);
        });
    });

    describe('DELETE /api/v1/reports/:id', () => {
        it('should return 200 for ADMIN deleting a report', async () => {
            const createRes = await request(app)
                .post('/api/v1/reports')
                .set(authHeader(admin._id, 'ADMIN', admin.email))
                .send(REPORT_PAYLOAD);

            const reportId = createRes.body.data.report._id;

            const res = await request(app)
                .delete(`/api/v1/reports/${reportId}`)
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
        });

        it('should return 403 for NGO attempting delete', async () => {
            const createRes = await request(app)
                .post('/api/v1/reports')
                .set(authHeader(admin._id, 'ADMIN', admin.email))
                .send(REPORT_PAYLOAD);

            const reportId = createRes.body.data.report._id;

            const res = await request(app)
                .delete(`/api/v1/reports/${reportId}`)
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email));

            expect(res.status).toBe(403);
        });
    });
});
// Coverage: dashboard summary, case analytics, resolution, investigator performance, evidence analytics, saved reports CRUD
