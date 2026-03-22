import asyncHandler from 'express-async-handler';
import * as authService from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
    const { name, email, password, role, phoneNumber, organizationName, nic, dob } = req.body;

    const result = await authService.register({ name, email, password, role, phoneNumber, organizationName, nic, dob });

    sendSuccess(res, 201, 'User registered successfully', { user: result.user, token: result.token });
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    sendSuccess(res, 200, 'Login successful', { user: result.user, token: result.token });
});
