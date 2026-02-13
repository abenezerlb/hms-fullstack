const db = require('../config/database');

class MedicalRecord {
  /**
   * Create a new medical record (EHR)
   */
  static async create(recordData) {
    const {
      patient_id, doctor_id, appointment_id = null,
      symptoms, diagnosis, prescription,
      temperature = null, blood_pressure = null,
      weight = null, height = null,
      notes = null, follow_up_date = null
    } = recordData;
    
    try {
      const result = await db.query(
        `INSERT INTO medical_records (
          patient_id, doctor_id, appointment_id,
          symptoms, diagnosis, prescription,
          temperature, blood_pressure,
          weight, height,
          notes, follow_up_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          patient_id, doctor_id, appointment_id,
          symptoms, diagnosis, prescription,
          temperature, blood_pressure,
          weight, height,
          notes, follow_up_date
        ]
      );
      
      return result.rows[0];
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid patient, doctor, or appointment ID');
      }
      throw error;
    }
  }
  
  /**
   * Get medical record by ID
   */
  static async findById(id) {
    try {
      const result = await db.query(
        `SELECT 
          mr.*,
          p.full_name as patient_name,
          p.date_of_birth as patient_dob,
          p.blood_type as patient_blood_type,
          u.name as doctor_name,
          u.specialization as doctor_specialization,
          a.appointment_date
         FROM medical_records mr
         JOIN patients p ON mr.patient_id = p.id
         JOIN users u ON mr.doctor_id = u.id
         LEFT JOIN appointments a ON mr.appointment_id = a.id
         WHERE mr.id = $1`,
        [id]
      );
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get all medical records for a patient
   */
  static async findByPatientId(patientId) {
    try {
      const result = await db.query(
        `SELECT 
          mr.*,
          u.name as doctor_name,
          u.specialization as doctor_specialization
         FROM medical_records mr
         JOIN users u ON mr.doctor_id = u.id
         WHERE mr.patient_id = $1
         ORDER BY mr.created_at DESC`,
        [patientId]
      );
      
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Update medical record
   */
  static async update(id, updateData) {
    const allowedFields = [
      'symptoms', 'diagnosis', 'prescription',
      'temperature', 'blood_pressure', 'weight', 'height',
      'notes', 'follow_up_date'
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
        `UPDATE medical_records 
         SET ${fields.join(', ')}
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
   * Search medical records by diagnosis or symptoms
   */
  static async search(query, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    try {
      // Count total
      const countResult = await db.query(
        `SELECT COUNT(*) 
         FROM medical_records 
         WHERE diagnosis ILIKE $1 OR symptoms ILIKE $1`,
        [`%${query}%`]
      );
      const total = parseInt(countResult.rows[0].count);
      
      // Get paginated data
      const result = await db.query(
        `SELECT 
          mr.*,
          p.full_name as patient_name,
          u.name as doctor_name
         FROM medical_records mr
         JOIN patients p ON mr.patient_id = p.id
         JOIN users u ON mr.doctor_id = u.id
         WHERE mr.diagnosis ILIKE $1 OR mr.symptoms ILIKE $1
         ORDER BY mr.created_at DESC
         LIMIT $2 OFFSET $3`,
        [`%${query}%`, limit, offset]
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
   * Get patient vitals history
   */
  static async getVitalsHistory(patientId) {
    try {
      const result = await db.query(
        `SELECT 
          created_at as date,
          temperature,
          blood_pressure,
          weight,
          height
         FROM medical_records 
         WHERE patient_id = $1 
         AND (temperature IS NOT NULL OR blood_pressure IS NOT NULL OR weight IS NOT NULL)
         ORDER BY created_at DESC
         LIMIT 10`,
        [patientId]
      );
      
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = MedicalRecord;