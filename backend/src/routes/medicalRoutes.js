const express = require('express');
const router = express.Router();
const MedicalRecordController = require('../controllers/medicalRecordController');
const { validate, schemas } = require('../middleware/validate');
const { authenticateToken } = require('../middleware/auth');
const { requireRole, requireOwnershipOrAdmin } = require('../middleware/role-check');

/**
 * @route   POST /api/medical-records
 * @desc    Create a new medical record (EHR)
 * @access  Private (Doctor only)
 */
router.post(
    '/',
    authenticateToken,
    requireRole(['doctor']),
    validate(schemas.medicalRecordCreate, 'body'),
    MedicalRecordController.createMedicalRecord
);

/**
 * @route   GET /api/medical-records/patient/:patient_id
 * @desc    Get patient's medical history
 * @access  Private (Admin, Doctor can see their patients)
 */
router.get(
    '/patient/:patient_id',
    authenticateToken,
    validate({ patient_id: Joi.string().uuid().required() }, 'params'),
    requireOwnershipOrAdmin('patient_id', 'patient'),
    MedicalRecordController.getPatientMedicalRecords
);

/**
 * @route   GET /api/medical-records/:id
 * @desc    Get specific medical record
 * @access  Private (Admin, Doctor who created it)
 */
router.get(
    '/:id',
    authenticateToken,
    validate(schemas.uuidParam, 'params'),
    requireOwnershipOrAdmin('id', 'medical_record'),
    MedicalRecordController.getMedicalRecordById
);

/**
 * @route   PUT /api/medical-records/:id
 * @desc    Update medical record
 * @access  Private (Doctor who created it, Admin)
 */
router.put(
    '/:id',
    authenticateToken,
    validate(schemas.uuidParam, 'params'),
    requireOwnershipOrAdmin('id', 'medical_record'),
    MedicalRecordController.updateMedicalRecord
);

/**
 * @route   GET /api/medical-records/search
 * @desc    Search medical records by diagnosis or symptoms
 * @access  Private (Admin, Doctor)
 */
router.get(
    '/search',
    authenticateToken,
    requireRole(['admin', 'doctor']),
    MedicalRecordController.searchMedicalRecords
);

/**
 * @route   GET /api/medical-records/patient/:patient_id/vitals
 * @desc    Get patient's vitals history
 * @access  Private (Admin, Doctor can see their patients)
 */
router.get(
    '/patient/:patient_id/vitals',
    authenticateToken,
    validate({ patient_id: Joi.string().uuid().required() }, 'params'),
    requireOwnershipOrAdmin('patient_id', 'patient'),
    MedicalRecordController.getPatientVitals
);

/**
 * @route   GET /api/medical-records/recent
 * @desc    Get recent medical records
 * @access  Private (Admin, Doctor)
 */
router.get(
    '/recent',
    authenticateToken,
    requireRole(['admin', 'doctor']),
    (req, res, next) => {
        req.query.limit = req.query.limit || 10;
        next();
    },
    (req, res) => {
        // Delegate to controller with recent filter
        const MedicalRecord = require('../models/MedicalRecord');
        MedicalRecord.findAll({}, 1, req.query.limit)
            .then(result => {
                res.json({
                    success: true,
                    data: result.data
                });
            })
            .catch(error => {
                res.status(500).json({
                    success: false,
                    error: "Internal server error",
                    message: error.message
                });
            });
    }
);

module.exports = router;