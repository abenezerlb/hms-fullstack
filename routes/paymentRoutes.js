const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const { query } = require('../database/db');

// Input validation middleware
const validatePaymentInitiation = (req, res, next) => {
    const { billId, paymentMethod, phone } = req.body;
    
    if (!billId) {
        return res.status(400).json({ error: 'Bill ID is required' });
    }
    
    if (!paymentMethod || !['mobile_money', 'bank_transfer', 'cash'].includes(paymentMethod)) {
        return res.status(400).json({ error: 'Valid payment method is required' });
    }
    
    if (paymentMethod === 'mobile_money' && !phone) {
        return res.status(400).json({ error: 'Phone number is required for mobile money' });
    }
    
    next();
};

// Initialize payment
router.post('/initiate', validatePaymentInitiation, async (req, res) => {
    try {
        const { billId, paymentMethod, phone, provider = 'telebirr' } = req.body;
        
        // Fetch bill
        const billResult = await query('SELECT * FROM bills WHERE id = $1', [billId]);
        if (billResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        const bill = billResult.rows[0];
        
        if (bill.payment_status === 'paid') {
            return res.status(400).json({ error: 'Bill already paid' });
        }

        // Get patient
        const patientResult = await query(
            'SELECT full_name, phone FROM patients WHERE id = $1',
            [bill.patient_id]
        );
        
        const patient = patientResult.rows[0];
        const patientPhone = phone || patient.phone;

        // Prepare payment data
        const paymentData = {
            billId,
            amount: bill.total_amount || bill.amount,
            patientPhone,
            paymentMethod,
            provider
        };

        // Process payment based on method
        let paymentResponse;
        if (paymentMethod === 'mobile_money') {
            paymentResponse = await paymentService.processMobileMoney({
                phone: patientPhone,
                amount: bill.total_amount || bill.amount,
                provider
            });
            
            // Also save in payments table
            await query(
                `INSERT INTO payments (bill_id, transaction_id, amount, payment_method, payment_gateway, status)
                 VALUES ($1, $2, $3, $4, $5, 'pending')`,
                [billId, paymentResponse.transactionId, bill.total_amount || bill.amount, 
                 'mobile_money', provider]
            );
        } else {
            paymentResponse = await paymentService.initiatePayment(paymentData);
        }

        res.json({
            success: true,
            message: 'Payment initiated successfully',
            data: paymentResponse
        });

    } catch (error) {
        console.error('Payment error:', error.message);
        res.status(500).json({ 
            error: 'Failed to initiate payment',
            details: error.message 
        });
    }
});

// Verify payment
router.get('/verify/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        if (!transactionId) {
            return res.status(400).json({ error: 'Transaction ID is required' });
        }
        
        const verification = await paymentService.verifyPayment(transactionId);
        res.json({
            success: true,
            data: verification
        });

    } catch (error) {
        console.error('Verification error:', error.message);
        res.status(500).json({ 
            error: 'Failed to verify payment',
            details: error.message 
        });
    }
});

// Get invoice
router.get('/invoice/:billId', async (req, res) => {
    try {
        const { billId } = req.params;
        
        if (!billId) {
            return res.status(400).json({ error: 'Bill ID is required' });
        }
        
        const invoice = await paymentService.generateInvoice(billId);
        res.json({
            success: true,
            data: invoice
        });

    } catch (error) {
        console.error('Invoice error:', error.message);
        res.status(500).json({ 
            error: 'Failed to generate invoice',
            details: error.message 
        });
    }
});

// Payment simulation endpoint (for testing)
router.post('/simulate', async (req, res) => {
    try {
        const { transactionId, status = 'completed' } = req.body;
        
        if (!transactionId) {
            return res.status(400).json({ error: 'Transaction ID is required' });
        }
        
        // Simulate payment completion
        await query(
            `UPDATE payments SET status = $1 WHERE transaction_id = $2`,
            [status, transactionId]
        );
        
        if (status === 'completed') {
            await query(`
                UPDATE bills SET payment_status = 'paid', paid_date = CURRENT_TIMESTAMP 
                WHERE id = (SELECT bill_id FROM payments WHERE transaction_id = $1)
            `, [transactionId]);
        }
        
        res.json({
            success: true,
            message: `Payment simulated as ${status}`,
            transactionId
        });
        
    } catch (error) {
        console.error('Simulation error:', error);
        res.status(500).json({ error: 'Simulation failed' });
    }
});

// Get payment summary
router.get('/summary', async (req, res) => {
    try {
        const summary = await query(`
            SELECT 
                COUNT(*) as total_payments,
                SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_received,
                SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as total_pending,
                COUNT(CASE WHEN payment_method = 'mobile_money' THEN 1 END) as mobile_money_count,
                COUNT(CASE WHEN payment_method = 'bank_transfer' THEN 1 END) as bank_transfer_count,
                COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) as cash_count
            FROM payments
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        `);
        
        res.json({
            success: true,
            data: summary.rows[0]
        });
        
    } catch (error) {
        console.error('Summary error:', error);
        res.status(500).json({ error: 'Failed to get summary' });
    }
});

module.exports = router;