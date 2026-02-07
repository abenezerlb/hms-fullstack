const Bill = require('../models/Bill');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');

class BillController {
  
  /**
   * Create a new bill
   * POST /api/bills
   */
  static async createBill(req, res) {
    try {
      const billData = req.body;
      
      // Verify patient exists
      const patient = await Patient.findById(billData.patient_id);
      if (!patient) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Patient with ID '${billData.patient_id}' not found.`
        });
      }
      
      // Verify appointment exists if provided
      if (billData.appointment_id) {
        const appointment = await Appointment.findById(billData.appointment_id);
        if (!appointment) {
          return res.status(404).json({
            success: false,
            error: "Not found",
            message: `Appointment with ID '${billData.appointment_id}' not found.`
          });
        }
      }
      
      // Validate bill items
      if (!billData.items || !Array.isArray(billData.items) || billData.items.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "Bill must contain at least one item."
        });
      }
      
      // Fetch service details if service_id is provided
      for (const item of billData.items) {
        if (item.service_id) {
          const service = await Service.findById(item.service_id);
          if (!service) {
            return res.status(404).json({
              success: false,
              error: "Not found",
              message: `Service with ID '${item.service_id}' not found.`
            });
          }
          // Use service price if not provided
          if (!item.unit_price) {
            item.unit_price = service.price;
          }
          if (!item.service_name) {
            item.service_name = service.service_name;
          }
        }
      }
      
      // Create bill
      const bill = await Bill.create(billData);
      
      return res.status(201).json({
        success: true,
        message: "Bill created successfully",
        data: bill
      });
      
    } catch (error) {
      console.error('Create Bill Error:', error);
      
      if (error.message === 'Invalid patient or appointment ID') {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "Invalid patient or appointment ID."
        });
      }
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to create bill. Please try again later."
      });
    }
  }
  
  /**
   * Get all bills with filters
   * GET /api/bills
   */
  static async getAllBills(req, res) {
    try {
      const { 
        patient_id, 
        payment_status, 
        date_from, 
        date_to,
        page = 1, 
        limit = 20 
      } = req.query;
      
      const filters = {};
      if (patient_id) filters.patient_id = patient_id;
      if (payment_status) filters.payment_status = payment_status;
      if (date_from) filters.date_from = date_from;
      if (date_to) filters.date_to = date_to;
      
      const result = await Bill.findAll(filters, page, limit);
      
      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
      
    } catch (error) {
      console.error('Get All Bills Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch bills. Please try again later."
      });
    }
  }
  
  /**
   * Get bill by ID with items
   * GET /api/bills/:id
   */
  static async getBillById(req, res) {
    try {
      const { id } = req.params;
      
      const bill = await Bill.findByIdWithItems(id);
      
      if (!bill) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Bill with ID '${id}' not found.`
        });
      }
      
      return res.json({
        success: true,
        data: bill
      });
      
    } catch (error) {
      console.error('Get Bill Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch bill. Please try again later."
      });
    }
  }
  
  /**
   * Update bill payment status
   * PUT /api/bills/:id/status
   */
  static async updateBillStatus(req, res) {
    try {
      const { id } = req.params;
      const { payment_status, payment_method, paid_date } = req.body;
      
      if (!payment_status) {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "Payment status is required."
        });
      }
      
      const updatedBill = await Bill.updatePaymentStatus(id, payment_status, payment_method, paid_date);
      
      if (!updatedBill) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Bill with ID '${id}' not found.`
        });
      }
      
      return res.json({
        success: true,
        message: "Bill status updated successfully",
        data: updatedBill
      });
      
    } catch (error) {
      console.error('Update Bill Status Error:', error);
      
      if (error.message === 'Invalid payment status') {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "Invalid payment status."
        });
      }
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to update bill status. Please try again later."
      });
    }
  }
  
  /**
   * Get payment summary statistics
   * GET /api/bills/summary
   */
  static async getPaymentSummary(req, res) {
    try {
      const summary = await Bill.getPaymentSummary();
      
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
   * Generate invoice/download
   * GET /api/bills/:id/invoice
   */
  static async generateInvoice(req, res) {
    try {
      const { id } = req.params;
      const { format = 'json' } = req.query; // json, pdf, html
      
      const bill = await Bill.findByIdWithItems(id);
      
      if (!bill) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Bill with ID '${id}' not found.`
        });
      }
      
      // Mock hospital info (in real app, this would come from config)
      const hospitalInfo = {
        name: "የጤና አገልግሎት ማኔጅመንት ስርዓት",
        name_english: "Healthcare Management System",
        address: "Addis Ababa, Ethiopia",
        phone: "+251 11 123 4567",
        tin: "0000000000"
      };
      
      // Format dates
      const date = new Date(bill.created_at);
      const ethiopianDate = `${date.getDate()} መጋቢት ${date.getFullYear() - 8}`; // Simplified Ethiopian date
      
      // Convert total to words (simplified)
      const totalInWords = this.numberToEthiopianWords(bill.total_amount);
      
      const invoice = {
        hospital: hospitalInfo,
        invoice_number: bill.bill_number,
        date: ethiopianDate,
        date_english: bill.created_at.toISOString().split('T')[0],
        patient: {
          name: bill.patient_name,
          phone: bill.patient_phone,
          address: bill.patient_address
        },
        items: bill.items,
        summary: {
          subtotal: bill.amount,
          tax: bill.tax_amount,
          discount: bill.discount,
          total: bill.total_amount,
          total_in_words: totalInWords
        },
        payment_status: bill.payment_status,
        currency: "ETB",
        currency_symbol: "Br"
      };
      
      // Return in requested format
      if (format === 'pdf') {
        // In real app, generate PDF using library like pdfkit
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${bill.bill_number}.pdf"`);
        // For now, return JSON with message
        return res.json({
          success: true,
          message: "PDF generation would happen here in production",
          data: invoice
        });
      } else if (format === 'html') {
        res.setHeader('Content-Type', 'text/html');
        const html = this.generateHtmlInvoice(invoice);
        return res.send(html);
      } else {
        // Default JSON
        return res.json({
          success: true,
          data: invoice
        });
      }
      
    } catch (error) {
      console.error('Generate Invoice Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to generate invoice. Please try again later."
      });
    }
  }
  
  /**
   * Helper: Convert number to Ethiopian words (simplified)
   */
  static numberToEthiopianWords(number) {
    // Simplified implementation for demo
    const wholePart = Math.floor(number);
    const decimalPart = Math.round((number - wholePart) * 100);
    
    const units = ['', 'አንድ', 'ሁለት', 'ሦስት', 'አራት', 'አምስት', 'ስድስት', 'ሰባት', 'ስምንት', 'ዘጠኝ'];
    const tens = ['', 'አስር', 'ሃያ', 'ሰላሳ', 'አርባ', 'ሃምሳ', 'ስልሳ', 'ሰባ', 'ሰማንያ', 'ዘጠና'];
    
    let words = 'የብር';
    
    if (wholePart > 0) {
      if (wholePart >= 1000) {
        const thousands = Math.floor(wholePart / 1000);
        words += ` ${units[thousands]} ሺ`;
        wholePart %= 1000;
      }
      
      if (wholePart >= 100) {
        const hundreds = Math.floor(wholePart / 100);
        words += ` ${units[hundreds]} መቶ`;
        wholePart %= 100;
      }
      
      if (wholePart >= 10) {
        const ten = Math.floor(wholePart / 10);
        words += ` ${tens[ten]}`;
        wholePart %= 10;
      }
      
      if (wholePart > 0) {
        words += ` ${units[wholePart]}`;
      }
    }
    
    if (decimalPart > 0) {
      words += ` ነጥብ ${decimalPart}`;
    }
    
    return words;
  }
  
  /**
   * Helper: Generate HTML invoice (simplified)
   */
  static generateHtmlInvoice(invoice) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .hospital-name { font-size: 24px; font-weight: bold; }
          .invoice-number { float: right; font-size: 18px; }
          .section { margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .total { font-weight: bold; font-size: 18px; }
          .footer { margin-top: 40px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hospital-name">${invoice.hospital.name}</div>
          <div>${invoice.hospital.address} | ${invoice.hospital.phone}</div>
          <div class="invoice-number">Invoice: ${invoice.invoice_number}</div>
        </div>
        
        <div class="section">
          <h3>Patient Information</h3>
          <p><strong>Name:</strong> ${invoice.patient.name}</p>
          <p><strong>Phone:</strong> ${invoice.patient.phone}</p>
          <p><strong>Date:</strong> ${invoice.date} (${invoice.date_english})</p>
        </div>
        
        <div class="section">
          <h3>Services</h3>
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `
                <tr>
                  <td>${item.service_name}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unit_price} ${invoice.currency_symbol}</td>
                  <td>${item.subtotal} ${invoice.currency_symbol}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="section">
          <h3>Summary</h3>
          <p><strong>Subtotal:</strong> ${invoice.summary.subtotal} ${invoice.currency_symbol}</p>
          <p><strong>Tax (15%):</strong> ${invoice.summary.tax} ${invoice.currency_symbol}</p>
          <p><strong>Discount:</strong> ${invoice.summary.discount} ${invoice.currency_symbol}</p>
          <p class="total"><strong>Total:</strong> ${invoice.summary.total} ${invoice.currency_symbol}</p>
          <p><strong>In Words:</strong> ${invoice.summary.total_in_words}</p>
          <p><strong>Status:</strong> ${invoice.payment_status}</p>
        </div>
        
        <div class="footer">
          <p>Thank you for choosing our healthcare services!</p>
          <p>${invoice.hospital.name_english} | TIN: ${invoice.hospital.tin}</p>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = BillController;