import logger from '../utils/logger.js';

/**
 * HTTP request/response logger middleware.
 * Logs after the response finishes with method, path, status code, and duration.
 */
export const requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const ms = Date.now() - start;
        const msg = `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`;

        if (res.statusCode >= 500) {
            logger.error(msg);
        } else if (res.statusCode >= 400) {
            logger.warn(msg);
        } else {
            logger.http(msg);
        }
    });

    next();
};
