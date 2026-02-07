const express = require('express');
const router = express.Router();
const PatientController = require('../controllers/patientController');
const { validate, schemas } = require('../middleware/validate');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, requireOwnershipOrAdmin } = require('../middleware/role-check');

/**
 * @route   GET /api/patients
 * @desc    Get all patients with search/filter
 * @access  Private (Admin, Doctor, Receptionist)
 */
router.get(
    '/',
    authenticateToken,
    requireRole(['admin', 'doctor', 'receptionist']),
    validate(schemas.pagination, 'query'),
    PatientController.getAllPatients
);

/**
 * @route   POST /api/patients
 * @desc    Create a new patient
 * @access  Private (Admin, Receptionist)
 */
router.post(
    '/',
    authenticateToken,
    requireRole(['admin', 'receptionist']),
    validate(schemas.patientCreate, 'body'),
    PatientController.createPatient
);

/**
 * @route   GET /api/patients/:id
 * @desc    Get patient by ID with full details
 * @access  Private (Admin, Doctor can see their patients, Receptionist)
 */
router.get(
    '/:id',
    authenticateToken,
    validate(schemas.uuidParam, 'params'),
    requireOwnershipOrAdmin('id', 'patient'),
    PatientController.getPatientById
);

/**
 * @route   PUT /api/patients/:id
 * @desc    Update patient information
 * @access  Private (Admin, Receptionist)
 */
router.put(
    '/:id',
    authenticateToken,
    requireRole(['admin', 'receptionist']),
    validate(schemas.uuidParam, 'params'),
    validate(schemas.patientUpdate, 'body'),
    PatientController.updatePatient
);

/**
 * @route   GET /api/patients/:id/appointments
 * @desc    Get patient's appointment history
 * @access  Private (Admin, Doctor can see their patients, Receptionist)
 */
router.get(
    '/:id/appointments',
    authenticateToken,
    validate(schemas.uuidParam, 'params'),
    requireOwnershipOrAdmin('id', 'patient'),
    PatientController.getPatientAppointments
);

/**
 * @route   GET /api/patients/search
 * @desc    Search patients by name or phone
 * @access  Private (Admin, Doctor, Receptionist)
 */
router.get(
    '/search',
    authenticateToken,
    requireRole(['admin', 'doctor', 'receptionist']),
    PatientController.searchPatients
);

/**
 * @route   GET /api/patients/stats/:id
 * @desc    Get patient statistics
 * @access  Private (Admin, Doctor can see their patients)
 */
router.get(
    '/stats/:id',
    authenticateToken,
    validate(schemas.uuidParam, 'params'),
    requireOwnershipOrAdmin('id', 'patient'),
    async (req, res) => {
        // This endpoint uses Patient.getStatistics() from model
        const Patient = require('../models/Patient');
        try {
            const statistics = await Patient.getStatistics(req.params.id);
            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: "Internal server error",
                message: error.message
            });
        }
    }
);

module.exports = router;