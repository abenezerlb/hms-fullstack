const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

/**
 * Authentication Middleware
 * Verifies JWT tokens from Authorization header
 */
const authenticateToken = (req, res, next) => {
  // Get token from Authorization header
  // Expected format: "Bearer <token>"
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
      message: "No token provided. Please login first."
    });
  }
  
  try {
    // Verify the token using the secret key
    // If verification fails, jwt.verify() will throw an error
    const decoded = jwt.verify(token, jwtConfig.secret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });
    
    // Attach decoded user data to request object
    // This makes user information available in subsequent middleware and controllers
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name,
      department: decoded.department
    };
    
    // Proceed to next middleware/route handler
    next();
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: "Token expired",
        message: "Your session has expired. Please login again."
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        error: "Invalid token",
        message: "Invalid authentication token."
      });
    }
    
    // Generic authentication error
    return res.status(403).json({
      success: false,
      error: "Authentication failed",
      message: "Failed to authenticate user."
    });
  }
};

/**
 * Role-Based Authorization Middleware
 * Checks if user has required role(s)
 * 
 * @param {...string} roles - Required roles (admin, doctor, receptionist, lab_technician)
 * @returns {Function} Middleware function
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        message: "User not authenticated."
      });
    }
    
    // Check if user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: "Access denied",
        message: `You need one of these roles: ${roles.join(', ')}. Your role: ${req.user.role}`
      });
    }
    
    // User has required role, proceed
    next();
  };
};

/**
 * Self or Admin Authorization Middleware
 * Allows users to access their own data or admins to access any data
 * 
 * @param {string} idParam - Name of the route parameter containing the ID
 * @returns {Function} Middleware function
 */
const authorizeSelfOrAdmin = (idParam = 'id') => {
  return (req, res, next) => {
    const requestedId = req.params[idParam];
    
    // Users can access their own data, admins can access any data
    if (req.user.id !== requestedId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "Access denied",
        message: "You can only access your own data."
      });
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeSelfOrAdmin
};