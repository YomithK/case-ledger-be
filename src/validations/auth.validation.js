import { celebrate, Joi, Segments } from 'celebrate';

// Sri Lankan NIC validation regex
const NIC_OLD_FORMAT = /^[0-9]{9}[vVxX]$/;
const NIC_NEW_FORMAT = /^[0-9]{12}$/;

export const registerValidation = celebrate({
    [Segments.BODY]: Joi.object({
        name: Joi.string().required().trim().messages({
            'string.empty': 'Name is required',
            'any.required': 'Name is required',
        }),
        email: Joi.string().email().required().lowercase().messages({
            'string.email': 'Please provide a valid email address',
            'string.empty': 'Email is required',
            'any.required': 'Email is required',
        }),
        password: Joi.string().min(6).required().messages({
            'string.min': 'Password must be at least 6 characters long',
            'string.empty': 'Password is required',
            'any.required': 'Password is required',
        }),
        role: Joi.string().valid('ADMIN', 'INVESTIGATOR', 'NGO').optional().messages({
            'any.only': 'Role must be one of: ADMIN, INVESTIGATOR, NGO',
        }),
        phoneNumber: Joi.string().pattern(/^[0-9]{10}$/).optional().messages({
            'string.pattern.base': 'Phone number must be a valid 10-digit number',
        }),
        organizationName: Joi.string().trim().when('role', {
            is: 'NGO',
            then: Joi.required(),
            otherwise: Joi.optional(),
        }).messages({
            'any.required': 'Organization name is required for NGO users',
        }),
        nic: Joi.string().trim().uppercase().when('role', {
            is: 'INVESTIGATOR',
            then: Joi.required().custom((value, helpers) => {
                if (!NIC_OLD_FORMAT.test(value) && !NIC_NEW_FORMAT.test(value)) {
                    return helpers.error('any.invalid');
                }
                return value;
            }),
            otherwise: Joi.optional(),
        }).messages({
            'any.required': 'NIC is required for INVESTIGATOR users',
            'any.invalid': 'Invalid NIC format. Use old format (9 digits + V) or new format (12 digits)',
        }),
        dob: Joi.date().max('now').when('role', {
            is: 'INVESTIGATOR',
            then: Joi.required(),
            otherwise: Joi.optional(),
        }).messages({
            'any.required': 'Date of birth is required for INVESTIGATOR users',
            'date.max': 'Date of birth must be in the past',
        }),
    }),
});

export const loginValidation = celebrate({
    [Segments.BODY]: Joi.object({
        email: Joi.string().email().required().lowercase().messages({
            'string.email': 'Please provide a valid email address',
            'string.empty': 'Email is required',
            'any.required': 'Email is required',
        }),
        password: Joi.string().required().messages({
            'string.empty': 'Password is required',
            'any.required': 'Password is required',
        }),
    }),
});
