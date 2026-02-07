const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/role-check');

/**
 * @route   GET /api/dashboard/overview
 * @desc    Get dashboard overview statistics
 * @access  Private (Admin only)
 */
router.get(
    '/overview',
    authenticateToken,
    requireRole(['admin']),
    DashboardController.getDashboardOverview
);

/**
 * @route   GET /api/dashboard/reports/:type
 * @desc    Generate various reports
 * @access  Private (Admin only)
 */
router.get(
    '/reports/:type',
    authenticateToken,
    requireRole(['admin']),
    DashboardController.generateReport
);

/**
 * @route   GET /api/dashboard/realtime
 * @desc    Get real-time statistics
 * @access  Private (Admin, Doctor, Receptionist)
 */
router.get(
    '/realtime',
    authenticateToken,
    requireRole(['admin', 'doctor', 'receptionist']),
    DashboardController.getRealtimeStats
);

/**
 * @route   GET /api/dashboard/doctor/:doctor_id
 * @desc    Get doctor-specific dashboard
 * @access  Private (Admin, Doctor can see own)
 */
router.get(
    '/doctor/:doctor_id',
    authenticateToken,
    async (req, res, next) => {
        if (req.user.role === 'doctor' && req.params.doctor_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: "Access denied",
                message: "You can only view your own dashboard."
            });
        }
        next();
    },
    async (req, res) => {
        try {
            const db = require('../config/database');
            const { doctor_id } = req.params;
            
            // Get doctor's today appointments
            const today = new Date().toISOString().split('T')[0];
            const appointments = await db.query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
                FROM appointments 
                WHERE doctor_id = $1 
                AND DATE(appointment_date) = $2
            `, [doctor_id, today]);
            
            // Get doctor's recent patients
            const recentPatients = await db.query(`
                SELECT DISTINCT p.*
                FROM patients p
                JOIN appointments a ON p.id = a.patient_id
                WHERE a.doctor_id = $1
                ORDER BY a.appointment_date DESC
                LIMIT 5
            `, [doctor_id]);
            
            // Get doctor's revenue
            const revenue = await db.query(`
                SELECT 
                    COALESCE(SUM(b.total_amount), 0) as total_revenue,
                    COUNT(b.id) as bill_count
                FROM bills b
                JOIN appointments a ON b.appointment_id = a.id
                WHERE a.doctor_id = $1
                AND b.payment_status = 'paid'
                AND DATE(b.created_at) = $2
            `, [doctor_id, today]);
            
            res.json({
                success: true,
                data: {
                    today_appointments: appointments.rows[0],
                    recent_patients: recentPatients.rows,
                    today_revenue: revenue.rows[0]
                }
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

/**
 * @route   GET /api/dashboard/reception
 * @desc    Get receptionist-specific dashboard
 * @access  Private (Admin, Receptionist)
 */
router.get(
    '/reception',
    authenticateToken,
    requireRole(['admin', 'receptionist']),
    async (req, res) => {
        try {
            const db = require('../config/database');
            const today = new Date().toISOString().split('T')[0];
            
            // Get today's check-ins
            const checkins = await db.query(`
                SELECT COUNT(*) as today_checkins
                FROM appointments 
                WHERE DATE(appointment_date) = $1
                AND status = 'checked-in'
            `, [today]);
            
            // Get pending registrations
            const pendingRegistrations = await db.query(`
                SELECT COUNT(*) as pending_registrations
                FROM patients 
                WHERE DATE(created_at) = $1
                AND emergency_contact IS NULL
            `, [today]);
            
            // Get today's payments
            const payments = await db.query(`
                SELECT 
                    COUNT(*) as payment_count,
                    COALESCE(SUM(total_amount), 0) as total_collected
                FROM bills 
                WHERE DATE(created_at) = $1
                AND payment_status = 'paid'
            `, [today]);
            
            res.json({
                success: true,
                data: {
                    today_checkins: parseInt(checkins.rows[0].today_checkins),
                    pending_registrations: parseInt(pendingRegistrations.rows[0].pending_registrations),
                    payments: {
                        count: parseInt(payments.rows[0].payment_count),
                        collected: parseFloat(payments.rows[0].total_collected)
                    }
                }
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