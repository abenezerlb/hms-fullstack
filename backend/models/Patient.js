const db = require('../config/database');

class Patient {
  /**
   * Create a new patient
   */
  static async create(patientData) {
    const {
      full_name, gender, date_of_birth, phone,
      email = null, address = null, emergency_contact = null,
      blood_type = null, allergies = null
    } = patientData;
    
    try {
      const result = await db.query(
        `INSERT INTO patients (
          full_name, gender, date_of_birth, phone,
          email, address, emergency_contact,
          blood_type, allergies
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          full_name, gender, date_of_birth, phone,
          email, address, emergency_contact,
          blood_type, allergies
        ]
      );
      
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique constraint (phone)
        throw new Error('Phone number already registered');
      }
      throw error;
    }
  }
  
  /**
   * Find patient by ID
   */
  static async findById(id) {
    try {
      const result = await db.query(
        `SELECT * FROM patients WHERE id = $1`,
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Find patient by phone number
   */
  static async findByPhone(phone) {
    try {
      const result = await db.query(
        `SELECT * FROM patients WHERE phone = $1`,
        [phone]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get all patients with search and filters
   */
  static async findAll(filters = {}, page = 1, limit = 20) {
    const { search, gender } = filters;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    // Build WHERE clause dynamically
    if (search) {
      whereClause += ` AND (
        full_name ILIKE $${paramCount} OR 
        phone ILIKE $${paramCount} OR
        email ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }
    
    if (gender) {
      whereClause += ` AND gender = $${paramCount}`;
      params.push(gender);
      paramCount++;
    }
    
    try {
      // Count total
      const countResult = await db.query(
        `SELECT COUNT(*) FROM patients ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);
      
      // Get paginated data
      const queryParams = [...params, limit, offset];
      const result = await db.query(
        `SELECT * FROM patients 
         ${whereClause}
         ORDER BY created_at DESC
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
   * Update patient information
   */
  static async update(id, updateData) {
    const allowedFields = [
      'full_name', 'gender', 'date_of_birth', 'phone',
      'email', 'address', 'emergency_contact',
      'blood_type', 'allergies'
    ];
    
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    // Only allow updates to specific fields
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
        paramCount++;
      }
    });
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    values.push(id);
    
    try {
      const result = await db.query(
        `UPDATE patients 
         SET ${fields.join(', ')}
         WHERE id = $${paramCount}
         RETURNING *`,
        values
      );
      
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique constraint
        throw new Error('Phone number already registered to another patient');
      }
      throw error;
    }
  }
  
  /**
   * Get patient statistics (appointments, bills, etc.)
   */
  static async getStatistics(patientId) {
    try {
      // Get counts from related tables
      const appointmentsResult = await db.query(
        `SELECT COUNT(*) FROM appointments WHERE patient_id = $1`,
        [patientId]
      );
      
      const billsResult = await db.query(
        `SELECT 
          COUNT(*) as total_bills,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as total_paid,
          COALESCE(SUM(CASE WHEN payment_status IN ('pending', 'partially_paid') THEN total_amount ELSE 0 END), 0) as pending_amount
         FROM bills 
         WHERE patient_id = $1`,
        [patientId]
      );
      
      const lastVisitResult = await db.query(
        `SELECT MAX(appointment_date) as last_visit 
         FROM appointments 
         WHERE patient_id = $1 AND status = 'completed'`,
        [patientId]
      );
      
      return {
        total_appointments: parseInt(appointmentsResult.rows[0].count),
        total_bills: parseInt(billsResult.rows[0].total_bills),
        total_paid: parseFloat(billsResult.rows[0].total_paid),
        pending_amount: parseFloat(billsResult.rows[0].pending_amount),
        last_visit: lastVisitResult.rows[0].last_visit
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Patient;