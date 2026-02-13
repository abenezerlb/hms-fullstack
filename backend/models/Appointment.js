const db = require('../config/database');

class Appointment {
  /**
   * Create a new appointment
   */
  static async create(appointmentData) {
    const {
      patient_id, doctor_id, appointment_date,
      appointment_type = 'consultation', reason = null,
      duration_minutes = 30, notes = null
    } = appointmentData;
    
    try {
      // Check if slot is available
      const isAvailable = await this.checkAvailability(doctor_id, appointment_date);
      if (!isAvailable) {
        throw new Error('Appointment slot is not available');
      }
      
      const result = await db.query(
        `INSERT INTO appointments (
          patient_id, doctor_id, appointment_date,
          appointment_type, reason, duration_minutes, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          patient_id, doctor_id, appointment_date,
          appointment_type, reason, duration_minutes, notes
        ]
      );
      
      return result.rows[0];
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid patient or doctor ID');
      }
      throw error;
    }
  }
  
  /**
   * Check if a time slot is available for a doctor
   */
  static async checkAvailability(doctorId, appointmentDate) {
    try {
      // Convert to time range (appointment +/- duration)
      const result = await db.query(
        `SELECT COUNT(*) 
         FROM appointments 
         WHERE doctor_id = $1 
         AND appointment_date = $2 
         AND status NOT IN ('cancelled', 'no-show')`,
        [doctorId, appointmentDate]
      );
      
      return parseInt(result.rows[0].count) === 0;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get appointment by ID with details
   */
  static async findById(id) {
    try {
      const result = await db.query(
        `SELECT 
          a.*,
          p.full_name as patient_name,
          p.phone as patient_phone,
          p.date_of_birth as patient_dob,
          u.name as doctor_name,
          u.specialization as doctor_specialization,
          u.phone as doctor_phone
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         JOIN users u ON a.doctor_id = u.id
         WHERE a.id = $1`,
        [id]
      );
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get all appointments with filters
   */
  static async findAll(filters = {}, page = 1, limit = 20) {
    const { date, doctor_id, status, patient_id } = filters;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    // Build WHERE clause
    if (date) {
      whereClause += ` AND DATE(appointment_date) = $${paramCount}`;
      params.push(date);
      paramCount++;
    }
    
    if (doctor_id) {
      whereClause += ` AND doctor_id = $${paramCount}`;
      params.push(doctor_id);
      paramCount++;
    }
    
    if (status) {
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    if (patient_id) {
      whereClause += ` AND patient_id = $${paramCount}`;
      params.push(patient_id);
      paramCount++;
    }
    
    try {
      // Count total
      const countResult = await db.query(
        `SELECT COUNT(*) FROM appointments ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);
      
      // Get paginated data with joins
      const queryParams = [...params, limit, offset];
      const result = await db.query(
        `SELECT 
          a.*,
          p.full_name as patient_name,
          p.phone as patient_phone,
          u.name as doctor_name,
          u.specialization as doctor_specialization
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         JOIN users u ON a.doctor_id = u.id
         ${whereClause}
         ORDER BY appointment_date ASC
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
   * Update appointment status
   */
  static async updateStatus(id, status) {
    const allowedStatuses = ['scheduled', 'confirmed', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show'];
    
    if (!allowedStatuses.includes(status)) {
      throw new Error('Invalid status');
    }
    
    try {
      const result = await db.query(
        `UPDATE appointments 
         SET status = $1
         WHERE id = $2
         RETURNING *`,
        [status, id]
      );
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get doctor's available slots for a specific date
   */
  static async getDoctorAvailability(doctorId, date) {
    try {
      // Get doctor's working hours (simplified - in real app, this would be from a schedule table)
      const workingHours = {
        start: '09:00',
        end: '17:00',
        slotDuration: 30 // minutes
      };
      
      // Get booked slots for the day
      const bookedResult = await db.query(
        `SELECT appointment_date 
         FROM appointments 
         WHERE doctor_id = $1 
         AND DATE(appointment_date) = $2 
         AND status NOT IN ('cancelled', 'no-show')
         ORDER BY appointment_date`,
        [doctorId, date]
      );
      
      const bookedSlots = bookedResult.rows.map(row => 
        new Date(row.appointment_date).toTimeString().substring(0, 5)
      );
      
      // Generate all possible slots
      const allSlots = [];
      const [startHour, startMinute] = workingHours.start.split(':').map(Number);
      const [endHour, endMinute] = workingHours.end.split(':').map(Number);
      
      let currentHour = startHour;
      let currentMinute = startMinute;
      
      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const slotTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        allSlots.push(slotTime);
        
        currentMinute += workingHours.slotDuration;
        if (currentMinute >= 60) {
          currentHour += Math.floor(currentMinute / 60);
          currentMinute = currentMinute % 60;
        }
      }
      
      // Filter out booked slots
      const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));
      
      return {
        doctor_id: doctorId,
        date: date,
        available_slots: availableSlots,
        booked_slots: bookedSlots
      };
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get appointment history for a patient
   */
  static async getPatientHistory(patientId) {
    try {
      const result = await db.query(
        `SELECT 
          a.id, a.appointment_date, a.status, a.reason, a.notes,
          u.name as doctor_name, u.specialization as doctor_specialization
         FROM appointments a
         JOIN users u ON a.doctor_id = u.id
         WHERE a.patient_id = $1
         ORDER BY a.appointment_date DESC`,
        [patientId]
      );
      
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Appointment;