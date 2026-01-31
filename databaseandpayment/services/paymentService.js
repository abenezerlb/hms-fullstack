const { v4: uuidv4 } = require('uuid');
const { query } = require('../database/db');

class EthiopianPaymentGateway {
    constructor() {
        this.providers = {
            'telebirr': { name: 'TeleBirr', code: '*127#', shortCode: '*127*1*' },
            'cbebirr': { name: 'CBE Birr', code: '*847#', shortCode: '*847*1*' },
            'hellocash': { name: 'HelloCash', code: '*889#', shortCode: '*889*1*' },
            'amole': { name: 'Amole', code: '*889#', shortCode: '*889*1*' }
        };
    }

    // Validate Ethiopian phone number
    isValidEthiopianPhone(phone) {
        return /^(?:\+251|0)(9\d{8})$/.test(phone);
    }

    // Generate Ethiopian-style transaction ID
    generateTransactionId() {
        const date = new Date();
        const year = date.getFullYear().toString().slice(2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `ET${year}${month}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    }

    // Main payment initiation
    async initiatePayment(paymentData) {
        try {
            const { billId, amount, patientPhone, paymentMethod = 'mobile_money', provider = 'telebirr' } = paymentData;

            // Validate phone
            if (!this.isValidEthiopianPhone(patientPhone)) {
                throw new Error('Invalid Ethiopian phone number. Use format: +2519XXXXXXXX or 09XXXXXXXX');
            }

            const transactionId = this.generateTransactionId();
            const selectedProvider = this.providers[provider] || this.providers.telebirr;
            
            // Generate USSD string
            const ussdString = this.generateUSSDString(selectedProvider.shortCode, amount, patientPhone);
            
            // Save to database
            await query(
                `INSERT INTO payments (bill_id, transaction_id, amount, payment_method, payment_gateway, status)
                 VALUES ($1, $2, $3, $4, $5, 'pending')`,
                [billId, transactionId, amount, paymentMethod, selectedProvider.name]
            );

            return {
                success: true,
                transactionId,
                messageAmharic: `የ${selectedProvider.name} በመጠቀም ክፍያ ያድርጉ`,
                messageEnglish: `Please complete payment using ${selectedProvider.name}`,
                provider: selectedProvider.name,
                amount: amount + ' ETB',
                ussdString,
                paymentMethod,
                validUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
                checkStatusUrl: `/api/payments/verify/${transactionId}`
            };

        } catch (error) {
            console.error('Payment error:', error);
            throw error;
        }
    }

    // Generate USSD string
    generateUSSDString(shortCode, amount, phone) {
        const cleanPhone = phone.replace('+251', '0').replace(/\D/g, '');
        return `${shortCode}${Math.round(amount)}*${cleanPhone}#`;
    }

    // Verify payment with better simulation
    async verifyPayment(transactionId) {
        try {
            // Get payment from DB
            const payment = await query(
                'SELECT * FROM payments WHERE transaction_id = $1',
                [transactionId]
            );

            if (payment.rows.length === 0) {
                throw new Error('Transaction not found');
            }

            const currentPayment = payment.rows[0];
            let newStatus = currentPayment.status;

            // Simulate status change (80% success rate for pending payments)
            if (currentPayment.status === 'pending') {
                const random = Math.random();
                newStatus = random < 0.8 ? 'completed' : 
                           random < 0.9 ? 'pending' : 'failed';
                
                // Update status if changed
                if (newStatus !== currentPayment.status) {
                    await query(
                        'UPDATE payments SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE transaction_id = $2',
                        [newStatus, transactionId]
                    );

                    // Update bill if completed
                    if (newStatus === 'completed') {
                        await query(
                            `UPDATE bills SET payment_status = 'paid', paid_date = CURRENT_TIMESTAMP 
                             WHERE id = $1`,
                            [currentPayment.bill_id]
                        );
                    }
                }
            }

            // Status in Amharic
            const statusAmharic = {
                'pending': 'በጥበቃ ላይ',
                'completed': 'ተጠናቅቋል',
                'failed': 'አልተሳካም'
            }[newStatus] || newStatus;

            return {
                success: true,
                transactionId,
                status: newStatus,
                statusAmharic,
                amount: currentPayment.amount,
                currency: 'ETB',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Verification error:', error);
            throw error;
        }
    }

    // Enhanced invoice generation
    async generateInvoice(billId) {
        try {
            const billResult = await query(`
                SELECT b.*, p.full_name, p.phone, p.address,
                       (SELECT json_agg(json_build_object(
                           'service', bi.service_name,
                           'quantity', bi.quantity,
                           'unitPrice', bi.unit_price,
                           'subtotal', bi.subtotal
                       )) FROM bill_items bi WHERE bi.bill_id = b.id) as items
                FROM bills b
                JOIN patients p ON b.patient_id = p.id
                WHERE b.id = $1
            `, [billId]);

            if (billResult.rows.length === 0) {
                throw new Error('Bill not found');
            }

            const bill = billResult.rows[0];
            
            // Ethiopian-style invoice
            return {
                hospital: {
                    name: 'Healthcare Management System',
                    address: 'Addis Ababa, Ethiopia',
                    phone: '+251 11 123 4567'
                },
                invoiceNumber: bill.bill_number,
                date: new Date(bill.created_at).toLocaleDateString('en-ET'),
                patient: {
                    name: bill.full_name,
                    phone: bill.phone,
                    address: bill.address
                },
                items: bill.items || [],
                subtotal: parseFloat(bill.amount),
                tax: parseFloat(bill.tax_amount || 0),
                discount: parseFloat(bill.discount || 0),
                total: parseFloat(bill.total_amount),
                paymentStatus: bill.payment_status,
                currency: 'ETB',
                currencySymbol: 'Br'
            };

        } catch (error) {
            console.error('Invoice error:', error);
            throw error;
        }
    }

    // Process mobile money (simpler version)
    async processMobileMoney(paymentData) {
        const { phone, amount, provider = 'telebirr' } = paymentData;
        
        if (!this.isValidEthiopianPhone(phone)) {
            throw new Error('Invalid Ethiopian phone number');
        }

        const selectedProvider = this.providers[provider] || this.providers.telebirr;
        const ussdString = this.generateUSSDString(selectedProvider.shortCode, amount, phone);

        return {
            success: true,
            message: `Dial ${ussdString} to pay ${amount} ETB`,
            provider: selectedProvider.name,
            amount: amount + ' ETB',
            phone,
            ussdString,
            transactionId: this.generateTransactionId()
        };
    }
}

module.exports = new EthiopianPaymentGateway();