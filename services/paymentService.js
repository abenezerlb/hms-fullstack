const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../database/db');

// Mock Ethiopian Payment Gateway (Replace with actual API when available)
class PaymentGateway {
    constructor() {
        this.baseURL = process.env.PAYMENT_BASE_URL || 'https://api.mock-payment.et';
        this.apiKey = process.env.PAYMENT_API_KEY;
        this.secret = process.env.PAYMENT_SECRET;
    }

    // Initialize payment
    async initiatePayment(paymentData) {
        try {
            const {
                billId,
                amount,
                patientId,
                patientName,
                patientPhone,
                description = 'Medical Bill Payment'
            } = paymentData;

            // Generate unique transaction ID
            const transactionId = `TXN-${Date.now()}-${uuidv4().slice(0, 8)}`;
            
            // In Ethiopia, common payment methods include:
            // 1. Telebirr (Ethio Telecom)
            // 2. CBE Birr (Commercial Bank of Ethiopia)
            // 3. HelloCash
            // 4. M-Birr
            // 5. Amole
            // 6. Bank Transfer
            // 7. Cash
            
            // For now, we'll simulate a successful response
            const mockResponse = {
                success: true,
                transactionId,
                paymentUrl: `${this.baseURL}/pay/${transactionId}`,
                qrCode: `data:image/png;base64,mock_qr_code_base64_here`,
                message: 'Payment initialized successfully. Please complete payment using the provided methods.',
                timestamp: new Date().toISOString()
            };

            // Save transaction to database
            await query(
                `INSERT INTO payments (bill_id, transaction_id, amount, status, payment_method) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [billId, transactionId, amount, 'pending', 'mobile_money']
            );

            return mockResponse;

        } catch (error) {
            console.error('Payment initiation error:', error);
            throw new Error('Failed to initiate payment');
        }
    }

    // Verify payment status
    async verifyPayment(transactionId) {
        try {
            // In real implementation, this would call the payment gateway API
            // For now, return mock verification
            const mockStatus = Math.random() > 0.3 ? 'completed' : 'pending';
            
            if (mockStatus === 'completed') {
                // Update payment and bill status in database
                await query(
                    `UPDATE payments SET status = 'completed', updated_at = CURRENT_TIMESTAMP 
                     WHERE transaction_id = $1 RETURNING bill_id`,
                    [transactionId]
                );

                const result = await query(
                    `UPDATE bills SET payment_status = 'paid', paid_date = CURRENT_TIMESTAMP 
                     WHERE id = (SELECT bill_id FROM payments WHERE transaction_id = $1)`,
                    [transactionId]
                );

                return {
                    success: true,
                    status: 'completed',
                    message: 'Payment verified successfully',
                    transactionId
                };
            }

            return {
                success: true,
                status: 'pending',
                message: 'Payment still pending',
                transactionId
            };

        } catch (error) {
            console.error('Payment verification error:', error);
            throw new Error('Failed to verify payment');
        }
    }

    // Process mobile money payment (common in Ethiopia)
    async processMobileMoney(paymentData) {
        const { phone, amount, provider = 'telebirr' } = paymentData;
        
        // Simulate different Ethiopian mobile money providers
        const providers = {
            'telebirr': { name: 'TeleBirr', code: '*127#' },
            'cbebirr': { name: 'CBE Birr', code: '*847#' },
            'hellocash': { name: 'HelloCash', code: '*889#' },
            'mbirr': { name: 'M-Birr', code: '*212#' }
        };

        const providerInfo = providers[provider] || providers.telebirr;
        
        return {
            success: true,
            message: `Please dial ${providerInfo.code} on your phone to complete payment of ${amount} ETB`,
            provider: providerInfo.name,
            amount,
            phone,
            transactionId: `MM-${Date.now()}`
        };
    }

    // Generate invoice PDF (simplified)
    async generateInvoice(billId) {
        try {
            const billResult = await query(
                `SELECT b.*, p.full_name, p.phone, p.address,
                        (SELECT json_agg(bi) FROM bill_items bi WHERE bi.bill_id = b.id) as items
                 FROM bills b
                 JOIN patients p ON b.patient_id = p.id
                 WHERE b.id = $1`,
                [billId]
            );

            if (billResult.rows.length === 0) {
                throw new Error('Bill not found');
            }

            const bill = billResult.rows[0];
            
            // Simple invoice object (in real app, generate PDF)
            const invoice = {
                invoiceNumber: bill.bill_number,
                date: bill.created_at,
                patient: {
                    name: bill.full_name,
                    phone: bill.phone,
                    address: bill.address
                },
                items: bill.items || [],
                subtotal: bill.amount,
                tax: bill.tax_amount,
                discount: bill.discount,
                total: bill.total_amount,
                paymentStatus: bill.payment_status,
                dueDate: bill.due_date
            };

            return invoice;

        } catch (error) {
            console.error('Invoice generation error:', error);
            throw new Error('Failed to generate invoice');
        }
    }
}

module.exports = new PaymentGateway();