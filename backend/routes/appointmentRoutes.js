const express = require('express');
const router = express.Router();
const AppointmentController = require('../controllers/appointmentController');
const { validate, schemas } = require('../middleware/validate');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role-check');

/**
 * @route   GET /api/appointments
 * @desc    Get all appointments with filters
 * @access  Private (Admin, Doctor, Receptionist)
 */
router.get(
    '/',
    authenticateToken,
    requireRole(['admin', 'doctor', 'receptionist']),
    validate(schemas.pagination, 'query'),
    AppointmentController.getAllAppointments
);

/**
 * @route   POST /api/appointments
 * @desc    Schedule a new appointment
 * @access  Private (Admin, Receptionist)
 */
router.post(
    '/',
    authenticateToken,
    requireRole(['admin', 'receptionist']),
    validate(schemas.appointmentCreate, 'body'),
    AppointmentController.createAppointment
);

/**
 * @route   GET /api/appointments/:id
 * @desc    Get appointment details
 * @access  Private (Admin, Doctor, Receptionist, and patient's doctor)
 */
router.get(
    '/:id',
    authenticateToken,
    validate(schemas.uuidParam, 'params'),
    AppointmentController.getAppointmentById
);

/**
 * @route   PUT /api/appointments/:id/status
 * @desc    Update appointment status
 * @access  Private (Admin, Doctor, Receptionist)
 */
router.put(
    '/:id/status',
    authenticateToken,
    requireRole(['admin', 'doctor', 'receptionist']),
    validate(schemas.uuidParam, 'params'),
    validate(schemas.appointmentStatus, 'body'),
    AppointmentController.updateAppointmentStatus
);

/**
 * @route   PUT /api/appointments/:id/cancel
 * @desc    Cancel an appointment
 * @access  Private (Admin, Receptionist, Patient can cancel their own)
 */
router.put(
    '/:id/cancel',
    authenticateToken,
    validate(schemas.uuidParam, 'params'),
    AppointmentController.cancelAppointment
);

/**
 * @route   GET /api/appointments/availability/:doctor_id
 * @desc    Get doctor's available slots
 * @access  Private (Admin, Doctor, Receptionist)
 */
router.get(
    '/availability/:doctor_id',
    authenticateToken,
    requireRole(['admin', 'doctor', 'receptionist']),
    validate({ doctor_id: Joi.string().uuid().required() }, 'params'),
    AppointmentController.getDoctorAvailability
);

/**
 * @route   GET /api/appointments/today
 * @desc    Get today's appointments
 * @access  Private (Admin, Doctor, Receptionist)
 */
router.get(
    '/today',
    authenticateToken,
    requireRole(['admin', 'doctor', 'receptionist']),
    AppointmentController.getAllAppointments // Will filter by today in controller
);

/**
 * @route   GET /api/appointments/upcoming
 * @desc    Get upcoming appointments (next 7 days)
 * @access  Private (Admin, Doctor, Receptionist)
 */
router.get(
    '/upcoming',
    authenticateToken,
    requireRole(['admin', 'doctor', 'receptionist']),
    (req, res, next) => {
        req.query.date_from = new Date().toISOString().split('T')[0];
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);
        req.query.date_to = futureDate.toISOString().split('T')[0];
        next();
    },
    AppointmentController.getAllAppointments
);

module.exports = router;