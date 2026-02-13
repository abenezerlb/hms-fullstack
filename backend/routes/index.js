const express = require('express');
const router = express.Router();

// Import all route files
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const patientRoutes = require('./patient.routes');
const appointmentRoutes = require('./appointment.routes');
const medicalRoutes = require('./medical.routes');
const billingRoutes = require('./billing.routes');
const paymentRoutes = require('./payment.routes');
const serviceRoutes = require('./service.routes');
const dashboardRoutes = require('./dashboard.routes');
const systemRoutes = require('./system.routes');

// Import middleware
const { cors, securityHeaders, requestId, responseTime, httpLogger, rateLimiter } = require('../middleware/logger');
const { errorHandler, notFound } = require('../middleware/errorHandler');

/**
 * Apply global middleware to all routes
 */
router.use(cors);
router.use(securityHeaders);
router.use(requestId);
router.use(responseTime);
router.use(httpLogger);
router.use(rateLimiter(100)); // 100 requests per 15 minutes

/**
 * API Routes
 */
router.use('/api/auth', authRoutes);
router.use('/api/users', userRoutes);
router.use('/api/patients', patientRoutes);
router.use('/api/appointments', appointmentRoutes);
router.use('/api/medical-records', medicalRoutes);
router.use('/api/bills', billingRoutes);
router.use('/api/payments', paymentRoutes);
router.use('/api/services', serviceRoutes);
router.use('/api/dashboard', dashboardRoutes);
router.use('/api', systemRoutes); // Health, test-db, etc.

/**
 * Welcome route
 */
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: '🏥 Healthcare Management System API',
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            patients: '/api/patients',
            appointments: '/api/appointments',
            medical: '/api/medical-records',
            bills: '/api/bills',
            payments: '/api/payments',
            services: '/api/services',
            dashboard: '/api/dashboard',
            system: '/api/health'
        }
    });
});

/**
 * API Documentation route
 */
router.get('/api/docs', (req, res) => {
    res.json({
        success: true,
        message: 'API Documentation',
        documentation_url: 'https://github.com/your-username/hms-api/docs',
        postman_collection: 'https://www.getpostman.com/collections/your-collection-id'
    });
});

/**
 * 404 handler - Catch all undefined routes
 */
router.use('*', notFound);

/**
 * Global error handler
 */
router.use(errorHandler);

module.exports = router;