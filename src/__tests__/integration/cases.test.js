import request from 'supertest';
import app from '../../app.js';
import {
    createAdminUser,
    createNGOUser,
    createInvestigatorUser,
    createCase,
    authHeader,
} from '../helpers/testHelpers.js';

const VALID_CASE = {
    title: 'Test Human Rights Case',
    description: 'Detailed description of the incident',
    category: 'OTHER',
    priority: 'HIGH',
    incidentDate: '2025-01-15',
    location: 'Colombo, Sri Lanka',
};

describe('Case Routes - Integration', () => {
    let admin, ngoUser, investigator;

    beforeEach(async () => {
        admin = await createAdminUser();
        ngoUser = await createNGOUser();
        investigator = await createInvestigatorUser();
    });

    describe('POST /api/v1/cases', () => {
        it('should return 201 for NGO creating a case', async () => {
            const res = await request(app)
                .post('/api/v1/cases')
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email))
                .send(VALID_CASE);

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.case.reportedBy).toBeDefined();
        });

        it('should return 403 for ADMIN creating a case', async () => {
            const res = await request(app)
                .post('/api/v1/cases')
                .set(authHeader(admin._id, 'ADMIN', admin.email))
                .send(VALID_CASE);

            expect(res.status).toBe(403);
        });

        it('should return 403 for INVESTIGATOR creating a case', async () => {
            const res = await request(app)
                .post('/api/v1/cases')
                .set(authHeader(investigator._id, 'INVESTIGATOR', investigator.email))
                .send(VALID_CASE);

            expect(res.status).toBe(403);
        });

        it('should return 400 for missing required fields', async () => {
            const res = await request(app)
                .post('/api/v1/cases')
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email))
                .send({ title: 'Incomplete Case' });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/v1/cases', () => {
        beforeEach(async () => {
            await createCase(ngoUser._id);
        });

        it('should return 200 for ADMIN seeing all cases', async () => {
            const res = await request(app)
                .get('/api/v1/cases')
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data.cases)).toBe(true);
        });

        it('should return only own cases for NGO', async () => {
            const anotherNgo = await createNGOUser({ email: `another_ngo_${Date.now()}@test.com` });
            await createCase(anotherNgo._id);

            const res = await request(app)
                .get('/api/v1/cases')
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email));

            expect(res.status).toBe(200);
            const cases = res.body.data.cases;
            cases.forEach(c => {
                expect(c.reportedBy._id.toString()).toBe(ngoUser._id.toString());
            });
        });

        it('should return 401 without token', async () => {
            const res = await request(app).get('/api/v1/cases');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/v1/cases/:id', () => {
        it('should return 200 for ADMIN', async () => {
            const caseDoc = await createCase(ngoUser._id);
            const res = await request(app)
                .get(`/api/v1/cases/${caseDoc._id}`)
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
        });

        it('should return 200 for NGO viewing own case', async () => {
            const caseDoc = await createCase(ngoUser._id);
            const res = await request(app)
                .get(`/api/v1/cases/${caseDoc._id}`)
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email));

            expect(res.status).toBe(200);
        });

        it('should return 403 for NGO viewing another NGO\'s case', async () => {
            const otherNgo = await createNGOUser({ email: `other_${Date.now()}@test.com` });
            const caseDoc = await createCase(otherNgo._id);

            const res = await request(app)
                .get(`/api/v1/cases/${caseDoc._id}`)
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email));

            expect(res.status).toBe(403);
        });

        it('should return 404 for non-existent case', async () => {
            const fakeId = '507f1f77bcf86cd799439011';
            const res = await request(app)
                .get(`/api/v1/cases/${fakeId}`)
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/v1/cases/:id', () => {
        it('should return 200 for ADMIN updating a case', async () => {
            const caseDoc = await createCase(ngoUser._id);
            const res = await request(app)
                .put(`/api/v1/cases/${caseDoc._id}`)
                .set(authHeader(admin._id, 'ADMIN', admin.email))
                .send({ title: 'Updated Title' });

            expect(res.status).toBe(200);
        });

        it('should return 403 for NGO updating a case', async () => {
            const caseDoc = await createCase(ngoUser._id);
            const res = await request(app)
                .put(`/api/v1/cases/${caseDoc._id}`)
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email))
                .send({ title: 'Unauthorized Update' });

            expect(res.status).toBe(403);
        });
    });

    describe('PUT /api/v1/cases/:id/assign', () => {
        it('should return 200 when ADMIN assigns a valid investigator', async () => {
            const caseDoc = await createCase(ngoUser._id);
            const res = await request(app)
                .put(`/api/v1/cases/${caseDoc._id}/assign`)
                .set(authHeader(admin._id, 'ADMIN', admin.email))
                .send({ investigatorId: investigator._id });

            expect(res.status).toBe(200);
        });

        it('should return 400 when assigning a non-INVESTIGATOR user', async () => {
            const caseDoc = await createCase(ngoUser._id);
            const res = await request(app)
                .put(`/api/v1/cases/${caseDoc._id}/assign`)
                .set(authHeader(admin._id, 'ADMIN', admin.email))
                .send({ investigatorId: ngoUser._id });

            expect(res.status).toBe(400);
        });
    });

    describe('PUT /api/v1/cases/:id/status', () => {
        it('should return 200 for valid transition REPORTED → UNDER_INVESTIGATION', async () => {
            const caseDoc = await createCase(ngoUser._id, { status: 'REPORTED' });
            const res = await request(app)
                .put(`/api/v1/cases/${caseDoc._id}/status`)
                .set(authHeader(admin._id, 'ADMIN', admin.email))
                .send({ status: 'UNDER_INVESTIGATION' });

            expect(res.status).toBe(200);
            expect(res.body.data.case.status).toBe('UNDER_INVESTIGATION');
        });

        it('should return 400 for invalid transition REPORTED → RESOLVED', async () => {
            const caseDoc = await createCase(ngoUser._id, { status: 'REPORTED' });
            const res = await request(app)
                .put(`/api/v1/cases/${caseDoc._id}/status`)
                .set(authHeader(admin._id, 'ADMIN', admin.email))
                .send({ status: 'RESOLVED' });

            expect(res.status).toBe(400);
        });
    });

    describe('DELETE /api/v1/cases/:id', () => {
        it('should return 200 for ADMIN soft-deleting a case', async () => {
            const caseDoc = await createCase(ngoUser._id);
            const res = await request(app)
                .delete(`/api/v1/cases/${caseDoc._id}`)
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
        });

        it('should return 403 for NGO deleting a case', async () => {
            const caseDoc = await createCase(ngoUser._id);
            const res = await request(app)
                .delete(`/api/v1/cases/${caseDoc._id}`)
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email));

            expect(res.status).toBe(403);
        });
    });
});
