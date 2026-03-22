/**
 * Send a successful JSON response
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {*} data
 */
export const sendSuccess = (res, statusCode = 200, message = '', data = null) =>
    res.status(statusCode).json({ success: true, message, data });

/**
 * Send an error JSON response
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 * @param {*} errors
 */
export const sendError = (res, statusCode = 500, message = 'Internal server error', errors = null) => {
    const body = { success: false, message };
    if (errors !== null) body.errors = errors;
    return res.status(statusCode).json(body);
};
