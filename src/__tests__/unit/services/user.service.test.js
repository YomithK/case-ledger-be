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
