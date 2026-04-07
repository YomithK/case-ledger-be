import asyncHandler from 'express-async-handler';
import * as userService from '../services/user.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (active + inactive) with optional filters and pagination
 * @access  Admin only
 */
export const getAllUsers = asyncHandler(async (req, res) => {
    const isAdmin = req.user.role === 'ADMIN';
    const { status, type, search, page, limit } = req.query;

    // Map query params to service filter shape
    let isActive;
    if (status === 'active') isActive = true;
    else if (status === 'inactive') isActive = false;

    const filters = { isActive, role: type, search };
    const pagination = { page, limit };

    const { users, pagination: paginationMeta } = await userService.getAllUsers(isAdmin, filters, pagination);

    sendSuccess(res, 200, 'Users retrieved successfully', {
        count: users.length,
        users,
        pagination: paginationMeta,
    });
});

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Admin or self
 */
export const getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if user is accessing their own profile or is admin
    if (req.user.role !== 'ADMIN' && req.user.userId.toString() !== id) {
        return sendError(res, 403, 'Access forbidden. You can only access your own profile.');
    }

    // Admin gets full access to sensitive fields (unmasked NIC and DOB)
    const isAdmin = req.user.role === 'ADMIN';
    const user = await userService.getUserById(id, isAdmin);

    sendSuccess(res, 200, 'User retrieved successfully', { user });
});

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user profile
 * @access  Admin or self
 */
export const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check if user is updating their own profile or is admin
    if (req.user.role !== 'ADMIN' && req.user.userId.toString() !== id) {
        return sendError(res, 403, 'Access forbidden. You can only update your own profile.');
    }

    const user = await userService.updateUser(id, req.body);

    sendSuccess(res, 200, 'User updated successfully', { user });
});

/**
 * @route   PUT /api/v1/users/:id/role
 * @desc    Update user role
 * @access  Admin only
 */
export const updateUserRole = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    const user = await userService.updateUserRole(id, role);

    sendSuccess(res, 200, 'User role updated successfully', { user });
});

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user (soft delete)
 * @access  Admin only
 */
export const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user.userId.toString() === id) {
        return sendError(res, 400, 'You cannot delete your own account.');
    }

    const result = await userService.deleteUser(id);

    sendSuccess(res, 200, result.message, null);
});

/**
 * @route   POST /api/v1/users/:id/profile-photo
 * @desc    Upload or update profile photo
 * @access  Admin or self
 */
export const uploadProfilePhoto = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (req.user.role !== 'ADMIN' && req.user.userId.toString() !== id) {
        return sendError(res, 403, 'Access forbidden. You can only update your own profile photo.');
    }

    if (!req.file || !req.file.path) {
        return sendError(res, 400, 'No image file uploaded.');
    }

    const user = await userService.updateUser(id, { profilePhoto: req.file.path });

    sendSuccess(res, 200, 'Profile photo updated successfully', { user });
});
