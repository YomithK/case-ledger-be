import request from 'supertest';
import app from '../../app.js';
import {
    createAdminUser,
    createNGOUser,
    createInvestigatorUser,
    authHeader,
} from '../helpers/testHelpers.js';

describe('User Routes - Integration', () => {
    let admin, ngoUser, investigator;

    beforeEach(async () => {
        admin = await createAdminUser();
        ngoUser = await createNGOUser();
        investigator = await createInvestigatorUser();
    });

    describe('GET /api/v1/users', () => {
        it('should return 200 with user list and pagination for ADMIN', async () => {
            const res = await request(app)
                .get('/api/v1/users')
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data.users)).toBe(true);
            expect(res.body.data).toHaveProperty('pagination');
            expect(res.body.data.pagination).toHaveProperty('currentPage');
            expect(res.body.data.pagination).toHaveProperty('totalCount');
        });

        it('should include inactive users when no status filter applied', async () => {
            // Soft-delete the NGO user so they become inactive
            await request(app)
                .delete(`/api/v1/users/${ngoUser._id}`)
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            const res = await request(app)
                .get('/api/v1/users')
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
            const ids = res.body.data.users.map((u) => u._id.toString());
            expect(ids).toContain(ngoUser._id.toString());
        });

        it('should filter by type=INVESTIGATOR', async () => {
            const res = await request(app)
                .get('/api/v1/users?type=INVESTIGATOR')
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
            res.body.data.users.forEach((u) => {
                expect(u.role).toBe('INVESTIGATOR');
            });
        });

        it('should filter by status=active', async () => {
            const res = await request(app)
                .get('/api/v1/users?status=active')
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
            res.body.data.users.forEach((u) => {
                expect(u.isActive).toBe(true);
            });
        });

        it('should filter by search name', async () => {
            const res = await request(app)
                .get('/api/v1/users?search=Test%20Admin')
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.data.users)).toBe(true);
        });

        it('should return 403 for NGO user', async () => {
            const res = await request(app)
                .get('/api/v1/users')
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email));

            expect(res.status).toBe(403);
        });

        it('should return 403 for INVESTIGATOR', async () => {
            const res = await request(app)
                .get('/api/v1/users')
                .set(authHeader(investigator._id, 'INVESTIGATOR', investigator.email));

            expect(res.status).toBe(403);
        });

        it('should return 401 without auth token', async () => {
            const res = await request(app).get('/api/v1/users');
            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/v1/users/:id', () => {
        it('should return 200 for ADMIN viewing any user', async () => {
            const res = await request(app)
                .get(`/api/v1/users/${ngoUser._id}`)
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
            expect(res.body.data.user._id.toString()).toBe(ngoUser._id.toString());
        });

        it('should return 200 for user viewing own profile', async () => {
            const res = await request(app)
                .get(`/api/v1/users/${ngoUser._id}`)
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email));

            expect(res.status).toBe(200);
        });

        it('should return 403 for NGO viewing another user', async () => {
            const res = await request(app)
                .get(`/api/v1/users/${investigator._id}`)
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email));

            expect(res.status).toBe(403);
        });
    });

    describe('PUT /api/v1/users/:id', () => {
        it('should return 200 for user updating own profile', async () => {
            const res = await request(app)
                .put(`/api/v1/users/${ngoUser._id}`)
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email))
                .send({ name: 'Updated NGO Name' });

            expect(res.status).toBe(200);
            expect(res.body.data.user.name).toBe('Updated NGO Name');
        });

        it('should return 403 for NGO updating another user', async () => {
            const res = await request(app)
                .put(`/api/v1/users/${investigator._id}`)
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email))
                .send({ name: 'Hacked Name' });

            expect(res.status).toBe(403);
        });

        it('should return 200 for ADMIN updating any user', async () => {
            const res = await request(app)
                .put(`/api/v1/users/${ngoUser._id}`)
                .set(authHeader(admin._id, 'ADMIN', admin.email))
                .send({ name: 'Admin Updated' });

            expect(res.status).toBe(200);
        });
    });

    describe('PUT /api/v1/users/:id/role', () => {
        it('should return 200 for ADMIN updating user role', async () => {
            const res = await request(app)
                .put(`/api/v1/users/${ngoUser._id}/role`)
                .set(authHeader(admin._id, 'ADMIN', admin.email))
                .send({ role: 'INVESTIGATOR' });

            expect(res.status).toBe(200);
        });

        it('should return 403 for NGO attempting role update', async () => {
            const res = await request(app)
                .put(`/api/v1/users/${investigator._id}/role`)
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email))
                .send({ role: 'ADMIN' });

            expect(res.status).toBe(403);
        });
    });

    describe('DELETE /api/v1/users/:id', () => {
        it('should return 200 for ADMIN deleting another user', async () => {
            const res = await request(app)
                .delete(`/api/v1/users/${ngoUser._id}`)
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(200);
        });

        it('should return 400 when ADMIN tries to delete themselves', async () => {
            const res = await request(app)
                .delete(`/api/v1/users/${admin._id}`)
                .set(authHeader(admin._id, 'ADMIN', admin.email));

            expect(res.status).toBe(400);
        });

        it('should return 403 for NGO attempting delete', async () => {
            const res = await request(app)
                .delete(`/api/v1/users/${investigator._id}`)
                .set(authHeader(ngoUser._id, 'NGO', ngoUser.email));

            expect(res.status).toBe(403);
        });
    });
});
// Coverage: GET /users, GET /users/:id, PUT /users/:id, PUT /users/:id/role, DELETE /users/:id
