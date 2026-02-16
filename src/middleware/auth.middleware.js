import jwt from 'jsonwebtoken';
import { jwt as jwtConfig } from '../config/index.js';
import User from '../models/User.js';

/**
 * Authenticate middleware - Verify JWT token
 */
export const authenticate = async (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided.',
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = jwt.verify(token, jwtConfig.secret);

        // Get user from database
        const user = await User.findOne({ _id: decoded.userId, isActive: true });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. User not found.',
            });
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
            return res.status(401).json({
                success: false,
                message: 'Invalid token.',
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired.',
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Authentication failed.',
        });
    }
};

/**
 * Authorize middleware - Check user role
 */
export const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.',
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access forbidden. Insufficient permissions.',
            });
        }

        next();
    };
};
