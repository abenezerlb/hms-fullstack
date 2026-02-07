const express = require('express');
const router = express.Router();
const HealthController = require('../controllers/healthController');

/**
 * @route   GET /api/health
 * @desc    Check system health
 * @access  Public
 */
router.get('/health', HealthController.getHealth);

/**
 * @route   GET /api/test-db
 * @desc    Test database connection
 * @access  Public (but rate limited)
 */
router.get('/test-db', HealthController.testDatabase);

/**
 * @route   GET /api/metrics
 * @desc    Get system metrics for monitoring
 * @access  Private (Admin only)
 */
router.get('/metrics', HealthController.getMetrics);

/**
 * @route   GET /api/ping
 * @desc    Ping endpoint for load balancers
 * @access  Public
 */
router.get('/ping', HealthController.ping);

/**
 * @route   GET /api/status
 * @desc    Get API status
 * @access  Public
 */
router.get('/status', HealthController.getStatus);

/**
 * @route   GET /api/version
 * @desc    Get API version info
 * @access  Public
 */
router.get('/version', (req, res) => {
    res.json({
        success: true,
        service: "Healthcare Management System API",
        version: process.env.APP_VERSION || "1.0.0",
        environment: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString(),
        uptime: HealthController.formatUptime(process.uptime())
    });
});

module.exports = router;