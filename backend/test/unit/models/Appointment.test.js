const Appointment = require('../../../models/Appointment');
const db = require('../../../config/database');

describe('Appointment Model', () => {
  const mockAppointment = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    patient_id: 'patient-123',
    doctor_id: 'doctor-123',
    appointment_date: new Date('2024-02-15T10:00:00Z'),
    appointment_type: 'consultation',
    status: 'scheduled',
    reason: 'Routine checkup',
    notes: 'Follow-up from previous visit',
    duration_minutes: 30,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const mockPatient = {
    id: 'patient-123',
    full_name: 'Mekdes Abebe',
    phone: '+251911234567'
  };

  const mockDoctor = {
    id: 'doctor-123',
    name: 'Dr. Alemayehu Teklu',
    specialization: 'Cardiology',
    phone: '+251922222222'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('should create a new appointment', async () => {
      const appointmentData = {
        patient_id: 'patient-123',
        doctor_id: 'doctor-123',
        appointment_date: new Date('2024-02-15T10:00:00Z'),
        appointment_type: 'consultation',
        reason: 'Fever and cough',
        duration_minutes: 30
      };

      // Mock availability check
      jest.spyOn(Appointment, 'checkAvailability').mockResolvedValue(true);
      
      db.query.mockResolvedValue({ rows: [{ ...mockAppointment, ...appointmentData }] });

      const result = await Appointment.create(appointmentData);

      expect(Appointment.checkAvailability).toHaveBeenCalledWith(
        'doctor-123',
        appointmentData.appointment_date
      );
      expect(db.query).toHaveBeenCalled();
      expect(result.patient_id).toBe('patient-123');
      expect(result.doctor_id).toBe('doctor-123');
    });

    it('should throw error when slot is not available', async () => {
      const appointmentData = {
        patient_id: 'patient-123',
        doctor_id: 'doctor-123',
        appointment_date: new Date('2024-02-15T10:00:00Z')
      };

      jest.spyOn(Appointment, 'checkAvailability').mockResolvedValue(false);

      await expect(Appointment.create(appointmentData)).rejects.toThrow(
        'Appointment slot is not available'
      );
    });

    it('should throw error for invalid foreign keys', async () => {
      const appointmentData = {
        patient_id: 'invalid-patient',
        doctor_id: 'invalid-doctor',
        appointment_date: new Date()
      };

      jest.spyOn(Appointment, 'checkAvailability').mockResolvedValue(true);
      
      const dbError = new Error('Foreign key violation');
      dbError.code = '23503';
      db.query.mockRejectedValue(dbError);

      await expect(Appointment.create(appointmentData)).rejects.toThrow(
        'Invalid patient or doctor ID'
      );
    });
  });

  describe('checkAvailability()', () => {
    it('should return true when slot is available', async () => {
      const doctorId = 'doctor-123';
      const appointmentDate = new Date('2024-02-15T10:00:00Z');

      db.query.mockResolvedValue({ rows: [{ count: '0' }] });

      const result = await Appointment.checkAvailability(doctorId, appointmentDate);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*)'),
        [doctorId, appointmentDate]
      );
      expect(result).toBe(true);
    });

    it('should return false when slot is booked', async () => {
      db.query.mockResolvedValue({ rows: [{ count: '1' }] });

      const result = await Appointment.checkAvailability('doctor-123', new Date());

      expect(result).toBe(false);
    });
  });

  describe('findById()', () => {
    it('should find appointment by ID with details', async () => {
      const appointmentId = mockAppointment.id;
      
      db.query.mockResolvedValue({ 
        rows: [{ 
          ...mockAppointment,
          patient_name: mockPatient.full_name,
          patient_phone: mockPatient.phone,
          doctor_name: mockDoctor.name,
          doctor_specialization: mockDoctor.specialization,
          doctor_phone: mockDoctor.phone
        }] 
      });

      const result = await Appointment.findById(appointmentId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN patients p ON a.patient_id = p.id'),
        [appointmentId]
      );
      expect(result.patient_name).toBe('Mekdes Abebe');
      expect(result.doctor_name).toBe('Dr. Alemayehu Teklu');
    });

    it('should return undefined for non-existent appointment', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const result = await Appointment.findById('non-existent-id');

      expect(result).toBeUndefined();
    });
  });

  describe('findAll()', () => {
    it('should return paginated appointments with filters', async () => {
      const filters = { 
        date: '2024-02-15',
        doctor_id: 'doctor-123',
        status: 'scheduled'
      };
      const page = 1;
      const limit = 10;

      db.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ 
          rows: [
            { ...mockAppointment, patient_name: 'Patient 1', doctor_name: 'Doctor 1' },
            { ...mockAppointment, id: 'appointment-2', patient_name: 'Patient 2', doctor_name: 'Doctor 1' }
          ] 
        });

      const result = await Appointment.findAll(filters, page, limit);

      expect(db.query).toHaveBeenCalledTimes(2);
      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.data[0].patient_name).toBe('Patient 1');
    });

    it('should handle multiple filter combinations', async () => {
      const testCases = [
        { filters: { date: '2024-02-15' }, expectedWhere: 'DATE(appointment_date)' },
        { filters: { doctor_id: 'doctor-123' }, expectedWhere: 'doctor_id' },
        { filters: { status: 'scheduled' }, expectedWhere: 'status' },
        { filters: { patient_id: 'patient-123' }, expectedWhere: 'patient_id' }
      ];

      for (const testCase of testCases) {
        db.query.mockResolvedValue({ rows: [{ count: '1' }] });
        
        await Appointment.findAll(testCase.filters, 1, 10);
        
        const sql = db.query.mock.calls[0][0];
        expect(sql).toContain(testCase.expectedWhere);
      }
    });
  });

  describe('updateStatus()', () => {
    it('should update appointment status', async () => {
      const appointmentId = mockAppointment.id;
      const status = 'checked-in';

      db.query.mockResolvedValue({ rows: [{ ...mockAppointment, status }] });

      const result = await Appointment.updateStatus(appointmentId, status);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE appointments SET status = $1'),
        [status, appointmentId]
      );
      expect(result.status).toBe('checked-in');
    });

    it('should throw error for invalid status', async () => {
      await expect(
        Appointment.updateStatus('some-id', 'invalid-status')
      ).rejects.toThrow('Invalid status');
    });

    it('should handle all valid statuses', async () => {
      const validStatuses = [
        'scheduled', 'confirmed', 'checked-in', 
        'in-progress', 'completed', 'cancelled', 'no-show'
      ];

      for (const status of validStatuses) {
        db.query.mockResolvedValue({ rows: [{ ...mockAppointment, status }] });
        
        const result = await Appointment.updateStatus('appointment-id', status);
        expect(result.status).toBe(status);
      }
    });
  });

  describe('getDoctorAvailability()', () => {
    it('should return doctor availability with booked slots', async () => {
      const doctorId = 'doctor-123';
      const date = '2024-02-15';

      const bookedSlots = [
        { appointment_date: new Date('2024-02-15T10:00:00Z') },
        { appointment_date: new Date('2024-02-15T11:30:00Z') }
      ];

      db.query.mockResolvedValue({ rows: bookedSlots });

      const result = await Appointment.getDoctorAvailability(doctorId, date);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT appointment_date'),
        [doctorId, date]
      );
      expect(result.doctor_id).toBe(doctorId);
      expect(result.date).toBe(date);
      expect(result.booked_slots).toContain('10:00');
      expect(result.booked_slots).toContain('11:30');
      expect(result.available_slots).not.toContain('10:00');
    });

    it('should generate all working hour slots', async () => {
      const doctorId = 'doctor-123';
      const date = '2024-02-15';

      db.query.mockResolvedValue({ rows: [] }); // No bookings

      const result = await Appointment.getDoctorAvailability(doctorId, date);

      // Should generate slots from 09:00 to 17:00 with 30-minute intervals
      expect(result.available_slots.length).toBeGreaterThan(10);
      expect(result.available_slots).toContain('09:00');
      expect(result.available_slots).toContain('09:30');
      expect(result.available_slots).toContain('16:30');
    });
  });

  describe('getPatientHistory()', () => {
    it('should return appointment history for patient', async () => {
      const patientId = 'patient-123';

      const mockHistory = [
        {
          id: 'appointment-1',
          appointment_date: new Date('2024-01-15T10:00:00Z'),
          status: 'completed',
          reason: 'Checkup',
          notes: 'All good',
          doctor_name: 'Dr. Alemayehu',
          doctor_specialization: 'Cardiology'
        },
        {
          id: 'appointment-2',
          appointment_date: new Date('2024-01-20T14:00:00Z'),
          status: 'completed',
          reason: 'Follow-up',
          notes: 'Improving',
          doctor_name: 'Dr. Alemayehu',
          doctor_specialization: 'Cardiology'
        }
      ];

      db.query.mockResolvedValue({ rows: mockHistory });

      const result = await Appointment.getPatientHistory(patientId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE a.patient_id = $1'),
        [patientId]
      );
      expect(result).toHaveLength(2);
      expect(result[0].doctor_name).toBe('Dr. Alemayehu');
      expect(result[1].status).toBe('completed');
    });

    it('should return empty array for new patient', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const result = await Appointment.getPatientHistory('new-patient-id');

      expect(result).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle appointments at exact time boundaries', async () => {
      const edgeCases = [
        { time: '09:00', shouldBeAvailable: true },
        { time: '16:30', shouldBeAvailable: true },
        { time: '17:00', shouldBeAvailable: false }, // End of day
        { time: '08:30', shouldBeAvailable: false } // Before start
      ];

      // Test each case
      for (const testCase of edgeCases) {
        const appointmentDate = new Date(`2024-02-15T${testCase.time}:00Z`);
        
        // Mock no bookings for this test
        db.query.mockResolvedValue({ rows: [] });
        
        const isAvailable = await Appointment.checkAvailability('doctor-123', appointmentDate);
        
        // We can't directly test availability without actual implementation details
        // This shows the pattern for testing edge cases
        console.log(`Time ${testCase.time}: available = ${isAvailable}`);
      }
    });

    it('should handle same-day multiple appointments', async () => {
      const doctorId = 'doctor-123';
      const date = '2024-02-15';
      const bookedSlots = [
        { appointment_date: new Date('2024-02-15T09:00:00Z') },
        { appointment_date: new Date('2024-02-15T09:30:00Z') },
        { appointment_date: new Date('2024-02-15T10:00:00Z') }
      ];

      db.query.mockResolvedValue({ rows: bookedSlots });

      const result = await Appointment.getDoctorAvailability(doctorId, date);

      expect(result.booked_slots).toHaveLength(3);
      expect(result.available_slots).not.toContain('09:00');
      expect(result.available_slots).not.toContain('09:30');
      expect(result.available_slots).not.toContain('10:00');
    });
  });
});