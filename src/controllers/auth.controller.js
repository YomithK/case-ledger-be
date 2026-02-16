import asyncHandler from 'express-async-handler';
import * as authService from '../services/auth.service.js';

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    const result = await authService.register({ name, email, password });

    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
            user: result.user,
            token: result.token,
        },
    });
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
            user: result.user,
            token: result.token,
        },
    });
});
