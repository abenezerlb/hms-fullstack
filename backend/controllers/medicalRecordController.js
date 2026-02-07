const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const User = require('../models/User');

class MedicalRecordController {
  
  /**
   * Create a new medical record
   * POST /api/medical-records
   */
  static async createMedicalRecord(req, res) {
    try {
      const recordData = req.body;
      
      // Verify patient exists
      const patient = await Patient.findById(recordData.patient_id);
      if (!patient) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Patient with ID '${recordData.patient_id}' not found.`
        });
      }
      
      // Verify doctor exists
      const doctor = await User.findById(recordData.doctor_id);
      if (!doctor || doctor.role !== 'doctor' || !doctor.is_active) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Doctor with ID '${recordData.doctor_id}' not found or is not available.`
        });
      }
      
      // Create medical record
      const medicalRecord = await MedicalRecord.create(recordData);
      
      return res.status(201).json({
        success: true,
        message: "Medical record created successfully",
        data: medicalRecord
      });
      
    } catch (error) {
      console.error('Create Medical Record Error:', error);
      
      if (error.message === 'Invalid patient, doctor, or appointment ID') {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "Invalid patient, doctor, or appointment ID."
        });
      }
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to create medical record. Please try again later."
      });
    }
  }
  
  /**
   * Get patient's medical history
   * GET /api/medical-records/patient/:patient_id
   */
  static async getPatientMedicalRecords(req, res) {
    try {
      const { patient_id } = req.params;
      
      // Verify patient exists
      const patient = await Patient.findById(patient_id);
      if (!patient) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Patient with ID '${patient_id}' not found.`
        });
      }
      
      const medicalRecords = await MedicalRecord.findByPatientId(patient_id);
      
      return res.json({
        success: true,
        data: medicalRecords
      });
      
    } catch (error) {
      console.error('Get Medical Records Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch medical records. Please try again later."
      });
    }
  }
  
  /**
   * Get specific medical record
   * GET /api/medical-records/:id
   */
  static async getMedicalRecordById(req, res) {
    try {
      const { id } = req.params;
      
      const medicalRecord = await MedicalRecord.findById(id);
      
      if (!medicalRecord) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Medical record with ID '${id}' not found.`
        });
      }
      
      return res.json({
        success: true,
        data: medicalRecord
      });
      
    } catch (error) {
      console.error('Get Medical Record Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch medical record. Please try again later."
      });
    }
  }
  
  /**
   * Update medical record
   * PUT /api/medical-records/:id
   */
  static async updateMedicalRecord(req, res) {
    try {
      const { id } = req.params;
      
      const updatedRecord = await MedicalRecord.update(id, req.body);
      
      if (!updatedRecord) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Medical record with ID '${id}' not found.`
        });
      }
      
      return res.json({
        success: true,
        message: "Medical record updated successfully",
        data: updatedRecord
      });
      
    } catch (error) {
      console.error('Update Medical Record Error:', error);
      
      if (error.message === 'No valid fields to update') {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "No valid fields to update."
        });
      }
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to update medical record. Please try again later."
      });
    }
  }
  
  /**
   * Search medical records by diagnosis or symptoms
   * GET /api/medical-records/search?q=query
   */
  static async searchMedicalRecords(req, res) {
    try {
      const { q, page = 1, limit = 20 } = req.query;
      
      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: "Bad request",
          message: "Search query must be at least 2 characters long."
        });
      }
      
      const result = await MedicalRecord.search(q, page, limit);
      
      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
      
    } catch (error) {
      console.error('Search Medical Records Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to search medical records. Please try again later."
      });
    }
  }
  
  /**
   * Get patient's vitals history
   * GET /api/medical-records/patient/:patient_id/vitals
   */
  static async getPatientVitals(req, res) {
    try {
      const { patient_id } = req.params;
      
      // Verify patient exists
      const patient = await Patient.findById(patient_id);
      if (!patient) {
        return res.status(404).json({
          success: false,
          error: "Not found",
          message: `Patient with ID '${patient_id}' not found.`
        });
      }
      
      const vitals = await MedicalRecord.getVitalsHistory(patient_id);
      
      return res.json({
        success: true,
        data: vitals
      });
      
    } catch (error) {
      console.error('Get Patient Vitals Error:', error);
      
      return res.status(500).json({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch patient vitals. Please try again later."
      });
    }
  }
}

module.exports = MedicalRecordController;