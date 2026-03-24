import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Mock the User model before importing auth middleware
jest.mock('../../../models/User.js', () => ({
    __esModule: true,
    default: {
        findOne: jest.fn(),
    },
}));

import { authenticate, authorize } from '../../../middleware/auth.middleware.js';
import User from '../../../models/User.js';

const TEST_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing_only';

const makeToken = (payload = {}) =>
    jwt.sign({ userId: new mongoose.Types.ObjectId(), role: 'NGO', email: 'test@test.com', ...payload }, TEST_SECRET, { expiresIn: '1h' });

describe('auth middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = { headers: {} };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('authenticate', () => {
        it('should return 401 when no Authorization header is provided', async () => {
            await authenticate(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 when Authorization header does not start with Bearer', async () => {
            req.headers.authorization = 'Token sometoken';
            await authenticate(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 for an invalid/tampered token', async () => {
            req.headers.authorization = 'Bearer invalid.token.here';
            await authenticate(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 401 when user is not found in DB', async () => {
            User.findOne.mockResolvedValue(null);
            req.headers.authorization = `Bearer ${makeToken()}`;
            await authenticate(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });

        it('should call next() and attach user to req for a valid token', async () => {
            const userId = new mongoose.Types.ObjectId();
            const mockUser = { _id: userId, role: 'NGO', email: 'user@test.com', name: 'Test User' };
            User.findOne.mockResolvedValue(mockUser);

            req.headers.authorization = `Bearer ${makeToken({ userId, role: 'NGO', email: 'user@test.com' })}`;
            await authenticate(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.user).toBeDefined();
            expect(req.user.role).toBe('NGO');
        });
    });

    describe('authorize', () => {
        it('should return 401 when req.user is not set', () => {
            const middleware = authorize('ADMIN');
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 403 when user role is not in allowed roles', () => {
            req.user = { role: 'NGO' };
            const middleware = authorize('ADMIN', 'INVESTIGATOR');
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });

        it('should call next() when user role is in allowed roles', () => {
            req.user = { role: 'ADMIN' };
            const middleware = authorize('ADMIN', 'INVESTIGATOR');
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });

        it('should allow any of the specified roles', () => {
            req.user = { role: 'INVESTIGATOR' };
            const middleware = authorize('ADMIN', 'INVESTIGATOR');
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
        });
    });
});
