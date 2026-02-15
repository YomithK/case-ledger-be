import { isCelebrateError } from 'celebrate';
import { server } from '../config/index.js';

/**
 * Centralized error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal server error';
    let errors = null;

    // Handle Celebrate validation errors
    if (isCelebrateError(err)) {
        statusCode = 400;
        message = 'Validation error';
        errors = {};

        // Extract validation errors
        for (const [segment, joiError] of err.details.entries()) {
            errors[segment] = joiError.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message,
            }));
        }
    }

    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation error';
        errors = Object.keys(err.errors).map((key) => ({
            field: key,
            message: err.errors[key].message,
        }));
    }

    // Handle Mongoose duplicate key error
    if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyPattern)[0];
        message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    }

    // Handle Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    // Build error response
    const errorResponse = {
        success: false,
        message,
    };

    if (errors) {
        errorResponse.errors = errors;
    }

    // Include stack trace in development mode only
    if (server.nodeEnv === 'development') {
        errorResponse.stack = err.stack;
    }

    // Log error for debugging
    console.error('Error:', {
        message: err.message,
        statusCode,
        stack: err.stack,
    });

    res.status(statusCode).json(errorResponse);
};

/**
 * Handle 404 - Not Found
 */
export const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
    });
};
