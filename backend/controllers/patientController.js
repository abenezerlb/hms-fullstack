const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');

class PatientController {
  
  /**
   * Create a new patient
   * POST /api/patients
   */
  static async createPatient(req, res) {
    try {
      const patientData = req.body;
      
      // Create patient
      const patient = await Patient.create(patientData);
      
      return res.status(201).json({
        success: true,
        message: "Patient created successfully",
        data: patient
      });
      
    } catch (error) {
      console.error('Create Patient Error:', error);
      
      if (error.message === 'Phone number already registered') {
        return res.status(409).json({
          success: false,
          error: "Conflict",
          message: "A patient with this phone number already exists."
        });
      }
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to create patient. Please try again later."
      });
    }
  }
  
  /**
   * Get all patients with search/filter
   * GET /api/patients
   */
  static async getAllPatients(req, res) {
    try {
      const { 
        search, 
        gender, 
        page = 1, 
        limit = 20 
      } = req.query;
      
      const filters = {};
      if (search) filters.search = search;
      if (gender) filters.gender = gender;
      
      const result = await Patient.findAll(filters, page, limit);
      
      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
      
    } catch (error) {
      console.error('Get All Patients Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch patients. Please try again later."
      });
    }
  }
  
  /**
   * Get patient by ID
   * GET /api/patients/:id
   */
  static async getPatientById(req, res) {
    try {
      const { id } = req.params;
      
      const patient = await Patient.findById(id);
      
      if (!patient) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Patient with ID '${id}' not found.`
        });
      }
      
      // Get patient statistics
      const statistics = await Patient.getStatistics(id);
      
      return res.json({
        success: true,
        data: {
          ...patient,
          statistics
        }
      });
      
    } catch (error) {
      console.error('Get Patient Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch patient. Please try again later."
      });
    }
  }
  
  /**
   * Update patient information
   * PUT /api/patients/:id
   */
  static async updatePatient(req, res) {
    try {
      const { id } = req.params;
      
      const updatedPatient = await Patient.update(id, req.body);
      
      if (!updatedPatient) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Patient with ID '${id}' not found.`
        });
      }
      
      return res.json({
        success: true,
        message: "Patient updated successfully",
        data: updatedPatient
      });
      
    } catch (error) {
      console.error('Update Patient Error:', error);
      
      if (error.message === 'Phone number already registered to another patient') {
        return res.status(409).json({
          success: false,
          error: "Conflict",
          message: "Phone number already registered to another patient."
        });
      }
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to update patient. Please try again later."
      });
    }
  }
  
  /**
   * Get patient's appointment history
   * GET /api/patients/:id/appointments
   */
  static async getPatientAppointments(req, res) {
    try {
      const { id } = req.params;
      
      // Verify patient exists
      const patient = await Patient.findById(id);
      if (!patient) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Patient with ID '${id}' not found.`
        });
      }
      
      const appointments = await Appointment.getPatientHistory(id);
      
      return res.json({
        success: true,
        data: appointments
      });
      
    } catch (error) {
      console.error('Get Patient Appointments Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch appointments. Please try again later."
      });
    }
  }
  
  /**
   * Search patients by name or phone
   * GET /api/patients/search?q=query
   */
  static async searchPatients(req, res) {
    try {
      const { q } = req.query;
      
      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "Search query must be at least 2 characters long."
        });
      }
      
      const result = await Patient.findAll({ search: q }, 1, 10);
      
      return res.json({
        success: true,
        data: result.data
      });
      
    } catch (error) {
      console.error('Search Patients Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to search patients. Please try again later."
      });
    }
  }
}

module.exports = PatientController;