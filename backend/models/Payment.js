const db = require('../config/database');

class Payment {
  /**
   * Create a new payment record
   */
  static async create(paymentData) {
    const {
      bill_id, amount, payment_method,
      payment_gateway = null, gateway_reference = null,
      metadata = null
    } = paymentData;
    
    // Generate transaction ID for Ethiopian payment gateways
    const transactionId = this.generateTransactionId(payment_gateway);
    
    try {
      const result = await db.query(
        `INSERT INTO payments (
          bill_id, transaction_id, amount,
          payment_method, payment_gateway,
          gateway_reference, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          bill_id, transactionId, amount,
          payment_method, payment_gateway,
          gateway_reference, metadata
        ]
      );
      
      return result.rows[0];
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid bill ID');
      }
      throw error;
    }
  }
  
  /**
   * Generate transaction ID for Ethiopian payment gateways
   */
  static generateTransactionId(gateway) {
    const date = new Date();
    const timestamp = date.getTime().toString().substr(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    const prefix = {
      'telebirr': 'TBR',
      'cbebirr': 'CBE',
      'hellocash': 'HLC',
      'amole': 'AML'
    }[gateway] || 'ET';
    
    return `${prefix}${date.getFullYear().toString().substr(-2)}${timestamp}${random}`;
  }
  
  /**
   * Find payment by transaction ID
   */
  static async findByTransactionId(transactionId) {
    try {
      const result = await db.query(
        `SELECT 
          p.*,
          b.bill_number,
          b.patient_id,
          pt.full_name as patient_name,
          pt.phone as patient_phone
         FROM payments p
         JOIN bills b ON p.bill_id = b.id
         JOIN patients pt ON b.patient_id = pt.id
         WHERE p.transaction_id = $1`,
        [transactionId]
      );
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Find payments by bill ID
   */
  static async findByBillId(billId) {
    try {
      const result = await db.query(
        `SELECT * FROM payments WHERE bill_id = $1 ORDER BY created_at DESC`,
        [billId]
      );
      
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Update payment status
   */
  static async updateStatus(transactionId, status, gatewayResponse = null) {
    const allowedStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded'];
    
    if (!allowedStatuses.includes(status)) {
      throw new Error('Invalid payment status');
    }
    
    const updates = ['status = $1'];
    const values = [status];
    let paramCount = 2;
    
    if (gatewayResponse) {
      updates.push(`metadata = COALESCE(metadata, '{}'::jsonb) || $${paramCount}::jsonb`);
      values.push(JSON.stringify({ gateway_response: gatewayResponse }));
      paramCount++;
    }
    
    if (status === 'completed') {
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
    }
    
    values.push(transactionId);
    
    try {
      const result = await db.query(
        `UPDATE payments 
         SET ${updates.join(', ')}
         WHERE transaction_id = $${paramCount}
         RETURNING *`,
        values
      );
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Simulate payment for Ethiopian gateways (for demo/development)
   */
  static async simulatePayment(transactionId, status) {
    try {
      // Get payment details
      const payment = await this.findByTransactionId(transactionId);
      if (!payment) {
        throw new Error('Payment not found');
      }
      
      // Simulate different gateway responses
      const gatewayResponses = {
        'telebirr': {
          success: {
            status_amharic: 'ተጠናቅቋል',
            receipt_number: `REC-${transactionId}`,
            message: 'Payment successful via TeleBirr'
          },
          failed: {
            status_amharic: 'ይቅርታ ክፍያው አልተከናወነም',
            receipt_number: null,
            message: 'Payment failed. Please try again.'
          }
        },
        'cbebirr': {
          success: {
            status_amharic: 'የተጠናቀቀ',
            receipt_number: `CBE-${transactionId}`,
            message: 'Payment processed by CBE Birr'
          },
          failed: {
            status_amharic: 'አልተሳካም',
            receipt_number: null,
            message: 'Transaction declined by bank'
          }
        }
      };
      
      const gateway = payment.payment_gateway || 'telebirr';
      const response = gatewayResponses[gateway]?.[status === 'completed' ? 'success' : 'failed'] || {
        status_amharic: status === 'completed' ? 'ተጠናቅቋል' : 'አልተሳካም',
        receipt_number: status === 'completed' ? `REC-${transactionId}` : null,
        message: status === 'completed' ? 'Payment completed' : 'Payment failed'
      };
      
      // Update payment status
      const updatedPayment = await this.updateStatus(transactionId, status, response);
      
      // If payment completed, update bill status too
      if (status === 'completed') {
        const Bill = require('./Bill');
        await Bill.updatePaymentStatus(
          payment.bill_id, 
          'paid', 
          payment.payment_method,
          new Date().toISOString()
        );
      }
      
      return {
        ...updatedPayment,
        gateway_response: response
      };
      
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get payment statistics
   */
  static async getStatistics(dateFrom = null, dateTo = null) {
    let whereClause = '';
    const params = [];
    
    if (dateFrom && dateTo) {
      whereClause = 'WHERE DATE(created_at) BETWEEN $1 AND $2';
      params.push(dateFrom, dateTo);
    }
    
    try {
      const result = await db.query(
        `SELECT 
          COUNT(*) as total_payments,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_received,
          SUM(CASE WHEN status IN ('pending', 'processing') THEN amount ELSE 0 END) as total_pending,
          SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as total_failed,
          SUM(CASE WHEN payment_method = 'mobile_money' THEN 1 ELSE 0 END) as mobile_money_count,
          SUM(CASE WHEN payment_method = 'bank_transfer' THEN 1 ELSE 0 END) as bank_transfer_count,
          SUM(CASE WHEN payment_method = 'cash' THEN 1 ELSE 0 END) as cash_count,
          payment_gateway,
          DATE(created_at) as date
         FROM payments 
         ${whereClause}
         GROUP BY payment_gateway, DATE(created_at)
         ORDER BY date DESC`,
        params
      );
      
      // Also get daily summary
      const dailyResult = await db.query(
        `SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          SUM(amount) as amount,
          ARRAY_AGG(DISTINCT payment_method) as methods
         FROM payments 
         ${whereClause}
         GROUP BY DATE(created_at)
         ORDER BY date DESC
         LIMIT 7`,
        params
      );
      
      return {
        summary: result.rows,
        daily_stats: dailyResult.rows
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Verify payment status with gateway (mock implementation for demo)
   */
  static async verifyPayment(transactionId) {
    try {
      const payment = await this.findByTransactionId(transactionId);
      if (!payment) {
        throw new Error('Payment not found');
      }
      
      // Mock verification logic
      const isVerified = payment.status === 'completed';
      const verificationTime = new Date().toISOString();
      
      return {
        transaction_id: transactionId,
        status: payment.status,
        verified_at: verificationTime,
        amount: payment.amount,
        currency: payment.currency || 'ETB',
        is_verified: isVerified,
        next_steps: isVerified 
          ? 'Payment received. Your receipt has been generated.' 
          : 'Payment verification pending.'
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Payment;