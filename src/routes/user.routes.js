import express from 'express';
import * as userController from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
    updateUserValidation,
    updateRoleValidation,
    userIdValidation,
} from '../validations/user.validation.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Admin only - Get all users
router.get('/', authorize('ADMIN'), userController.getAllUsers);

// Admin or self - Get user by ID
router.get('/:id', userIdValidation, userController.getUserById);

// Admin or self - Update user profile
router.put('/:id', updateUserValidation, userController.updateUser);

// Admin only - Update user role
router.put('/:id/role', authorize('ADMIN'), updateRoleValidation, userController.updateUserRole);

// Admin only - Delete user
router.delete('/:id', authorize('ADMIN'), userIdValidation, userController.deleteUser);

export default router;
