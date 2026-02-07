const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { validate, schemas } = require('../middleware/validate');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin, requireRole, requireOwnershipOrAdmin } = require('../middleware/role-check');

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination
 * @access  Private (Admin only)
 */
router.get(
    '/',
    authenticateToken,
    requireAdmin,
    validate(schemas.pagination, 'query'),
    UserController.getAllUsers
);

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Private (Admin only)
 */
router.post(
    '/',
    authenticateToken,
    requireAdmin,
    validate(schemas.userCreate, 'body'),
    UserController.createUser
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (User can see own profile, Admin can see all)
 */
router.get(
    '/:id',
    authenticateToken,
    validate(schemas.uuidParam, 'params'),
    requireOwnershipOrAdmin('id', 'user'),
    UserController.getUserById
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user information
 * @access  Private (User can update own profile, Admin can update all)
 */
router.put(
    '/:id',
    authenticateToken,
    validate(schemas.uuidParam, 'params'),
    validate(schemas.userUpdate, 'body'),
    requireOwnershipOrAdmin('id', 'user'),
    UserController.updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete)
 * @access  Private (Admin only)
 */
router.delete(
    '/:id',
    authenticateToken,
    requireAdmin,
    validate(schemas.uuidParam, 'params'),
    UserController.deleteUser
);

/**
 * @route   PUT /api/users/:id/password
 * @desc    Update user password
 * @access  Private (User can update own password, Admin can update any)
 */
router.put(
    '/:id/password',
    authenticateToken,
    validate(schemas.uuidParam, 'params'),
    validate(schemas.userPassword, 'body'),
    requireOwnershipOrAdmin('id', 'user'),
    UserController.updatePassword
);

/**
 * @route   GET /api/users/me
 * @desc    Get current user (shortcut for /users/:id)
 * @access  Private
 */
router.get(
    '/me',
    authenticateToken,
    (req, res, next) => {
        req.params.id = req.user.id;
        next();
    },
    UserController.getUserById
);

/**
 * @route   PUT /api/users/me
 * @desc    Update current user
 * @access  Private
 */
router.put(
    '/me',
    authenticateToken,
    (req, res, next) => {
        req.params.id = req.user.id;
        next();
    },
    validate(schemas.userUpdate, 'body'),
    UserController.updateUser
);

/**
 * @route   GET /api/users/role/:role
 * @desc    Get users by role
 * @access  Private (Admin only)
 */
router.get(
    '/role/:role',
    authenticateToken,
    requireAdmin,
    (req, res, next) => {
        // Validate role parameter
        const validRoles = ['admin', 'doctor', 'receptionist', 'lab_technician'];
        if (!validRoles.includes(req.params.role)) {
            return res.status(400).json({
                success: false,
                error: "Invalid role",
                message: `Role must be one of: ${validRoles.join(', ')}`
            });
        }
        next();
    },
    UserController.getAllUsers
);

module.exports = router;