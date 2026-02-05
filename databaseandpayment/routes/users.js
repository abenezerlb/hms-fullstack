const express = require('express');
const router = express.Router();
const UserController = require('../controllers/userController');
const { 
  authenticateToken, 
  authorizeRoles, 
  authorizeSelfOrAdmin 
} = require('../middleware/auth');
const validateRequest = require('../middleware/validate');
const { 
  createUserSchema, 
  updateUserSchema,
  updatePasswordSchema 
} = require('../validators/userValidator');

// Apply authentication to all user routes
router.use(authenticateToken);

/**
 * POST /api/users
 * Create new user (Admin only)
 * 
 * Middleware chain:
 * 1. authorizeRoles('admin') - Only admin can create users
 * 2. validateRequest(createUserSchema) - Validate request body
 * 3. UserController.createUser - Handle request
 */
router.post(
  '/',
  authorizeRoles('admin'),
  validateRequest(createUserSchema),
  UserController.createUser
);

/**
 * GET /api/users
 * Get all users with pagination (Admin only)
 */
router.get(
  '/',
  authorizeRoles('admin'),
  UserController.getAllUsers
);

/**
 * GET /api/users/:id
 * Get specific user
 * 
 * Custom authorization: Users can get their own data, admins can get any data
 */
router.get(
  '/:id',
  authorizeSelfOrAdmin(),
  UserController.getUserById
);

/**
 * PUT /api/users/:id
 * Update user information
 * 
 * Users can update themselves, admins can update any user
 */
router.put(
  '/:id',
  authorizeSelfOrAdmin(),
  validateRequest(updateUserSchema),
  UserController.updateUser
);

/**
 * DELETE /api/users/:id
 * Delete user (Admin only - soft delete)
 */
router.delete(
  '/:id',
  authorizeRoles('admin'),
  UserController.deleteUser
);

/**
 * PUT /api/users/:id/password
 * Update user password
 * 
 * Users can update their own password with current password verification
 * Admins can update any password without verification
 */
router.put(
  '/:id/password',
  authorizeSelfOrAdmin(),
  validateRequest(updatePasswordSchema),
  UserController.updatePassword
);

module.exports = router;