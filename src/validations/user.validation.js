import { celebrate, Joi, Segments } from 'celebrate';

export const getUsersValidation = celebrate({
    [Segments.QUERY]: Joi.object({
        status: Joi.string().valid('active', 'inactive').optional(),
        type: Joi.string().valid('ADMIN', 'INVESTIGATOR', 'NGO', 'VICTIM').optional(),
        search: Joi.string().trim().optional(),
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
    }),
});

export const updateUserValidation = celebrate({
    [Segments.PARAMS]: Joi.object({
        id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
            'string.pattern.base': 'Invalid user ID format',
            'any.required': 'User ID is required',
        }),
    }),
    [Segments.BODY]: Joi.object({
        name: Joi.string().trim().optional(),
        email: Joi.string().email().lowercase().optional(),
        phoneNumber: Joi.string().pattern(/^[0-9]{10}$/).optional().messages({
            'string.pattern.base': 'Phone number must be a valid 10-digit number',
        }),
        organizationName: Joi.string().trim().optional(),
        // Prevent updates to sensitive fields through this endpoint
        // NIC, DOB, and role should not be updatable by users
    }).min(1).messages({
        'object.min': 'At least one field must be provided for update',
    }),
});

export const updateRoleValidation = celebrate({
    [Segments.PARAMS]: Joi.object({
        id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
            'string.pattern.base': 'Invalid user ID format',
            'any.required': 'User ID is required',
        }),
    }),
    [Segments.BODY]: Joi.object({
        role: Joi.string().valid('ADMIN', 'INVESTIGATOR', 'NGO', 'VICTIM').required().messages({
            'any.only': 'Role must be one of: ADMIN, INVESTIGATOR, NGO, VICTIM',
            'any.required': 'Role is required',
        }),
    }),
});

export const userIdValidation = celebrate({
    [Segments.PARAMS]: Joi.object({
        id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
            'string.pattern.base': 'Invalid user ID format',
            'any.required': 'User ID is required',
        }),
    }),
});
