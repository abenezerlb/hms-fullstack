const Payment = require('../models/Payment');
const Bill = require('../models/Bill');

class PaymentController {
  
  /**
   * Initiate a payment
   * POST /api/payments/initiate
   */
  static async initiatePayment(req, res) {
    try {
      const { 
        bill_id, 
        payment_method, 
        provider = 'telebirr', 
        phone 
      } = req.body;
      
      // Validate required fields
      if (!bill_id || !payment_method) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          message: "Bill ID and payment method are required."
        });
      }
      
      // For mobile money, phone is required
      if (payment_method === 'mobile_money' && !phone) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          message: "Phone number is required for mobile money payments."
        });
      }
      
      // Get bill details
      const bill = await Bill.findByIdWithItems(bill_id);
      if (!bill) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Bill with ID '${bill_id}' not found.`
        });
      }
      
      // Check if bill is already paid
      if (bill.payment_status === 'paid') {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "This bill has already been paid."
        });
      }
      
      // Create payment record
      const paymentData = {
        bill_id,
        amount: bill.total_amount,
        payment_method,
        payment_gateway: provider,
        metadata: {
          phone: phone || null,
          bill_number: bill.bill_number,
          patient_name: bill.patient_name
        }
      };
      
      const payment = await Payment.create(paymentData);
      
      // Generate mock payment instructions based on provider
      const paymentInstructions = this.generatePaymentInstructions(
        payment.transaction_id, 
        bill.total_amount, 
        provider, 
        phone
      );
      
      return res.json({
        success: true,
        message: "Payment initiated successfully",
        data: {
          transaction_id: payment.transaction_id,
          ...paymentInstructions,
          check_status_url: `/api/payments/verify/${payment.transaction_id}`
        }
      });
      
    } catch (error) {
      console.error('Initiate Payment Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to initiate payment. Please try again later."
      });
    }
  }
  
  /**
   * Generate payment instructions for Ethiopian payment gateways
   */
  static generatePaymentInstructions(transactionId, amount, provider, phone) {
    const providers = {
      telebirr: {
        name: "TeleBirr",
        message_english: "Please complete payment using TeleBirr",
        message_amharic: "የቴሌብር በመጠቀም ክፍያ ያድርጉ",
        ussd_string: phone ? `*127*1*${Math.round(amount)}*${phone.replace('+251', '')}#` : null
      },
      cbebirr: {
        name: "CBE Birr",
        message_english: "Please complete payment using CBE Birr",
        message_amharic: "የሲቢኢ ብር በመጠቀም ክፍያ ያድርጉ",
        ussd_string: phone ? `*847*1*${Math.round(amount)}*${phone.replace('+251', '')}#` : null
      },
      hellocash: {
        name: "HelloCash",
        message_english: "Please complete payment using HelloCash",
        message_amharic: "የሄሎካሽ በመጠቀም ክፍያ ያድርጉ",
        ussd_string: phone ? `*889*1*${Math.round(amount)}*${phone.replace('+251', '')}#` : null
      },
      amole: {
        name: "Amole",
        message_english: "Please complete payment using Amole",
        message_amharic: "የአሞሌ በመጠቀም ክፍያ ያድርጉ",
        ussd_string: phone ? `*999*1*${Math.round(amount)}*${phone.replace('+251', '')}#` : null
      }
    };
    
    const providerInfo = providers[provider] || providers.telebirr;
    
    return {
      message_amharic: providerInfo.message_amharic,
      message_english: providerInfo.message_english,
      provider: providerInfo.name,
      amount: `${amount} ETB`,
      ussd_string: providerInfo.ussd_string,
      payment_method: "mobile_money",
      valid_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      qr_code_url: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`PAY:${transactionId}:${amount}:${provider}`)}`
    };
  }
  
  /**
   * Verify payment status
   * GET /api/payments/verify/:transaction_id
   */
  static async verifyPayment(req, res) {
    try {
      const { transaction_id } = req.params;
      
      const verification = await Payment.verifyPayment(transaction_id);
      
      return res.json({
        success: true,
        data: verification
      });
      
    } catch (error) {
      console.error('Verify Payment Error:', error);
      
      if (error.message === 'Payment not found') {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Payment with transaction ID '${transaction_id}' not found.`
        });
      }
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to verify payment. Please try again later."
      });
    }
  }
  
  /**
   * Simulate payment completion (for testing/demo)
   * POST /api/payments/simulate
   */
  static async simulatePayment(req, res) {
    try {
      const { transaction_id, status = 'completed' } = req.body;
      
      if (!transaction_id) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          message: "Transaction ID is required."
        });
      }
      
      const simulatedPayment = await Payment.simulatePayment(transaction_id, status);
      
      return res.json({
        success: true,
        message: `Payment ${status} simulated successfully`,
        data: simulatedPayment
      });
      
    } catch (error) {
      console.error('Simulate Payment Error:', error);
      
      if (error.message === 'Payment not found') {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Payment with transaction ID '${req.body.transaction_id}' not found.`
        });
      }
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to simulate payment. Please try again later."
      });
    }
  }
  
  /**
   * Get payment statistics
   * GET /api/payments/summary
   */
  static async getPaymentSummary(req, res) {
    try {
      const { date_from, date_to } = req.query;
      
      const statistics = await Payment.getStatistics(date_from, date_to);
      
      // Format response
      const summary = {
        summary: {
          total_payments: statistics.summary.reduce((sum, item) => sum + parseInt(item.total_payments), 0),
          total_received: statistics.summary.reduce((sum, item) => sum + parseFloat(item.total_received), 0),
          total_pending: statistics.summary.reduce((sum, item) => sum + parseFloat(item.total_pending), 0),
          total_failed: statistics.summary.reduce((sum, item) => sum + parseFloat(item.total_failed), 0),
          mobile_money_count: statistics.summary.reduce((sum, item) => sum + parseInt(item.mobile_money_count), 0),
          bank_transfer_count: statistics.summary.reduce((sum, item) => sum + parseInt(item.bank_transfer_count), 0),
          cash_count: statistics.summary.reduce((sum, item) => sum + parseInt(item.cash_count), 0)
        },
        daily_stats: statistics.daily_stats,
        currency: "ETB"
      };
      
      return res.json({
        success: true,
        data: summary
      });
      
    } catch (error) {
      console.error('Get Payment Summary Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch payment summary. Please try again later."
      });
    }
  }
  
  /**
   * Get invoice for a bill
   * GET /api/payments/invoice/:bill_id
   */
  static async getInvoice(req, res) {
    try {
      const { bill_id } = req.params;
      
      // Delegate to BillController's generateInvoice
      const BillController = require('./billController');
      
      // Create mock request/response objects
      const mockReq = {
        params: { id: bill_id },
        query: { format: 'json' }
      };
      
      const mockRes = {
        json: (data) => {
          return res.json(data);
        },
        status: (code) => {
          return {
            json: (data) => res.status(code).json(data)
          };
        }
      };
      
      await BillController.generateInvoice(mockReq, mockRes);
      
    } catch (error) {
      console.error('Get Invoice Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to generate invoice. Please try again later."
      });
    }
  }
  
  /**
   * Get payment history for a bill
   * GET /api/payments/bill/:bill_id
   */
  static async getBillPayments(req, res) {
    try {
      const { bill_id } = req.params;
      
      // Verify bill exists
      const bill = await Bill.findByIdWithItems(bill_id);
      if (!bill) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Bill with ID '${bill_id}' not found.`
        });
      }
      
      const payments = await Payment.findByBillId(bill_id);
      
      return res.json({
        success: true,
        data: {
          bill: {
            id: bill.id,
            bill_number: bill.bill_number,
            total_amount: bill.total_amount,
            payment_status: bill.payment_status
          },
          payments: payments
        }
      });
      
    } catch (error) {
      console.error('Get Bill Payments Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch payment history. Please try again later."
      });
    }
  }
}

module.exports = PaymentController;