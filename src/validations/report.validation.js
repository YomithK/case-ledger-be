import { celebrate, Joi, Segments } from 'celebrate';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = Joi.string().regex(OBJECT_ID_REGEX);

// ─────────────────────────────────────────────────────────────
// SHARED
// ─────────────────────────────────────────────────────────────

/**
 * Shared date-range + optional filter query params for analytics endpoints.
 */
export const analyticsQueryValidation = celebrate({
    [Segments.QUERY]: Joi.object({
        startDate: Joi.date().iso().optional().messages({
            'date.base': 'startDate must be a valid ISO date',
        }),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).optional().messages({
            'date.base': 'endDate must be a valid ISO date',
            'date.min': 'endDate must be on or after startDate',
        }),
        status: Joi.string().optional(),   // comma-separated list accepted in controller
        priority: Joi.string().optional(),
        category: Joi.string().optional(),
    }),
});

/**
 * Validation for monthly trend – accepts an optional `year` query param.
 */
export const monthlyQueryValidation = celebrate({
    [Segments.QUERY]: Joi.object({
        startDate: Joi.date().iso().optional(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
        year: Joi.number().integer().min(2000).max(2100).optional().messages({
            'number.min': 'Year must be 2000 or later',
            'number.max': 'Year must be 2100 or earlier',
        }),
    }),
});

/**
 * Validation for the longest-open cases limit param.
 */
export const longestOpenQueryValidation = celebrate({
    [Segments.QUERY]: Joi.object({
        startDate: Joi.date().iso().optional(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
        limit: Joi.number().integer().min(1).max(100).optional().messages({
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 100',
        }),
    }),
});

// ─────────────────────────────────────────────────────────────
// INVESTIGATOR PERFORMANCE
// ─────────────────────────────────────────────────────────────

export const investigatorIdParamValidation = celebrate({
    [Segments.PARAMS]: Joi.object({
        id: objectIdSchema.required().messages({
            'string.pattern.base': 'Invalid investigator ID format',
            'any.required': 'Investigator ID is required',
        }),
    }),
});

// ─────────────────────────────────────────────────────────────
// SAVED REPORT CRUD
// ─────────────────────────────────────────────────────────────

const filtersSchema = Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    status: Joi.array().items(Joi.string()).optional(),
    priority: Joi.array().items(Joi.string()).optional(),
    category: Joi.array().items(Joi.string()).optional(),
    investigatorId: objectIdSchema.optional().messages({
        'string.pattern.base': 'Invalid investigator ID format',
    }),
    ngoId: objectIdSchema.optional().messages({
        'string.pattern.base': 'Invalid NGO ID format',
    }),
}).optional();

export const createReportValidation = celebrate({
    [Segments.BODY]: Joi.object({
        name: Joi.string().trim().required().messages({
            'string.empty': 'Report name is required',
            'any.required': 'Report name is required',
        }),
        description: Joi.string().trim().optional(),
        reportType: Joi.string()
            .valid('DASHBOARD', 'CASE_ANALYTICS', 'INVESTIGATOR', 'EVIDENCE', 'CUSTOM')
            .required()
            .messages({
                'any.only': 'reportType must be one of: DASHBOARD, CASE_ANALYTICS, INVESTIGATOR, EVIDENCE, CUSTOM',
                'any.required': 'reportType is required',
            }),
        filters: filtersSchema,
        groupBy: Joi.string().trim().optional(),
        sortBy: Joi.string().trim().optional(),
        sortOrder: Joi.string().valid('ASC', 'DESC').optional().messages({
            'any.only': 'sortOrder must be ASC or DESC',
        }),
    }),
});

export const updateReportValidation = celebrate({
    [Segments.PARAMS]: Joi.object({
        id: objectIdSchema.required().messages({
            'string.pattern.base': 'Invalid report ID format',
            'any.required': 'Report ID is required',
        }),
    }),
    [Segments.BODY]: Joi.object({
        name: Joi.string().trim().optional(),
        description: Joi.string().trim().optional(),
        reportType: Joi.string()
            .valid('DASHBOARD', 'CASE_ANALYTICS', 'INVESTIGATOR', 'EVIDENCE', 'CUSTOM')
            .optional()
            .messages({ 'any.only': 'reportType must be one of: DASHBOARD, CASE_ANALYTICS, INVESTIGATOR, EVIDENCE, CUSTOM' }),
        filters: filtersSchema,
        groupBy: Joi.string().trim().optional(),
        sortBy: Joi.string().trim().optional(),
        sortOrder: Joi.string().valid('ASC', 'DESC').optional(),
    }).min(1).messages({ 'object.min': 'At least one field must be provided for update' }),
});

export const reportIdValidation = celebrate({
    [Segments.PARAMS]: Joi.object({
        id: objectIdSchema.required().messages({
            'string.pattern.base': 'Invalid report ID format',
            'any.required': 'Report ID is required',
        }),
    }),
});

export const getReportsQueryValidation = celebrate({
    [Segments.QUERY]: Joi.object({
        reportType: Joi.string()
            .valid('DASHBOARD', 'CASE_ANALYTICS', 'INVESTIGATOR', 'EVIDENCE', 'CUSTOM')
            .optional(),
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
    }),
});
