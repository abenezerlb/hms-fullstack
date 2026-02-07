const logger = require('../utils/logger');

/**
 * Centralized Error Handling Middleware
 * Catches all errors and returns consistent error responses
 */

class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.timestamp = new Date().toISOString();
        
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 404 Not Found Middleware
 */
const notFound = (req, res, next) => {
    const error = new AppError(`Cannot ${req.method} ${req.originalUrl}`, 404);
    next(error);
};

/**
 * Global Error Handler
 */
const errorHandler = (err, req, res, next) => {
    // Default values
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    err.message = err.message || 'Something went wrong';
    
    // Log error
    logger.error('Error Handler:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        user: req.user ? req.user.id : 'anonymous'
    });
    
    // Development vs Production error responses
    if (process.env.NODE_ENV === 'development') {
        return res.status(err.statusCode).json({
            success: false,
            error: err.status,
            message: err.message,
            stack: err.stack,
            path: req.originalUrl,
            timestamp: new Date().toISOString()
        });
    }
    
    // Production error response (hide sensitive info)
    // Handle specific error types
    if (err.name === 'ValidationError') {
        // MongoDB validation error
        return res.status(400).json({
            success: false,
            error: "Validation Error",
            message: "Invalid input data.",
            details: Object.values(err.errors).map(e => e.message)
        });
    }
    
    if (err.code === 11000) {
        // MongoDB duplicate key error
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({
            success: false,
            error: "Duplicate Entry",
            message: `${field} already exists.`,
            field: field
        });
    }
    
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: "Invalid Token",
            message: "Invalid authentication token."
        });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: "Token Expired",
            message: "Authentication token has expired. Please login again."
        });
    }
    
    if (err.name === 'CastError') {
        // MongoDB invalid ID
        return res.status(400).json({
            success: false,
            error: "Invalid ID",
            message: `Invalid ${err.path}: ${err.value}.`
        });
    }
    
    // PostgreSQL errors
    if (err.code === '23505') { // Unique violation
        return res.status(409).json({
            success: false,
            error: "Conflict",
            message: "Duplicate entry detected."
        });
    }
    
    if (err.code === '23503') { // Foreign key violation
        return res.status(400).json({
            success: false,
            error: "Reference Error",
            message: "Referenced record does not exist."
        });
    }
    
    if (err.code === '23514') { // Check constraint violation
        return res.status(400).json({
            success: false,
            error: "Constraint Error",
            message: "Data violates constraint rules."
        });
    }
    
    if (err.code === '23502') { // Not null violation
        return res.status(400).json({
            success: false,
            error: "Missing Required Field",
            message: "A required field is missing."
        });
    }
    
    // Generic error response
    const response = {
        success: false,
        error: err.isOperational ? err.message : 'Internal Server Error',
        message: err.isOperational ? err.message : 'Something went wrong on our end. Please try again later.'
    };
    
    // Add details if available and in development
    if (process.env.NODE_ENV === 'development' && err.details) {
        response.details = err.details;
    }
    
    res.status(err.statusCode).json(response);
};

/**
 * Async handler wrapper to avoid try-catch blocks in controllers
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Validate request body middleware
 */
const validateRequestBody = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: "Validation Error",
                message: error.details[0].message
            });
        }
        next();
    };
};

/**
 * Validate request query middleware
 */
const validateRequestQuery = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.query);
        if (error) {
            return res.status(400).json({
                success: false,
                error: "Validation Error",
                message: error.details[0].message
            });
        }
        next();
    };
};

/**
 * Validate request params middleware
 */
const validateRequestParams = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.params);
        if (error) {
            return res.status(400).json({
                success: false,
                error: "Validation Error",
                message: error.details[0].message
            });
        }
        next();
    };
};

module.exports = {
    AppError,
    notFound,
    errorHandler,
    asyncHandler,
    validateRequestBody,
    validateRequestQuery,
    validateRequestParams
};