import { celebrate, Joi, Segments } from 'celebrate';

/**
 * Validation for creating a new case
 */
export const createCaseValidation = celebrate({
    [Segments.BODY]: Joi.object({
        title: Joi.string().required().trim().messages({
            'string.empty': 'Title is required',
            'any.required': 'Title is required',
        }),
        description: Joi.string().required().messages({
            'string.empty': 'Description is required',
            'any.required': 'Description is required',
        }),
        category: Joi.string()
            .valid(
                'CUSTODIAL_VIOLENCE',
                'DISCRIMINATION',
                'UNLAWFUL_DETENTION',
                'FREEDOM_OF_EXPRESSION',
                'LABOR_RIGHTS',
                'OTHER'
            )
            .required()
            .messages({
                'any.only': 'Category must be one of: CUSTODIAL_VIOLENCE, DISCRIMINATION, UNLAWFUL_DETENTION, FREEDOM_OF_EXPRESSION, LABOR_RIGHTS, OTHER',
                'any.required': 'Category is required',
            }),
        priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional().messages({
            'any.only': 'Priority must be one of: LOW, MEDIUM, HIGH, CRITICAL',
        }),
        incidentDate: Joi.date().max('now').required().messages({
            'date.base': 'Incident date must be a valid date',
            'date.max': 'Incident date cannot be in the future',
            'any.required': 'Incident date is required',
        }),
        location: Joi.string().required().trim().messages({
            'string.empty': 'Location is required',
            'any.required': 'Location is required',
        }),
        caseReferenceNumber: Joi.string().trim().optional(),
        confidentialLevel: Joi.string().valid('PUBLIC', 'INTERNAL', 'CONFIDENTIAL').optional().messages({
            'any.only': 'Confidential level must be one of: PUBLIC, INTERNAL, CONFIDENTIAL',
        }),
        relatedUsers: Joi.array()
            .items(
                Joi.object({
                    user: Joi.string()
                        .regex(/^[0-9a-fA-F]{24}$/)
                        .required()
                        .messages({
                            'string.pattern.base': 'Each relatedUsers entry must have a valid user ID',
                            'any.required': 'User ID is required in each relatedUsers entry',
                        }),
                    role: Joi.string()
                        .valid('VICTIM', 'WITNESS', 'COMPLAINANT')
                        .required()
                        .messages({
                            'any.only': 'relatedUsers role must be one of: VICTIM, WITNESS, COMPLAINANT',
                            'any.required': 'Role is required in each relatedUsers entry',
                        }),
                })
            )
            .optional()
            .messages({
                'array.base': 'relatedUsers must be an array',
            }),
    }),
});

/**
 * Validation for updating a case
 */
export const updateCaseValidation = celebrate({
    [Segments.PARAMS]: Joi.object({
        id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
            'string.pattern.base': 'Invalid case ID format',
            'any.required': 'Case ID is required',
        }),
    }),
    [Segments.BODY]: Joi.object({
        title: Joi.string().trim().optional(),
        description: Joi.string().optional(),
        category: Joi.string()
            .valid(
                'CUSTODIAL_VIOLENCE',
                'DISCRIMINATION',
                'UNLAWFUL_DETENTION',
                'FREEDOM_OF_EXPRESSION',
                'LABOR_RIGHTS',
                'OTHER'
            )
            .optional()
            .messages({
                'any.only': 'Category must be one of: CUSTODIAL_VIOLENCE, DISCRIMINATION, UNLAWFUL_DETENTION, FREEDOM_OF_EXPRESSION, LABOR_RIGHTS, OTHER',
            }),
        priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional().messages({
            'any.only': 'Priority must be one of: LOW, MEDIUM, HIGH, CRITICAL',
        }),
        incidentDate: Joi.date().max('now').optional().messages({
            'date.base': 'Incident date must be a valid date',
            'date.max': 'Incident date cannot be in the future',
        }),
        location: Joi.string().trim().optional(),
        caseReferenceNumber: Joi.string().trim().optional(),
        confidentialLevel: Joi.string().valid('PUBLIC', 'INTERNAL', 'CONFIDENTIAL').optional().messages({
            'any.only': 'Confidential level must be one of: PUBLIC, INTERNAL, CONFIDENTIAL',
        }),
        // Prevent updates to protected fields
        status: Joi.forbidden(),
        assignedInvestigator: Joi.forbidden(),
        assignedAt: Joi.forbidden(),
        reportedBy: Joi.forbidden(),
        isArchived: Joi.forbidden(),
        caseNumber: Joi.forbidden(),
    })
        .min(1)
        .messages({
            'object.min': 'At least one field must be provided for update',
        }),
});

/**
 * Validation for assigning investigator
 */
export const assignInvestigatorValidation = celebrate({
    [Segments.PARAMS]: Joi.object({
        id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
            'string.pattern.base': 'Invalid case ID format',
            'any.required': 'Case ID is required',
        }),
    }),
    [Segments.BODY]: Joi.object({
        investigatorId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
            'string.pattern.base': 'Invalid investigator ID format',
            'any.required': 'Investigator ID is required',
        }),
    }),
});

/**
 * Validation for updating case status
 */
export const updateStatusValidation = celebrate({
    [Segments.PARAMS]: Joi.object({
        id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
            'string.pattern.base': 'Invalid case ID format',
            'any.required': 'Case ID is required',
        }),
    }),
    [Segments.BODY]: Joi.object({
        status: Joi.string()
            .valid(
                'REPORTED',
                'UNDER_INVESTIGATION',
                'EVIDENCE_COLLECTED',
                'RESOLVED',
                'CLOSED',
                'REJECTED'
            )
            .required()
            .messages({
                'any.only': 'Status must be one of: REPORTED, UNDER_INVESTIGATION, EVIDENCE_COLLECTED, RESOLVED, CLOSED, REJECTED',
                'any.required': 'Status is required',
            }),
    }),
});

/**
 * Validation for getting cases with filters
 */
export const getCasesValidation = celebrate({
    [Segments.QUERY]: Joi.object({
        status: Joi.string()
            .valid(
                'REPORTED',
                'UNDER_INVESTIGATION',
                'EVIDENCE_COLLECTED',
                'RESOLVED',
                'CLOSED',
                'REJECTED'
            )
            .optional()
            .messages({
                'any.only': 'Status must be one of: REPORTED, UNDER_INVESTIGATION, EVIDENCE_COLLECTED, RESOLVED, CLOSED, REJECTED',
            }),
        priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional().messages({
            'any.only': 'Priority must be one of: LOW, MEDIUM, HIGH, CRITICAL',
        }),
        category: Joi.string()
            .valid(
                'CUSTODIAL_VIOLENCE',
                'DISCRIMINATION',
                'UNLAWFUL_DETENTION',
                'FREEDOM_OF_EXPRESSION',
                'LABOR_RIGHTS',
                'OTHER'
            )
            .optional()
            .messages({
                'any.only': 'Category must be one of: CUSTODIAL_VIOLENCE, DISCRIMINATION, UNLAWFUL_DETENTION, FREEDOM_OF_EXPRESSION, LABOR_RIGHTS, OTHER',
            }),
        page: Joi.number().integer().min(1).optional().messages({
            'number.base': 'Page must be a number',
            'number.min': 'Page must be at least 1',
        }),
        limit: Joi.number().integer().min(1).max(100).optional().messages({
            'number.base': 'Limit must be a number',
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 100',
        }),
        search: Joi.string().trim().optional(),
    }),
});

/**
 * Validation for case ID parameter
 */
export const caseIdValidation = celebrate({
    [Segments.PARAMS]: Joi.object({
        id: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
            'string.pattern.base': 'Invalid case ID format',
            'any.required': 'Case ID is required',
        }),
    }),
});

/**
 * Validation for GET /cases/public – optional pagination query params
 */
export const getPublicCasesValidation = celebrate({
    [Segments.QUERY]: Joi.object({
        page: Joi.number().integer().min(1).optional().messages({
            'number.base': 'Page must be a number',
            'number.min': 'Page must be at least 1',
        }),
        limit: Joi.number().integer().min(1).max(100).optional().messages({
            'number.base': 'Limit must be a number',
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 100',
        }),
    }),
});

/**
 * Validation for GET /cases/associated – optional pagination query params
 */
export const associatedCasesValidation = celebrate({
    [Segments.QUERY]: Joi.object({
        page: Joi.number().integer().min(1).optional().messages({
            'number.base': 'Page must be a number',
            'number.min': 'Page must be at least 1',
        }),
        limit: Joi.number().integer().min(1).max(100).optional().messages({
            'number.base': 'Limit must be a number',
            'number.min': 'Limit must be at least 1',
            'number.max': 'Limit cannot exceed 100',
        }),
    }),
});
