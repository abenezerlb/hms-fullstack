const Patient = require('../../../models/Patient');
const db = require('../../../config/database');

describe('Patient Model', () => {
  const mockPatient = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    full_name: 'Mekdes Abebe',
    gender: 'female',
    date_of_birth: '1990-05-15',
    phone: '+251911234567',
    email: 'mekdes@email.com',
    address: 'Addis Ababa, Bole',
    emergency_contact: '+251912345678',
    blood_type: 'O+',
    allergies: 'Penicillin',
    created_at: new Date().toISOString(),
    last_visit: new Date().toISOString()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('should create a new patient', async () => {
      const patientData = {
        full_name: 'New Patient',
        gender: 'male',
        date_of_birth: '1985-11-22',
        phone: '+251912345678',
        email: 'new@email.com',
        address: 'Addis Ababa',
        emergency_contact: '+251911111111',
        blood_type: 'A+',
        allergies: 'None'
      };

      db.query.mockResolvedValue({ rows: [{ ...mockPatient, ...patientData }] });

      const result = await Patient.create(patientData);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO patients'),
        expect.arrayContaining([
          'New Patient', 'male', '1985-11-22', '+251912345678'
        ])
      );
      expect(result.full_name).toBe('New Patient');
      expect(result.phone).toBe('+251912345678');
    });

    it('should throw error for duplicate phone number', async () => {
      const patientData = {
        full_name: 'Duplicate Patient',
        gender: 'female',
        date_of_birth: '1995-03-08',
        phone: '+251911234567' // Existing phone
      };

      const dbError = new Error('Unique violation');
      dbError.code = '23505';
      db.query.mockRejectedValue(dbError);

      await expect(Patient.create(patientData)).rejects.toThrow(
        'Phone number already registered'
      );
    });
  });

  describe('findById()', () => {
    it('should find patient by ID', async () => {
      const patientId = mockPatient.id;
      db.query.mockResolvedValue({ rows: [mockPatient] });

      const result = await Patient.findById(patientId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM patients WHERE id = $1'),
        [patientId]
      );
      expect(result).toEqual(mockPatient);
    });

    it('should return undefined for non-existent patient', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const result = await Patient.findById('non-existent-id');

      expect(result).toBeUndefined();
    });
  });

  describe('findByPhone()', () => {
    it('should find patient by phone number', async () => {
      const phone = '+251911234567';
      db.query.mockResolvedValue({ rows: [mockPatient] });

      const result = await Patient.findByPhone(phone);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM patients WHERE phone = $1'),
        [phone]
      );
      expect(result.phone).toBe(phone);
    });
  });

  describe('findAll()', () => {
    it('should return paginated patients with search filter', async () => {
      const filters = { search: 'Mekdes', gender: 'female' };
      const page = 1;
      const limit = 10;

      db.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: [mockPatient, { ...mockPatient, id: 'patient-2' }] });

      const result = await Patient.findAll(filters, page, limit);

      expect(db.query).toHaveBeenCalledTimes(2);
      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
    });

    it('should handle empty search results', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await Patient.findAll({ search: 'nonexistent' }, 1, 10);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('update()', () => {
    it('should update patient information', async () => {
      const patientId = mockPatient.id;
      const updateData = {
        address: 'New Address, Addis Ababa',
        emergency_contact: '+251999999999',
        allergies: 'Added new allergy'
      };

      const updatedPatient = { ...mockPatient, ...updateData };
      db.query.mockResolvedValue({ rows: [updatedPatient] });

      const result = await Patient.update(patientId, updateData);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE patients'),
        expect.arrayContaining([
          'New Address, Addis Ababa',
          '+251999999999',
          'Added new allergy',
          patientId
        ])
      );
      expect(result.address).toBe('New Address, Addis Ababa');
    });

    it('should throw error for duplicate phone update', async () => {
      const updateData = { phone: '+251911234567' }; // Existing phone
      const dbError = new Error('Unique violation');
      dbError.code = '23505';
      db.query.mockRejectedValue(dbError);

      await expect(Patient.update('some-id', updateData)).rejects.toThrow(
        'Phone number already registered to another patient'
      );
    });
  });

  describe('getStatistics()', () => {
    it('should return patient statistics', async () => {
      const patientId = mockPatient.id;
      
      db.query
        .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // Appointments
        .mockResolvedValueOnce({ 
          rows: [{ 
            total_bills: '3', 
            total_paid: '4500.00', 
            pending_amount: '500.00' 
          }] 
        }) // Bills
        .mockResolvedValueOnce({ rows: [{ last_visit: '2024-01-29T14:30:00Z' }] }); // Last visit

      const result = await Patient.getStatistics(patientId);

      expect(db.query).toHaveBeenCalledTimes(3);
      expect(result.total_appointments).toBe(5);
      expect(result.total_bills).toBe(3);
      expect(result.total_paid).toBe(4500);
      expect(result.pending_amount).toBe(500);
      expect(result.last_visit).toBe('2024-01-29T14:30:00Z');
    });
  });
});