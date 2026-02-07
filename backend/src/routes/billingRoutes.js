const express = require('express');
const router = express.Router();
const BillController = require('../controllers/billController');
const { validate, schemas } = require('../middleware/validate');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role-check');

/**
 * @route   GET /api/bills
 * @desc    Get all bills with filters
 * @access  Private (Admin, Receptionist)
 */
router.get(
    '/',
    authenticateToken,
    requireRole(['admin', 'receptionist']),
    validate(schemas.pagination, 'query'),
    BillController.getAllBills
);

/**
 * @route   POST /api/bills
 * @desc    Create a new bill
 * @access  Private (Admin, Receptionist)
 */
router.post(
    '/',
    authenticateToken,
    requireRole(['admin', 'receptionist']),
    validate(schemas.billCreate, 'body'),
    BillController.createBill
);

/**
 * @route   GET /api/bills/:id
 * @desc    Get bill details with items
 * @access  Private (Admin, Receptionist, Patient can see own bills)
 */
router.get(
    '/:id',
    authenticateToken,
    validate(schemas.uuidParam, 'params'),
    async (req, res, next) => {
        // Check if user is patient trying to access their own bill
        if (req.user.role === 'patient') {
            const Bill = require('../models/Bill');
            try {
                const bill = await Bill.findByIdWithItems(req.params.id);
                if (!bill || bill.patient_id !== req.user.id) {
                    return res.status(403).json({
                        success: false,
                        error: "Access denied",
                        message: "You can only view your own bills."
                    });
                }
                return res.json({
                    success: true,
                    data: bill
                });
            } catch (error) {
                return next(error);
            }
        }
        next();
    },
    BillController.getBillById
);

/**
 * @route   PUT /api/bills/:id/status
 * @desc    Update bill payment status
 * @access  Private (Admin, Receptionist)
 */
router.put(
    '/:id/status',
    authenticateToken,
    requireRole(['admin', 'receptionist']),
    validate(schemas.uuidParam, 'params'),
    validate(schemas.billStatus, 'body'),
    BillController.updateBillStatus
);

/**
 * @route   GET /api/bills/:id/invoice
 * @desc    Generate/download invoice
 * @access  Private (Admin, Receptionist, Patient can get own invoice)
 */
router.get(
    '/:id/invoice',
    authenticateToken,
    validate(schemas.uuidParam, 'params'),
    BillController.generateInvoice
);

/**
 * @route   GET /api/bills/summary
 * @desc    Get payment summary statistics
 * @access  Private (Admin only)
 */
router.get(
    '/summary',
    authenticateToken,
    requireRole(['admin']),
    BillController.getPaymentSummary
);

/**
 * @route   GET /api/bills/patient/:patient_id
 * @desc    Get patient's bills
 * @access  Private (Admin, Receptionist, Patient can see own)
 */
router.get(
    '/patient/:patient_id',
    authenticateToken,
    validate({ patient_id: Joi.string().uuid().required() }, 'params'),
    async (req, res, next) => {
        if (req.user.role === 'patient' && req.params.patient_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: "Access denied",
                message: "You can only view your own bills."
            });
        }
        next();
    },
    BillController.getAllBills
);

module.exports = router;