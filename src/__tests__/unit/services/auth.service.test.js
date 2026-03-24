// Mock repository before importing the service
jest.mock('../../../repository/user.repository.js');

import * as authService from '../../../services/auth.service.js';
import * as userRepository from '../../../repository/user.repository.js';
import mongoose from 'mongoose';

describe('auth service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockUserId = new mongoose.Types.ObjectId();
    const mockUser = {
        _id: mockUserId,
        name: 'Test User',
        email: 'test@example.com',
        password: '$2b$10$hashedpassword',
        role: 'NGO',
        isActive: true,
        toJSON: jest.fn().mockReturnValue({
            _id: mockUserId,
            name: 'Test User',
            email: 'test@example.com',
            role: 'NGO',
        }),
    };

    describe('register', () => {
        it('should throw 400 when email is already registered', async () => {
            userRepository.findByEmail.mockResolvedValue(mockUser);

            await expect(
                authService.register({ name: 'X', email: 'test@example.com', password: 'pass123', role: 'NGO' })
            ).rejects.toMatchObject({ statusCode: 400, message: 'Email already registered' });
        });

        it('should throw 400 when NIC is already registered', async () => {
            userRepository.findByEmail.mockResolvedValue(null);
            userRepository.findByNIC.mockResolvedValue(mockUser);

            await expect(
                authService.register({ name: 'X', email: 'new@example.com', password: 'pass123', role: 'INVESTIGATOR', nic: '123456789V' })
            ).rejects.toMatchObject({ statusCode: 400, message: 'NIC already registered' });
        });

        it('should create a user and return token on success', async () => {
            userRepository.findByEmail.mockResolvedValue(null);
            userRepository.findByNIC = jest.fn().mockResolvedValue(null);
            userRepository.create.mockResolvedValue(mockUser);

            const result = await authService.register({
                name: 'New User',
                email: 'new@example.com',
                password: 'password123',
                role: 'NGO',
            });

            expect(userRepository.create).toHaveBeenCalledTimes(1);
            expect(result).toHaveProperty('token');
            expect(result).toHaveProperty('user');
        });

        it('should hash the password before storing', async () => {
            const plainPassword = 'myPlainPassword';
            userRepository.findByEmail.mockResolvedValue(null);
            userRepository.create.mockResolvedValue(mockUser);

            await authService.register({ name: 'X', email: 'x@x.com', password: plainPassword, role: 'NGO' });

            const createCall = userRepository.create.mock.calls[0][0];
            expect(createCall.password).not.toBe(plainPassword);
            expect(createCall.password).toMatch(/^\$2[ab]\$/);
        });
    });

    describe('login', () => {
        it('should throw 401 when user is not found', async () => {
            userRepository.findByEmail.mockResolvedValue(null);

            await expect(
                authService.login('nonexistent@example.com', 'password')
            ).rejects.toMatchObject({ statusCode: 401 });
        });

        it('should throw 401 when account is deactivated', async () => {
            userRepository.findByEmail.mockResolvedValue({ ...mockUser, isActive: false, password: '$2b$10$abc' });

            await expect(
                authService.login('test@example.com', 'password')
            ).rejects.toMatchObject({ statusCode: 401, message: 'Account is deactivated' });
        });

        it('should throw 401 for an invalid password', async () => {
            userRepository.findByEmail.mockResolvedValue({
                ...mockUser,
                password: '$2b$10$invalidhash',
            });

            await expect(
                authService.login('test@example.com', 'wrongPassword')
            ).rejects.toMatchObject({ statusCode: 401 });
        });

        it('should return user and token for valid credentials', async () => {
            const { hashPassword } = await import('../../../utils/password.utils.js');
            const hashedPw = await hashPassword('correctPassword');

            userRepository.findByEmail.mockResolvedValue({
                ...mockUser,
                password: hashedPw,
                toJSON: jest.fn().mockReturnValue({ _id: mockUserId, email: 'test@example.com', role: 'NGO' }),
            });
            userRepository.updateLastLogin = jest.fn().mockResolvedValue({});

            const result = await authService.login('test@example.com', 'correctPassword');

            expect(result).toHaveProperty('token');
            expect(result).toHaveProperty('user');
        });
    });
});
