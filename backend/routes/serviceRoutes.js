const express = require('express');
const router = express.Router();
const ServiceController = require('../controllers/serviceController');
const { validate, schemas } = require('../middleware/validate');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role-check');

/**
 * @route   GET /api/services
 * @desc    Get all medical services
 * @access  Private (All authenticated users)
 */
router.get(
    '/',
    authenticateToken,
    validate(schemas.pagination, 'query'),
    ServiceController.getAllServices
);

/**
 * @route   POST /api/services
 * @desc    Add new service (Admin only)
 * @access  Private (Admin only)
 */
router.post(
    '/',
    authenticateToken,
    requireRole(['admin']),
    validate(schemas.serviceCreate, 'body'),
    ServiceController.createService
);

/**
 * @route   GET /api/services/:id
 * @desc    Get service by ID
 * @access  Private (All authenticated users)
 */
router.get(
    '/:id',
    authenticateToken,
    validate(schemas.uuidParam, 'params'),
    ServiceController.getServiceById
);

/**
 * @route   GET /api/services/code/:code
 * @desc    Get service by code
 * @access  Private (All authenticated users)
 */
router.get(
    '/code/:code',
    authenticateToken,
    ServiceController.getServiceByCode
);

/**
 * @route   PUT /api/services/:id
 * @desc    Update service
 * @access  Private (Admin only)
 */
router.put(
    '/:id',
    authenticateToken,
    requireRole(['admin']),
    validate(schemas.uuidParam, 'params'),
    ServiceController.updateService
);

/**
 * @route   DELETE /api/services/:id
 * @desc    Delete service (soft delete)
 * @access  Private (Admin only)
 */
router.delete(
    '/:id',
    authenticateToken,
    requireRole(['admin']),
    validate(schemas.uuidParam, 'params'),
    ServiceController.deleteService
);

/**
 * @route   PUT /api/services/:id/deactivate
 * @desc    Deactivate service
 * @access  Private (Admin only)
 */
router.put(
    '/:id/deactivate',
    authenticateToken,
    requireRole(['admin']),
    validate(schemas.uuidParam, 'params'),
    ServiceController.deactivateService
);

/**
 * @route   PUT /api/services/:id/activate
 * @desc    Activate service
 * @access  Private (Admin only)
 */
router.put(
    '/:id/activate',
    authenticateToken,
    requireRole(['admin']),
    validate(schemas.uuidParam, 'params'),
    ServiceController.activateService
);

/**
 * @route   GET /api/services/category/:category
 * @desc    Get services by category
 * @access  Private (All authenticated users)
 */
router.get(
    '/category/:category',
    authenticateToken,
    ServiceController.getServicesByCategory
);

/**
 * @route   GET /api/services/categories
 * @desc    Get service categories
 * @access  Private (All authenticated users)
 */
router.get(
    '/categories',
    authenticateToken,
    ServiceController.getServiceCategories
);

/**
 * @route   GET /api/services/search
 * @desc    Search services by name or description
 * @access  Private (All authenticated users)
 */
router.get(
    '/search',
    authenticateToken,
    ServiceController.searchServices
);

/**
 * @route   POST /api/services/import
 * @desc    Import multiple services
 * @access  Private (Admin only)
 */
router.post(
    '/import',
    authenticateToken,
    requireRole(['admin']),
    ServiceController.importServices
);

/**
 * @route   GET /api/services/statistics
 * @desc    Get service statistics
 * @access  Private (Admin only)
 */
router.get(
    '/statistics',
    authenticateToken,
    requireRole(['admin']),
    ServiceController.getServiceStatistics
);

module.exports = router;