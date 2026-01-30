const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const { query } = require('../database/db');

// Initialize payment
router.post('/initiate', async (req, res) => {
    try {
        const { billId, paymentMethod, phone } = req.body;
        
        // Fetch bill details
        const billResult = await query(
            'SELECT * FROM bills WHERE id = $1',
            [billId]
        );

        if (billResult.rows.length === 0) {
            return res.status(404).json({ error: 'Bill not found' });
        }

        const bill = billResult.rows[0];
        
        // Check if bill is already paid
        if (bill.payment_status === 'paid') {
            return res.status(400).json({ error: 'Bill already paid' });
        }

        // Get patient info
        const patientResult = await query(
            'SELECT full_name, phone FROM patients WHERE id = $1',
            [bill.patient_id]
        );

        const patient = patientResult.rows[0];

        // Initiate payment
        const paymentData = {
            billId,
            amount: bill.total_amount,
            patientId: bill.patient_id,
            patientName: patient.full_name,
            patientPhone: phone || patient.phone,
            paymentMethod
        };

        let paymentResponse;
        
        if (paymentMethod === 'mobile_money') {
            paymentResponse = await paymentService.processMobileMoney({
                phone: phone || patient.phone,
                amount: bill.total_amount,
                provider: 'telebirr'
            });
        } else {
            paymentResponse = await paymentService.initiatePayment(paymentData);
        }

        res.json({
            success: true,
            message: 'Payment initiated successfully',
            data: paymentResponse
        });

    } catch (error) {
        console.error('Payment initiation error:', error);
        res.status(500).json({ error: 'Failed to initiate payment' });
    }
});

// Verify payment
router.get('/verify/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        const verification = await paymentService.verifyPayment(transactionId);
        
        res.json({
            success: true,
            data: verification
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ error: 'Failed to verify payment' });
    }
});

// Get invoice
router.get('/invoice/:billId', async (req, res) => {
    try {
        const { billId } = req.params;
        
        const invoice = await paymentService.generateInvoice(billId);
        
        res.json({
            success: true,
            data: invoice
        });

    } catch (error) {
        console.error('Invoice generation error:', error);
        res.status(500).json({ error: 'Failed to generate invoice' });
    }
});

// Payment callback (for payment gateway webhook)
router.post('/callback', async (req, res) => {
    try {
        const { transactionId, status, amount, reference } = req.body;
        
        // Verify the callback is legitimate (check signature in production)
        
        if (status === 'success') {
            // Update payment status
            await query(
                `UPDATE payments SET status = 'completed', gateway_reference = $1 
                 WHERE transaction_id = $2`,
                [reference, transactionId]
            );

            // Update bill status
            await query(
                `UPDATE bills SET payment_status = 'paid', paid_date = CURRENT_TIMESTAMP 
                 WHERE id = (SELECT bill_id FROM payments WHERE transaction_id = $1)`,
                [transactionId]
            );

            console.log(`Payment ${transactionId} completed successfully`);
        }

        // Send response to payment gateway
        res.json({ received: true });

    } catch (error) {
        console.error('Callback error:', error);
        res.status(500).json({ error: 'Callback processing failed' });
    }
});

module.exports = router;