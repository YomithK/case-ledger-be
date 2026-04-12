jest.mock('../../../repository/user.repository.js');

import * as userService from '../../../services/user.service.js';
import * as userRepository from '../../../repository/user.repository.js';
import mongoose from 'mongoose';

const adminId = new mongoose.Types.ObjectId();
const userId = new mongoose.Types.ObjectId();
const otherId = new mongoose.Types.ObjectId();

const mockUser = {
    _id: userId,
    name: 'Test User',
    email: 'user@test.com',
    role: 'NGO',
    isActive: true,
    toObject: jest.fn().mockReturnValue({ _id: userId, name: 'Test User', email: 'user@test.com', role: 'NGO' }),
};

describe('user service', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getAllUsers', () => {
        it('should return users with pagination metadata', async () => {
            userRepository.findAll.mockResolvedValue([mockUser]);
            userRepository.countUsers.mockResolvedValue(1);

            const result = await userService.getAllUsers(false, {}, { page: 1, limit: 10 });

            expect(result).toHaveProperty('users');
            expect(result).toHaveProperty('pagination');
            expect(result.pagination).toMatchObject({
                currentPage: 1,
                totalPages: 1,
                totalCount: 1,
                limit: 10,
                hasNextPage: false,
                hasPrevPage: false,
            });
        });

        it('should include inactive users when no isActive filter applied', async () => {
            const inactiveUser = { ...mockUser, isActive: false, toObject: jest.fn().mockReturnValue({ isActive: false }) };
            userRepository.findAll.mockResolvedValue([mockUser, inactiveUser]);
            userRepository.countUsers.mockResolvedValue(2);

            const result = await userService.getAllUsers(false, {}, {});

            expect(result.users).toHaveLength(2);
        });

        it('should pass filters through to repository', async () => {
            userRepository.findAll.mockResolvedValue([mockUser]);
            userRepository.countUsers.mockResolvedValue(1);

            await userService.getAllUsers(false, { role: 'INVESTIGATOR', search: 'John' }, { page: 1, limit: 5 });

            expect(userRepository.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ role: 'INVESTIGATOR', search: 'John' }),
                expect.any(Object),
                expect.objectContaining({ page: 1, limit: 5 }),
            );
        });

        it('should strip password from results when isAdmin=true', async () => {
            const adminUser = {
                ...mockUser,
                toObject: jest.fn().mockReturnValue({ _id: userId, name: 'Test User', password: 'hashed' }),
            };
            userRepository.findAll.mockResolvedValue([adminUser]);
            userRepository.countUsers.mockResolvedValue(1);

            const result = await userService.getAllUsers(true, {}, {});

            expect(result.users[0].password).toBeUndefined();
        });
    });

    describe('getUserById', () => {
        it('should throw 404 when user not found', async () => {
            userRepository.findById.mockResolvedValue(null);
            await expect(userService.getUserById(userId, false))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should return user for any requester when found', async () => {
            userRepository.findById.mockResolvedValue(mockUser);
            const result = await userService.getUserById(userId, false);
            expect(result).toBeDefined();
        });

        it('should return unmasked data for admin (isAdmin=true)', async () => {
            userRepository.findById.mockResolvedValue(mockUser);
            const result = await userService.getUserById(userId, true);
            expect(result).toBeDefined();
        });
    });

    describe('updateUser', () => {
        it('should update allowed fields', async () => {
            userRepository.updateById.mockResolvedValue({ ...mockUser, name: 'Updated Name' });
            const result = await userService.updateUser(userId, { name: 'Updated Name' });
            expect(result.name).toBe('Updated Name');
        });

        it('should throw 404 when user not found for update', async () => {
            userRepository.updateById.mockResolvedValue(null);
            await expect(userService.updateUser(userId, { name: 'X' }))
                .rejects.toMatchObject({ statusCode: 404 });
        });

        it('should strip protected fields from update data', async () => {
            userRepository.updateById.mockResolvedValue(mockUser);
            await userService.updateUser(userId, { name: 'X', role: 'ADMIN', password: 'hack', nic: '123456789V' });
            const updateArgs = userRepository.updateById.mock.calls[0][1];
            expect(updateArgs.role).toBeUndefined();
            expect(updateArgs.password).toBeUndefined();
            expect(updateArgs.nic).toBeUndefined();
        });
    });

    describe('updateUserRole', () => {
        it('should update role when user exists', async () => {
            userRepository.updateById.mockResolvedValue({ ...mockUser, role: 'INVESTIGATOR' });
            const result = await userService.updateUserRole(userId, 'INVESTIGATOR');
            expect(result.role).toBe('INVESTIGATOR');
        });

        it('should throw 404 when user not found', async () => {
            userRepository.updateById.mockResolvedValue(null);
            await expect(userService.updateUserRole(userId, 'ADMIN'))
                .rejects.toMatchObject({ statusCode: 404 });
        });
    });

    describe('deleteUser', () => {
        it('should soft-delete user when found', async () => {
            userRepository.softDeleteById.mockResolvedValue({ ...mockUser, isActive: false });
            const result = await userService.deleteUser(userId);
            expect(result.message).toMatch(/deleted/i);
        });

        it('should throw 404 when user not found', async () => {
            userRepository.softDeleteById.mockResolvedValue(null);
            await expect(userService.deleteUser(userId))
                .rejects.toMatchObject({ statusCode: 404 });
        });
    });
});
