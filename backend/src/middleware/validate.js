const Joi = require('joi');

/**
 * Validation Middleware using Joi
 * 
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'params', 'query')
 * @returns {Function} Express middleware function
 */
const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    // Get the data to validate from the specified request property
    const dataToValidate = req[property];
    
    // Add context if needed (for conditional validation)
    const context = {};
    if (property === 'body' && req.user) {
      // For password updates, check if user is updating themselves
      if (req.params.id && req.user.id === req.params.id) {
        context.isSelf = true;
      }
    }
    
    // Validate the data against the schema
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove fields not defined in schema
      context: context   // Pass context for conditional validation
    });
    
    // If validation fails, return error response
    if (error) {
      // Format error details
      const errors = error.details.map(detail => {
        // Extract field name and message
        const field = detail.path.join('.');
        let message = detail.message;
        
        // Remove Joi wrapper quotes from message
        message = message.replace(/['"]/g, '');
        
        return {
          field: field,
          message: message
        };
      });
      
      // Return validation error response
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Please check your input data",
        details: errors
      });
    }
    
    // Replace request data with validated and sanitized data
    req[property] = value;
    
    // Proceed to next middleware/route handler
    next();
  };
};

/**
 * Validate request parameters
 * Shortcut for validating URL parameters
 */
const validateParams = (schema) => {
  return validateRequest(schema, 'params');
};

/**
 * Validate query parameters
 * Shortcut for validating URL query parameters
 */
const validateQuery = (schema) => {
  return validateRequest(schema, 'query');
};

module.exports = validateRequest;
module.exports.validateParams = validateParams;
module.exports.validateQuery = validateQuery;