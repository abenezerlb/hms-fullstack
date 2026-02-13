const db = require('../config/database');

class Bill {
  /**
   * Create a new bill
   */
  static async create(billData) {
    const {
      patient_id, appointment_id = null,
      items = [], // Array of {service_id or service_name, quantity, unit_price}
      discount = 0,
      due_date = null,
      notes = null,
      insurance_provider = null,
      insurance_claim_id = null
    } = billData;
    
    try {
      // Generate bill number
      const billNumber = await this.generateBillNumber();
      
      // Calculate total amount from items
      let amount = 0;
      items.forEach(item => {
        const subtotal = (item.quantity || 1) * (item.unit_price || 0);
        amount += subtotal;
      });
      
      // Calculate tax (simplified: 15% for demo)
      const taxAmount = amount * 0.15;
      const totalAmount = amount + taxAmount - discount;
      
      // Start transaction
      return await db.transaction(async (client) => {
        // Create bill
        const billResult = await client.query(
          `INSERT INTO bills (
            patient_id, appointment_id, bill_number,
            amount, tax_amount, discount, 
            total_amount, due_date, notes,
            insurance_provider, insurance_claim_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *`,
          [
            patient_id, appointment_id, billNumber,
            amount, taxAmount, discount, totalAmount,
            due_date, notes, insurance_provider, insurance_claim_id
          ]
        );
        
        const bill = billResult.rows[0];
        
        // Add bill items
        for (const item of items) {
          await client.query(
            `INSERT INTO bill_items (
              bill_id, service_id, service_name,
              quantity, unit_price
            ) VALUES ($1, $2, $3, $4, $5)`,
            [
              bill.id,
              item.service_id || null,
              item.service_name || 'Custom Service',
              item.quantity || 1,
              item.unit_price || 0
            ]
          );
        }
        
        // Get complete bill with items
        const completeBill = await this.findByIdWithItems(bill.id, client);
        return completeBill;
      });
      
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid patient or appointment ID');
      }
      throw error;
    }
  }
  
  /**
   * Generate unique bill number
   */
  static async generateBillNumber() {
    try {
      const date = new Date();
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      
      // Get count of bills today
      const result = await db.query(
        `SELECT COUNT(*) as count 
         FROM bills 
         WHERE DATE(created_at) = CURRENT_DATE`
      );
      
      const count = parseInt(result.rows[0].count) + 1;
      return `INV-${year}${month}${day}-${count.toString().padStart(3, '0')}`;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get bill by ID with items
   */
  static async findById(id, client = null) {
    const queryClient = client || db;
    
    try {
      const billResult = await queryClient.query(
        `SELECT 
          b.*,
          p.full_name as patient_name,
          p.phone as patient_phone,
          p.address as patient_address,
          a.appointment_date,
          u.name as doctor_name
         FROM bills b
         JOIN patients p ON b.patient_id = p.id
         LEFT JOIN appointments a ON b.appointment_id = a.id
         LEFT JOIN users u ON a.doctor_id = u.id
         WHERE b.id = $1`,
        [id]
      );
      
      if (!billResult.rows[0]) return null;
      
      const bill = billResult.rows[0];
      
      // Get bill items
      const itemsResult = await queryClient.query(
        `SELECT * FROM bill_items WHERE bill_id = $1`,
        [id]
      );
      
      bill.items = itemsResult.rows;
      
      return bill;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Same as findById but explicitly named for clarity
   */
  static async findByIdWithItems(id, client = null) {
    return this.findById(id, client);
  }
  
  /**
   * Get all bills with filters
   */
  static async findAll(filters = {}, page = 1, limit = 20) {
    const { patient_id, payment_status, date_from, date_to } = filters;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (patient_id) {
      whereClause += ` AND patient_id = $${paramCount}`;
      params.push(patient_id);
      paramCount++;
    }
    
    if (payment_status) {
      whereClause += ` AND payment_status = $${paramCount}`;
      params.push(payment_status);
      paramCount++;
    }
    
    if (date_from) {
      whereClause += ` AND DATE(created_at) >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }
    
    if (date_to) {
      whereClause += ` AND DATE(created_at) <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }
    
    try {
      // Count total
      const countResult = await db.query(
        `SELECT COUNT(*) FROM bills ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);
      
      // Get paginated data
      const queryParams = [...params, limit, offset];
      const result = await db.query(
        `SELECT 
          b.*,
          p.full_name as patient_name,
          p.phone as patient_phone
         FROM bills b
         JOIN patients p ON b.patient_id = p.id
         ${whereClause}
         ORDER BY b.created_at DESC
         LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        queryParams
      );
      
      return {
        data: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Update bill payment status
   */
  static async updatePaymentStatus(id, status, paymentMethod = null, paidDate = null) {
    const allowedStatuses = ['pending', 'partially_paid', 'paid', 'cancelled', 'refunded'];
    
    if (!allowedStatuses.includes(status)) {
      throw new Error('Invalid payment status');
    }
    
    const updates = ['payment_status = $1'];
    const values = [status];
    let paramCount = 2;
    
    if (paymentMethod) {
      updates.push(`payment_method = $${paramCount}`);
      values.push(paymentMethod);
      paramCount++;
    }
    
    if (paidDate) {
      updates.push(`paid_date = $${paramCount}`);
      values.push(paidDate);
      paramCount++;
    } else if (status === 'paid') {
      updates.push(`paid_date = CURRENT_TIMESTAMP`);
    }
    
    values.push(id);
    
    try {
      const result = await db.query(
        `UPDATE bills 
         SET ${updates.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get payment summary statistics
   */
  static async getPaymentSummary() {
    try {
      const result = await db.query(
        `SELECT 
          COUNT(*) as total_bills,
          SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_count,
          SUM(CASE WHEN payment_status IN ('pending', 'partially_paid') THEN 1 ELSE 0 END) as pending_count,
          COALESCE(SUM(total_amount), 0) as total_amount,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as total_received,
          COALESCE(SUM(CASE WHEN payment_status IN ('pending', 'partially_paid') THEN total_amount ELSE 0 END), 0) as total_pending
         FROM bills`
      );
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Bill;