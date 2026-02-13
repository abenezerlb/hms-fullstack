const Joi = require('joi');

// Joi validation schemas for user-related requests

// Ethiopian phone number regex pattern
const ethiopianPhoneRegex = /^\+251[1-9][0-9]{8}$/;

// Available roles from your database schema
const validRoles = ['admin', 'doctor', 'receptionist', 'lab_technician'];

// Gender options (for patient validation - included here for completeness)
const validGenders = ['male', 'female', 'other'];

/**
 * Schema for creating a new user
 */
const createUserSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.base': 'Name must be a string',
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
  
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required()
    .messages({
      'string.base': 'Email must be a string',
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .min(6)
    .max(100)
    .required()
    .messages({
      'string.base': 'Password must be a string',
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required'
    }),
  
  role: Joi.string()
    .valid(...validRoles)
    .required()
    .messages({
      'string.base': 'Role must be a string',
      'any.only': `Role must be one of: ${validRoles.join(', ')}`,
      'any.required': 'Role is required'
    }),
  
  specialization: Joi.string()
    .trim()
    .max(100)
    .allow('', null)
    .optional()
    .messages({
      'string.base': 'Specialization must be a string',
      'string.max': 'Specialization cannot exceed 100 characters'
    }),
  
  phone: Joi.string()
    .trim()
    .pattern(ethiopianPhoneRegex)
    .messages({
      'string.base': 'Phone must be a string',
      'string.pattern.base': 'Phone number must be in format: +251XXXXXXXXX'
    })
    .allow('', null)
    .optional(),
  
  department: Joi.string()
    .trim()
    .max(100)
    .allow('', null)
    .optional()
    .messages({
      'string.base': 'Department must be a string',
      'string.max': 'Department cannot exceed 100 characters'
    }),
  
  is_active: Joi.boolean()
    .default(true)
    .optional()
    .messages({
      'boolean.base': 'is_active must be a boolean value'
    })
});

/**
 * Schema for updating a user
 */
const updateUserSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.base': 'Name must be a string',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters'
    }),
  
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .optional()
    .messages({
      'string.base': 'Email must be a string',
      'string.email': 'Please provide a valid email address'
    }),
  
  role: Joi.string()
    .valid(...validRoles)
    .optional()
    .messages({
      'string.base': 'Role must be a string',
      'any.only': `Role must be one of: ${validRoles.join(', ')}`
    }),
  
  specialization: Joi.string()
    .trim()
    .max(100)
    .allow('', null)
    .optional()
    .messages({
      'string.base': 'Specialization must be a string',
      'string.max': 'Specialization cannot exceed 100 characters'
    }),
  
  phone: Joi.string()
    .trim()
    .pattern(ethiopianPhoneRegex)
    .messages({
      'string.base': 'Phone must be a string',
      'string.pattern.base': 'Phone number must be in format: +251XXXXXXXXX'
    })
    .allow('', null)
    .optional(),
  
  department: Joi.string()
    .trim()
    .max(100)
    .allow('', null)
    .optional()
    .messages({
      'string.base': 'Department must be a string',
      'string.max': 'Department cannot exceed 100 characters'
    }),
  
  is_active: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'is_active must be a boolean value'
    })
})
  .min(1) // At least one field must be provided for update
  .messages({
    'object.min': 'At least one field must be provided for update'
  });

/**
 * Schema for user login
 */
const loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .email()
    .required()
    .messages({
      'string.base': 'Email must be a string',
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'string.base': 'Password must be a string',
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    })
});

/**
 * Schema for updating password
 */
const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .when('$isSelf', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.base': 'Current password must be a string',
      'string.empty': 'Current password is required when updating your own password',
      'any.required': 'Current password is required when updating your own password'
    }),
  
  newPassword: Joi.string()
    .min(6)
    .max(100)
    .required()
    .messages({
      'string.base': 'New password must be a string',
      'string.empty': 'New password is required',
      'string.min': 'New password must be at least 6 characters long',
      'any.required': 'New password is required'
    }),
  
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'string.base': 'Confirm password must be a string',
      'any.only': 'Passwords do not match',
      'any.required': 'Confirm password is required'
    })
})
  .with('newPassword', ['confirmPassword'])
  .messages({
    'object.with': 'New password and confirm password must be provided together'
  });

module.exports = {
  createUserSchema,
  updateUserSchema,
  loginSchema,
  updatePasswordSchema,
  ethiopianPhoneRegex,
  validRoles,
  validGenders
};