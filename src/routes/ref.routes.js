import express from 'express';
import { celebrate, Joi, Segments } from 'celebrate';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import * as refController from '../controllers/ref.controller.js';

const router = express.Router();

// All ref routes require authentication
router.use(authenticate);

/**
 * @route   GET /ref/assignable-users
 * @desc    Search active users with role USER (for relatedUsers assignment)
 * @access  ADMIN, NGO, INVESTIGATOR
 * @query   search {string} - Optional keyword to filter by name or email
 * @query   limit  {number} - Max results (default 10, capped at 50)
 */
router.get(
    '/assignable-users',
    authorize('ADMIN', 'NGO', 'INVESTIGATOR'),
    celebrate({
        [Segments.QUERY]: Joi.object({
            search: Joi.string().trim().optional(),
            limit: Joi.number().integer().min(1).max(50).optional().messages({
                'number.base': 'Limit must be a number',
                'number.min': 'Limit must be at least 1',
                'number.max': 'Limit cannot exceed 50',
            }),
        }),
    }),
    refController.getAssignableUsers
);

export default router;
