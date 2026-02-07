const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
const authenticateToken = (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: "Authentication required",
                message: "No authentication token provided."
            });
        }
        
        // Verify token
        jwt.verify(token, jwtConfig.secret, (err, user) => {
            if (err) {
                // Handle different JWT errors
                if (err.name === 'TokenExpiredError') {
                    return res.status(401).json({
                        success: false,
                        error: "Token expired",
                        message: "Authentication token has expired. Please login again."
                    });
                }
                
                if (err.name === 'JsonWebTokenError') {
                    return res.status(403).json({
                        success: false,
                        error: "Invalid token",
                        message: "Invalid authentication token."
                    });
                }
                
                return res.status(403).json({
                    success: false,
                    error: "Token verification failed",
                    message: "Failed to verify authentication token."
                });
            }
            
            // Attach user to request object
            req.user = user;
            next();
        });
        
    } catch (error) {
        console.error('Authentication Middleware Error:', error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
            message: "Authentication failed due to server error."
        });
    }
};

/**
 * Optional authentication - doesn't fail if no token, just sets req.user = null
 */
const optionalAuthenticate = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (token) {
            jwt.verify(token, jwtConfig.secret, (err, user) => {
                if (!err) {
                    req.user = user;
                }
                // Continue even if token is invalid (optional auth)
                next();
            });
        } else {
            req.user = null;
            next();
        }
    } catch (error) {
        req.user = null;
        next();
    }
};

/**
 * Generate JWT token
 * Utility function for controllers
 */
const generateToken = (user) => {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        department: user.department,
        specialization: user.specialization
    };
    
    return jwt.sign(payload, jwtConfig.secret, jwtConfig.options);
};

/**
 * Extract user ID from token (for socket.io or other uses)
 */
const getUserIdFromToken = (token) => {
    try {
        const decoded = jwt.verify(token, jwtConfig.secret);
        return decoded.id;
    } catch (error) {
        return null;
    }
};

module.exports = {
    authenticateToken,
    optionalAuthenticate,
    generateToken,
    getUserIdFromToken
};