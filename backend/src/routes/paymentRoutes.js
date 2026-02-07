const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/paymentController');
const { validate, schemas } = require('../middleware/validate');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role-check');

/**
 * @route   POST /api/payments/initiate
 * @desc    Initiate a payment (Ethiopian payment methods)
 * @access  Private (Admin, Receptionist, Patient can pay own bills)
 */
router.post(
    '/initiate',
    authenticateToken,
    validate(schemas.paymentInitiate, 'body'),
    async (req, res, next) => {
        // Patients can only pay their own bills
        if (req.user.role === 'patient') {
            const Bill = require('../models/Bill');
            try {
                const bill = await Bill.findByIdWithItems(req.body.bill_id);
                if (!bill || bill.patient_id !== req.user.id) {
                    return res.status(403).json({
                        success: false,
                        error: "Access denied",
                        message: "You can only pay your own bills."
                    });
                }
            } catch (error) {
                return next(error);
            }
        } else if (!['admin', 'receptionist'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: "Access denied",
                message: "You don't have permission to initiate payments."
            });
        }
        next();
    },
    PaymentController.initiatePayment
);

/**
 * @route   GET /api/payments/verify/:transaction_id
 * @desc    Verify payment status
 * @access  Public (but rate limited)
 */
router.get(
    '/verify/:transaction_id',
    validate({ transaction_id: Joi.string().required() }, 'params'),
    PaymentController.verifyPayment
);

/**
 * @route   GET /api/payments/invoice/:bill_id
 * @desc    Generate/download invoice
 * @access  Private (Admin, Receptionist, Patient can get own invoice)
 */
router.get(
    '/invoice/:bill_id',
    authenticateToken,
    validate({ bill_id: Joi.string().uuid().required() }, 'params'),
    PaymentController.getInvoice
);

/**
 * @route   POST /api/payments/simulate
 * @desc    Simulate payment completion (for testing)
 * @access  Private (Admin only - testing only)
 */
router.post(
    '/simulate',
    authenticateToken,
    requireRole(['admin']),
    PaymentController.simulatePayment
);

/**
 * @route   GET /api/payments/summary
 * @desc    Get payment statistics
 * @access  Private (Admin only)
 */
router.get(
    '/summary',
    authenticateToken,
    requireRole(['admin']),
    PaymentController.getPaymentSummary
);

/**
 * @route   GET /api/payments/bill/:bill_id
 * @desc    Get payment history for a bill
 * @access  Private (Admin, Receptionist, Patient can see own)
 */
router.get(
    '/bill/:bill_id',
    authenticateToken,
    validate({ bill_id: Joi.string().uuid().required() }, 'params'),
    async (req, res, next) => {
        if (req.user.role === 'patient') {
            const Bill = require('../models/Bill');
            try {
                const bill = await Bill.findByIdWithItems(req.params.bill_id);
                if (!bill || bill.patient_id !== req.user.id) {
                    return res.status(403).json({
                        success: false,
                        error: "Access denied",
                        message: "You can only view payment history for your own bills."
                    });
                }
            } catch (error) {
                return next(error);
            }
        } else if (!['admin', 'receptionist'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: "Access denied",
                message: "You don't have permission to view payment history."
            });
        }
        next();
    },
    PaymentController.getBillPayments
);

/**
 * @route   GET /api/payments/methods
 * @desc    Get available payment methods
 * @access  Public
 */
router.get(
    '/methods',
    (req, res) => {
        res.json({
            success: true,
            data: {
                methods: [
                    {
                        id: 'mobile_money',
                        name: 'Mobile Money',
                        providers: [
                            { id: 'telebirr', name: 'TeleBirr', ussd: '*127#' },
                            { id: 'cbebirr', name: 'CBE Birr', ussd: '*847#' },
                            { id: 'hellocash', name: 'HelloCash', ussd: '*889#' },
                            { id: 'amole', name: 'Amole', ussd: '*999#' }
                        ]
                    },
                    {
                        id: 'bank_transfer',
                        name: 'Bank Transfer',
                        providers: [
                            { id: 'cbe', name: 'Commercial Bank of Ethiopia' },
                            { id: 'awash', name: 'Awash Bank' },
                            { id: 'dashen', name: 'Dashen Bank' }
                        ]
                    },
                    { id: 'cash', name: 'Cash Payment' },
                    { id: 'insurance', name: 'Insurance Claim' }
                ]
            }
        });
    }
);

module.exports = router;