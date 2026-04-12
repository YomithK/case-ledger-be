import jwt from 'jsonwebtoken';
import { jwt as jwtConfig } from '../config/index.js';
import User from '../models/User.js';
import { sendError } from '../utils/response.js';

/**
 * Authenticate middleware - Verify JWT token
 */
export const authenticate = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return sendError(res, 401, 'Access denied. No token provided.');
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = jwt.verify(token, jwtConfig.secret);

        // Get user from database
        const user = await User.findOne({ _id: decoded.userId, isActive: true });

        if (!user) {
            return sendError(res, 401, 'Invalid token. User not found.');
        }

        // Attach user to request object
        req.user = {
            userId: user._id,
            role: user.role,
            email: user.email,
            name: user.name,
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return sendError(res, 401, 'Invalid token.');
        }

        if (error.name === 'TokenExpiredError') {
            return sendError(res, 401, 'Token expired.');
        }

        return sendError(res, 500, 'Authentication failed.');
    }
};

/**
 * Authorize middleware - Check user role
 */
export const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return sendError(res, 401, 'Authentication required.');
        }

        if (!allowedRoles.includes(req.user.role)) {
            return sendError(res, 403, 'Access forbidden. Insufficient permissions.');
        }

        next();
    };
};
