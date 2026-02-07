/**
 * Role-Based Access Control Middleware
 * Checks if user has required role/permissions
 */

/**
 * Middleware to require specific role(s)
 * @param {string|Array} roles - Required role(s)
 */
const requireRole = (roles) => {
    return (req, res, next) => {
        try {
            // Check if user is authenticated
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: "Authentication required",
                    message: "You must be logged in to access this resource."
                });
            }
            
            const userRole = req.user.role;
            
            // Convert single role to array for consistent handling
            const requiredRoles = Array.isArray(roles) ? roles : [roles];
            
            // Check if user has required role
            if (!requiredRoles.includes(userRole)) {
                return res.status(403).json({
                    success: false,
                    error: "Access denied",
                    message: `You don't have permission to access this resource. Required role: ${requiredRoles.join(' or ')}`
                });
            }
            
            next();
            
        } catch (error) {
            console.error('Role Check Middleware Error:', error);
            return res.status(500).json({
                success: false,
                error: "Internal server error",
                message: "Authorization check failed."
            });
        }
    };
};

/**
 * Middleware to require admin role
 */
const requireAdmin = requireRole('admin');

/**
 * Middleware to require doctor role
 */
const requireDoctor = requireRole('doctor');

/**
 * Middleware to require receptionist role
 */
const requireReceptionist = requireRole('receptionist');

/**
 * Middleware to require lab technician role
 */
const requireLabTechnician = requireRole('lab_technician');

/**
 * Middleware to check if user is accessing their own resource or is admin
 * @param {string} resourceIdParam - Name of the parameter containing resource ID
 * @param {string} resourceType - Type of resource ('user', 'patient', etc.)
 */
const requireOwnershipOrAdmin = (resourceIdParam = 'id', resourceType = 'user') => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: "Authentication required",
                    message: "You must be logged in."
                });
            }
            
            const userId = req.user.id;
            const userRole = req.user.role;
            const resourceId = req.params[resourceIdParam];
            
            // Admin can access any resource
            if (userRole === 'admin') {
                return next();
            }
            
            // Check if user is accessing their own resource
            if (resourceId === userId) {
                return next();
            }
            
            // For patients: doctors can access their patients' records
            if (resourceType === 'patient' && userRole === 'doctor') {
                // Check if this patient has appointments with this doctor
                const db = require('../config/database');
                const result = await db.query(
                    `SELECT 1 FROM appointments 
                     WHERE patient_id = $1 AND doctor_id = $2 
                     LIMIT 1`,
                    [resourceId, userId]
                );
                
                if (result.rows.length > 0) {
                    return next();
                }
            }
            
            // For medical records: doctors can access their own records
            if (resourceType === 'medical_record' && userRole === 'doctor') {
                const db = require('../config/database');
                const result = await db.query(
                    `SELECT 1 FROM medical_records 
                     WHERE id = $1 AND doctor_id = $2 
                     LIMIT 1`,
                    [resourceId, userId]
                );
                
                if (result.rows.length > 0) {
                    return next();
                }
            }
            
            // Access denied
            return res.status(403).json({
                success: false,
                error: "Access denied",
                message: `You can only access your own ${resourceType} records.`
            });
            
        } catch (error) {
            console.error('Ownership Check Error:', error);
            return res.status(500).json({
                success: false,
                error: "Internal server error",
                message: "Authorization check failed."
            });
        }
    };
};

/**
 * Middleware to check department access
 * @param {string} requiredDepartment - Required department
 */
const requireDepartment = (requiredDepartment) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: "Authentication required",
                    message: "You must be logged in."
                });
            }
            
            const userDepartment = req.user.department;
            
            // Admin can access any department
            if (req.user.role === 'admin') {
                return next();
            }
            
            // Check department access
            if (userDepartment !== requiredDepartment) {
                return res.status(403).json({
                    success: false,
                    error: "Access denied",
                    message: `You don't have permission to access ${requiredDepartment} department resources.`
                });
            }
            
            next();
            
        } catch (error) {
            console.error('Department Check Error:', error);
            return res.status(500).json({
                success: false,
                error: "Internal server error",
                message: "Authorization check failed."
            });
        }
    };
};

module.exports = {
    requireRole,
    requireAdmin,
    requireDoctor,
    requireReceptionist,
    requireLabTechnician,
    requireOwnershipOrAdmin,
    requireDepartment
};