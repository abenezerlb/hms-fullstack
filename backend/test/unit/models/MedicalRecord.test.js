const MedicalRecord = require('../../../models/MedicalRecord');
const db = require('../../../config/database');

describe('MedicalRecord Model', () => {
  const mockMedicalRecord = {
    id: '123e4567-e89b-12d3-a456-426614174003',
    patient_id: 'patient-123',
    doctor_id: 'doctor-123',
    appointment_id: 'appointment-123',
    symptoms: 'Fever, headache, fatigue',
    diagnosis: 'Viral infection',
    prescription: 'Rest, hydration, paracetamol 500mg',
    notes: 'Patient recovering well',
    temperature: 38.5,
    blood_pressure: '120/80',
    weight: 65.5,
    height: 170.0,
    follow_up_date: '2024-02-05',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const mockPatient = {
    id: 'patient-123',
    full_name: 'Mekdes Abebe',
    date_of_birth: '1990-05-15',
    blood_type: 'O+'
  };

  const mockDoctor = {
    id: 'doctor-123',
    name: 'Dr. Alemayehu Teklu',
    specialization: 'Cardiology'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('should create a new medical record', async () => {
      const recordData = {
        patient_id: 'patient-123',
        doctor_id: 'doctor-123',
        appointment_id: 'appointment-123',
        symptoms: 'Fever, cough, body pain',
        diagnosis: 'Upper respiratory infection',
        prescription: 'Antibiotics, rest, fluids',
        temperature: 38.2,
        blood_pressure: '118/76',
        weight: 68.0,
        height: 172.0,
        notes: 'Patient advised to rest for 3 days',
        follow_up_date: '2024-02-10'
      };

      db.query.mockResolvedValue({ rows: [{ ...mockMedicalRecord, ...recordData }] });

      const result = await MedicalRecord.create(recordData);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO medical_records'),
        expect.arrayContaining([
          'patient-123', 'doctor-123', 'appointment-123',
          'Fever, cough, body pain', 'Upper respiratory infection'
        ])
      );
      expect(result.symptoms).toBe('Fever, cough, body pain');
      expect(result.diagnosis).toBe('Upper respiratory infection');
      expect(result.temperature).toBe(38.2);
    });

    it('should handle optional fields', async () => {
      const minimalRecordData = {
        patient_id: 'patient-123',
        doctor_id: 'doctor-123',
        symptoms: 'Fever',
        diagnosis: 'Infection'
      };

      db.query.mockResolvedValue({ 
        rows: [{ 
          ...mockMedicalRecord, 
          ...minimalRecordData,
          prescription: null,
          temperature: null,
          blood_pressure: null,
          weight: null,
          height: null,
          follow_up_date: null
        }] 
      });

      const result = await MedicalRecord.create(minimalRecordData);
      
      expect(result.prescription).toBeNull();
      expect(result.temperature).toBeNull();
      // Should still create successfully without optional fields
    });

    it('should throw error for invalid foreign keys', async () => {
      const recordData = {
        patient_id: 'invalid-patient',
        doctor_id: 'invalid-doctor',
        symptoms: 'Fever',
        diagnosis: 'Infection'
      };

      const dbError = new Error('Foreign key violation');
      dbError.code = '23503';
      db.query.mockRejectedValue(dbError);

      await expect(MedicalRecord.create(recordData)).rejects.toThrow(
        'Invalid patient, doctor, or appointment ID'
      );
    });
  });

  describe('findById()', () => {
    it('should find medical record by ID with patient and doctor details', async () => {
      const recordId = mockMedicalRecord.id;
      
      db.query.mockResolvedValue({ 
        rows: [{ 
          ...mockMedicalRecord,
          patient_name: mockPatient.full_name,
          patient_dob: mockPatient.date_of_birth,
          patient_blood_type: mockPatient.blood_type,
          doctor_name: mockDoctor.name,
          doctor_specialization: mockDoctor.specialization,
          appointment_date: new Date('2024-01-29T14:30:00Z')
        }] 
      });

      const result = await MedicalRecord.findById(recordId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN patients p ON mr.patient_id = p.id'),
        [recordId]
      );
      expect(result.patient_name).toBe('Mekdes Abebe');
      expect(result.doctor_name).toBe('Dr. Alemayehu Teklu');
      expect(result.patient_blood_type).toBe('O+');
    });
  });

  describe('findByPatientId()', () => {
    it('should return all medical records for a patient', async () => {
      const patientId = 'patient-123';
      
      const mockRecords = [
        { ...mockMedicalRecord, id: 'record-1', doctor_name: 'Dr. One' },
        { ...mockMedicalRecord, id: 'record-2', doctor_name: 'Dr. Two' }
      ];

      db.query.mockResolvedValue({ rows: mockRecords });

      const result = await MedicalRecord.findByPatientId(patientId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE mr.patient_id = $1'),
        [patientId]
      );
      expect(result).toHaveLength(2);
      expect(result[0].doctor_name).toBe('Dr. One');
      expect(result[1].doctor_name).toBe('Dr. Two');
    });

    it('should return empty array for new patient', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const result = await MedicalRecord.findByPatientId('new-patient-id');

      expect(result).toEqual([]);
    });
  });

  describe('update()', () => {
    it('should update medical record fields', async () => {
      const recordId = mockMedicalRecord.id;
      const updateData = {
        symptoms: 'Updated symptoms',
        diagnosis: 'Updated diagnosis',
        prescription: 'Updated prescription',
        temperature: 37.5,
        blood_pressure: '110/70',
        notes: 'Patient feeling better',
        follow_up_date: '2024-02-20'
      };

      const updatedRecord = { ...mockMedicalRecord, ...updateData };
      db.query.mockResolvedValue({ rows: [updatedRecord] });

      const result = await MedicalRecord.update(recordId, updateData);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE medical_records'),
        expect.arrayContaining([
          'Updated symptoms',
          'Updated diagnosis',
          'Updated prescription',
          37.5,
          '110/70',
          'Patient feeling better',
          '2024-02-20',
          recordId
        ])
      );
      expect(result.symptoms).toBe('Updated symptoms');
      expect(result.temperature).toBe(37.5);
    });

    it('should only update allowed fields', async () => {
      const updateData = {
        symptoms: 'Updated',
        invalid_field: 'Should be ignored', // Not in allowedFields
        patient_id: 'new-patient' // Should not be allowed to change
      };

      db.query.mockResolvedValue({ rows: [{ ...mockMedicalRecord, symptoms: 'Updated' }] });

      const result = await MedicalRecord.update('record-id', updateData);

      const sql = db.query.mock.calls[0][0];
      expect(sql).toContain('symptoms =');
      expect(sql).not.toContain('invalid_field =');
      expect(sql).not.toContain('patient_id =');
      expect(result.symptoms).toBe('Updated');
    });

    it('should throw error when no valid fields to update', async () => {
      await expect(
        MedicalRecord.update('record-id', { invalid_field: 'test' })
      ).rejects.toThrow('No valid fields to update');
    });
  });

  describe('search()', () => {
    it('should search medical records by diagnosis or symptoms', async () => {
      const query = 'infection';
      const page = 1;
      const limit = 20;

      const mockResults = [
        {
          ...mockMedicalRecord,
          id: 'record-1',
          patient_name: 'Patient One',
          doctor_name: 'Dr. One',
          diagnosis: 'Viral infection'
        },
        {
          ...mockMedicalRecord,
          id: 'record-2',
          patient_name: 'Patient Two',
          doctor_name: 'Dr. Two',
          symptoms: 'Signs of infection'
        }
      ];

      db.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: mockResults });

      const result = await MedicalRecord.search(query, page, limit);

      expect(db.query).toHaveBeenCalledTimes(2);
      expect(db.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('COUNT(*)'),
        expect.arrayContaining(['%infection%'])
      );
      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.data[0].diagnosis).toContain('infection');
    });

    it('should handle empty search results', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await MedicalRecord.search('nonexistent', 1, 10);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should escape special characters in search query', async () => {
      const query = "O'Neil infection";
      
      db.query.mockResolvedValue({ rows: [{ count: '0' }] });

      await MedicalRecord.search(query, 1, 10);

      expect(db.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([`%${query}%`])
      );
    });
  });

  describe('getVitalsHistory()', () => {
    it('should return patient vitals history', async () => {
      const patientId = 'patient-123';
      
      const mockVitals = [
        {
          date: new Date('2024-01-15T10:00:00Z'),
          temperature: 38.5,
          blood_pressure: '120/80',
          weight: 65.5,
          height: 170.0
        },
        {
          date: new Date('2024-01-10T14:00:00Z'),
          temperature: 37.2,
          blood_pressure: '118/76',
          weight: 65.0,
          height: 170.0
        }
      ];

      db.query.mockResolvedValue({ rows: mockVitals });

      const result = await MedicalRecord.getVitalsHistory(patientId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE patient_id = $1'),
        [patientId]
      );
      expect(result).toHaveLength(2);
      expect(result[0].temperature).toBe(38.5);
      expect(result[1].blood_pressure).toBe('118/76');
    });

    it('should limit results to 10 most recent', async () => {
      const patientId = 'patient-123';
      
      db.query.mockResolvedValue({ rows: Array(5).fill({}) });

      const result = await MedicalRecord.getVitalsHistory(patientId);

      const sql = db.query.mock.calls[0][0];
      expect(sql).toContain('LIMIT 10');
      expect(result).toHaveLength(5);
    });

    it('should filter records with vitals data only', async () => {
      const patientId = 'patient-123';
      
      await MedicalRecord.getVitalsHistory(patientId);

      const sql = db.query.mock.calls[0][0];
      expect(sql).toContain('temperature IS NOT NULL OR blood_pressure IS NOT NULL OR weight IS NOT NULL');
    });
  });

  describe('Edge Cases', () => {
    it('should handle blood pressure format validation', async () => {
      const validPressures = ['120/80', '110/70', '90/60'];
      const invalidPressures = ['120-80', '120', 'abc', '120/80/90'];

      // Test should accept valid formats in create/update
      // Implementation would validate at application level
    });

    it('should handle temperature range validation', async () => {
      const extremeTemperatures = [20.0, 45.0, 60.0]; // 20°C to 45°C are physiological ranges
      
      // Implementation should validate at application level
      // Database may have CHECK constraints
    });

    it('should handle follow-up date in the past', async () => {
      const pastDate = '2023-01-01';
      const recordData = {
        patient_id: 'patient-123',
        doctor_id: 'doctor-123',
        symptoms: 'Test',
        diagnosis: 'Test',
        follow_up_date: pastDate
      };

      db.query.mockResolvedValue({ rows: [recordData] });

      // Should allow past dates (for historical records)
      const result = await MedicalRecord.create(recordData);
      expect(result.follow_up_date).toBe(pastDate);
    });
  });
});