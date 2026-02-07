const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { validate, schemas } = require('../middleware/validate');
const { authenticateToken, optionalAuthenticate } = require('../middleware/auth');

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get token
 * @access  Public
 */
router.post(
    '/login',
    validate(schemas.login, 'body'),
    AuthController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public (but requires refresh token)
 */
router.post(
    '/refresh',
    validate(schemas.refreshToken, 'body'),
    AuthController.refreshToken
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
    '/profile',
    authenticateToken,
    AuthController.getProfile
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token deletion)
 * @access  Private
 */
router.post(
    '/logout',
    authenticateToken,
    (req, res) => {
        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    }
);

/**
 * @route   GET /api/auth/check
 * @desc    Check if token is valid
 * @access  Public (returns user info if token valid)
 */
router.get(
    '/check',
    optionalAuthenticate,
    (req, res) => {
        if (req.user) {
            res.json({
                success: true,
                authenticated: true,
                user: {
                    id: req.user.id,
                    email: req.user.email,
                    role: req.user.role,
                    name: req.user.name
                }
            });
        } else {
            res.json({
                success: true,
                authenticated: false,
                message: 'No valid authentication token'
            });
        }
    }
);

module.exports = router;