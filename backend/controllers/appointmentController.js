const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const User = require('../models/User');

class AppointmentController {
  
  /**
   * Schedule a new appointment
   * POST /api/appointments
   */
  static async createAppointment(req, res) {
    try {
      const appointmentData = req.body;
      
      // Verify patient exists
      const patient = await Patient.findById(appointmentData.patient_id);
      if (!patient) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Patient with ID '${appointmentData.patient_id}' not found.`
        });
      }
      
      // Verify doctor exists and is active
      const doctor = await User.findById(appointmentData.doctor_id);
      if (!doctor || doctor.role !== 'doctor' || !doctor.is_active) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Doctor with ID '${appointmentData.doctor_id}' not found or is not available.`
        });
      }
      
      // Create appointment
      const appointment = await Appointment.create(appointmentData);
      
      // Generate appointment number (simplified)
      const appointmentNumber = `APT-${new Date(appointment.appointment_date).getFullYear()}${(new Date(appointment.appointment_date).getMonth() + 1).toString().padStart(2, '0')}${appointment.id.toString().substr(0, 8).toUpperCase()}`;
      
      return res.status(201).json({
        success: true,
        message: "Appointment scheduled successfully",
        data: {
          ...appointment,
          appointment_number: appointmentNumber,
          patient_name: patient.full_name,
          doctor_name: doctor.name
        }
      });
      
    } catch (error) {
      console.error('Create Appointment Error:', error);
      
      if (error.message === 'Appointment slot is not available') {
        return res.status(409).json({
          success: false,
          error: "Conflict",
          message: "The selected time slot is not available. Please choose another time."
        });
      }
      
      if (error.message === 'Invalid patient or doctor ID') {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "Invalid patient or doctor ID."
        });
      }
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to schedule appointment. Please try again later."
      });
    }
  }
  
  /**
   * Get all appointments with filters
   * GET /api/appointments
   */
  static async getAllAppointments(req, res) {
    try {
      const { 
        date, 
        doctor_id, 
        status, 
        patient_id,
        page = 1, 
        limit = 20 
      } = req.query;
      
      const filters = {};
      if (date) filters.date = date;
      if (doctor_id) filters.doctor_id = doctor_id;
      if (status) filters.status = status;
      if (patient_id) filters.patient_id = patient_id;
      
      const result = await Appointment.findAll(filters, page, limit);
      
      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
      
    } catch (error) {
      console.error('Get All Appointments Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch appointments. Please try again later."
      });
    }
  }
  
  /**
   * Get appointment by ID
   * GET /api/appointments/:id
   */
  static async getAppointmentById(req, res) {
    try {
      const { id } = req.params;
      
      const appointment = await Appointment.findById(id);
      
      if (!appointment) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Appointment with ID '${id}' not found.`
        });
      }
      
      return res.json({
        success: true,
        data: appointment
      });
      
    } catch (error) {
      console.error('Get Appointment Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch appointment. Please try again later."
      });
    }
  }
  
  /**
   * Update appointment status
   * PUT /api/appointments/:id/status
   */
  static async updateAppointmentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "Status is required."
        });
      }
      
      const updatedAppointment = await Appointment.updateStatus(id, status);
      
      if (!updatedAppointment) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Appointment with ID '${id}' not found.`
        });
      }
      
      return res.json({
        success: true,
        message: "Appointment status updated successfully",
        data: updatedAppointment
      });
      
    } catch (error) {
      console.error('Update Appointment Status Error:', error);
      
      if (error.message === 'Invalid status') {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "Invalid appointment status."
        });
      }
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to update appointment status. Please try again later."
      });
    }
  }
  
  /**
   * Get doctor's availability
   * GET /api/appointments/availability/:doctor_id
   */
  static async getDoctorAvailability(req, res) {
    try {
      const { doctor_id } = req.params;
      const { date } = req.query;
      
      if (!date) {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "Date is required (YYYY-MM-DD format)."
        });
      }
      
      // Verify doctor exists
      const doctor = await User.findById(doctor_id);
      if (!doctor || doctor.role !== 'doctor' || !doctor.is_active) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Doctor with ID '${doctor_id}' not found or is not available.`
        });
      }
      
      const availability = await Appointment.getDoctorAvailability(doctor_id, date);
      
      return res.json({
        success: true,
        data: availability
      });
      
    } catch (error) {
      console.error('Get Doctor Availability Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch doctor availability. Please try again later."
      });
    }
  }
  
  /**
   * Cancel an appointment
   * PUT /api/appointments/:id/cancel
   */
  static async cancelAppointment(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      // Get appointment first to check if it can be cancelled
      const appointment = await Appointment.findById(id);
      
      if (!appointment) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Appointment with ID '${id}' not found.`
        });
      }
      
      // Check if appointment can be cancelled (not already completed or cancelled)
      if (['completed', 'cancelled', 'no-show'].includes(appointment.status)) {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: `Appointment is already ${appointment.status}.`
        });
      }
      
      // Update status to cancelled
      const cancelledAppointment = await Appointment.updateStatus(id, 'cancelled');
      
      return res.json({
        success: true,
        message: "Appointment cancelled successfully",
        data: cancelledAppointment
      });
      
    } catch (error) {
      console.error('Cancel Appointment Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to cancel appointment. Please try again later."
      });
    }
  }
}

module.exports = AppointmentController;