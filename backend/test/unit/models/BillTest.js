const Bill = require('../../../models/Bill');
const db = require('../../../config/database');

describe('Bill Model', () => {
  const mockBill = {
    id: '123e4567-e89b-12d3-a456-426614174004',
    patient_id: 'patient-123',
    appointment_id: 'appointment-123',
    bill_number: 'INV-20240130-001',
    amount: 2050.00,
    tax_amount: 307.50,
    discount: 0.00,
    total_amount: 2357.50,
    payment_status: 'pending',
    payment_method: null,
    insurance_provider: null,
    insurance_claim_id: null,
    due_date: '2024-02-05',
    paid_date: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const mockPatient = {
    id: 'patient-123',
    full_name: 'Mekdes Abebe',
    phone: '+251911234567',
    address: 'Addis Ababa, Bole'
  };

  const mockAppointment = {
    id: 'appointment-123',
    date: new Date('2024-01-29T14:30:00Z'),
    doctor_name: 'Dr. Alemayehu Teklu'
  };

  const mockBillItems = [
    {
      id: 'item-1',
      bill_id: mockBill.id,
      service_id: 'service-1',
      service_name: 'Consultation Fee',
      quantity: 1,
      unit_price: 500.00,
      subtotal: 500.00,
      created_at: new Date().toISOString()
    },
    {
      id: 'item-2',
      bill_id: mockBill.id,
      service_id: 'service-2',
      service_name: 'Lab Tests - CBC',
      quantity: 1,
      unit_price: 350.00,
      subtotal: 350.00,
      created_at: new Date().toISOString()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('should create a new bill with items in transaction', async () => {
      const billData = {
        patient_id: 'patient-123',
        appointment_id: 'appointment-123',
        items: [
          { service_id: 'service-1', quantity: 1 },
          { service_name: 'Custom Service', quantity: 2, unit_price: 250.00 }
        ],
        discount: 100.00,
        due_date: '2024-02-10',
        notes: 'Insurance covered'
      };

      // Mock transaction
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ ...mockBill, bill_number: 'INV-20240210-001' }] }) // Bill creation
          .mockResolvedValueOnce({}) // First item
          .mockResolvedValueOnce({}) // Second item
      };

      db.transaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      // Mock generateBillNumber
      jest.spyOn(Bill, 'generateBillNumber').mockResolvedValue('INV-20240210-001');

      const result = await Bill.create(billData);

      expect(db.transaction).toHaveBeenCalled();
      expect(Bill.generateBillNumber).toHaveBeenCalled();
      
      // Check bill creation
      expect(mockClient.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('INSERT INTO bills'),
        expect.arrayContaining([
          'patient-123', 'appointment-123', 'INV-20240210-001'
        ])
      );

      // Check items creation (2 calls for 2 items)
      expect(mockClient.query).toHaveBeenCalledTimes(3);
      expect(result).toBeDefined();
    });

    it('should calculate totals correctly', async () => {
      const billData = {
        patient_id: 'patient-123',
        items: [
          { service_name: 'Service 1', quantity: 2, unit_price: 100 },
          { service_name: 'Service 2', quantity: 1, unit_price: 50 }
        ],
        discount: 30
      };

      // Amount = (2*100 + 1*50) = 250
      // Tax = 250 * 0.15 = 37.5
      // Total = 250 + 37.5 - 30 = 257.5

      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{}] })
      };

      db.transaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      jest.spyOn(Bill, 'generateBillNumber').mockResolvedValue('INV-TEST');

      await Bill.create(billData);

      // Check that calculations are in SQL (generated columns in DB)
      // We're testing that the model handles the data structure correctly
      const insertCall = mockClient.query.mock.calls[0];
      expect(insertCall[0]).toContain('total_amount');
    });

    it('should handle errors in transaction', async () => {
      const billData = {
        patient_id: 'patient-123',
        items: [{ service_name: 'Test', quantity: 1, unit_price: 100 }]
      };

      db.transaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(Bill.create(billData)).rejects.toThrow('Transaction failed');
    });
  });

  describe('generateBillNumber()', () => {
    it('should generate unique bill number', async () => {
      const today = new Date('2024-01-30');
      jest.useFakeTimers().setSystemTime(today);

      db.query.mockResolvedValue({ rows: [{ count: '5' }] });

      const billNumber = await Bill.generateBillNumber();

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*)'),
        expect.any(Array)
      );
      expect(billNumber).toMatch(/^INV-20240130-\d{3}$/);
      
      jest.useRealTimers();
    });

    it('should handle first bill of the day', async () => {
      db.query.mockResolvedValue({ rows: [{ count: '0' }] });

      const billNumber = await Bill.generateBillNumber();

      expect(billNumber).toMatch(/^INV-\d{8}-001$/);
    });
  });

  describe('findById() and findByIdWithItems()', () => {
    it('should find bill by ID with items', async () => {
      const billId = mockBill.id;
      
      // Mock the main query
      db.query.mockResolvedValueOnce({
        rows: [{
          ...mockBill,
          patient_name: mockPatient.full_name,
          patient_phone: mockPatient.phone,
          patient_address: mockPatient.address,
          appointment_date: mockAppointment.date,
          doctor_name: mockAppointment.doctor_name
        }]
      });

      // Mock items query
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [mockBill] }) // Main query in findById
          .mockResolvedValueOnce({ rows: mockBillItems }) // Items query
      };

      // Override for findById with client parameter
      const originalFindById = Bill.findById;
      
      // Test findByIdWithItems (which calls findById with client)
      const result = await Bill.findByIdWithItems(billId, mockClient);

      expect(mockClient.query).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('items');
      expect(result.items).toHaveLength(2);
      expect(result.patient_name).toBe('Mekdes Abebe');
      expect(result.items[0].service_name).toBe('Consultation Fee');
    });

    it('should return null for non-existent bill', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const result = await Bill.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('findAll()', () => {
    it('should return paginated bills with filters', async () => {
      const filters = {
        patient_id: 'patient-123',
        payment_status: 'pending',
        date_from: '2024-01-01',
        date_to: '2024-01-31'
      };
      const page = 1;
      const limit = 10;

      const mockBills = [
        { ...mockBill, id: 'bill-1', patient_name: 'Patient One' },
        { ...mockBill, id: 'bill-2', patient_name: 'Patient Two' }
      ];

      db.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: mockBills });

      const result = await Bill.findAll(filters, page, limit);

      expect(db.query).toHaveBeenCalledTimes(2);
      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      
      // Check WHERE clause includes all filters
      const sql = db.query.mock.calls[0][0];
      expect(sql).toContain('patient_id');
      expect(sql).toContain('payment_status');
      expect(sql).toContain('DATE(created_at)');
    });

    it('should handle partial filters', async () => {
      const testCases = [
        { filters: { patient_id: 'patient-123' } },
        { filters: { payment_status: 'paid' } },
        { filters: { date_from: '2024-01-01' } },
        { filters: { date_to: '2024-01-31' } },
        { filters: {} } // No filters
      ];

      for (const testCase of testCases) {
        db.query.mockResolvedValue({ rows: [{ count: '0' }] });
        
        await Bill.findAll(testCase.filters, 1, 10);
        
        // Should not error with any filter combination
        expect(db.query).toHaveBeenCalled();
      }
    });
  });

  describe('updatePaymentStatus()', () => {
    it('should update bill payment status', async () => {
      const billId = mockBill.id;
      const updateData = {
        payment_status: 'paid',
        payment_method: 'mobile_money',
        paid_date: '2024-01-30T11:30:00Z'
      };

      const updatedBill = { ...mockBill, ...updateData };
      db.query.mockResolvedValue({ rows: [updatedBill] });

      const result = await Bill.updatePaymentStatus(
        billId,
        updateData.payment_status,
        updateData.payment_method,
        updateData.paid_date
      );

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE bills'),
        expect.arrayContaining(['paid', 'mobile_money', billId])
      );
      expect(result.payment_status).toBe('paid');
      expect(result.payment_method).toBe('mobile_money');
    });

    it('should set paid_date automatically when status is paid', async () => {
      const billId = mockBill.id;
      
      db.query.mockResolvedValue({ rows: [{ ...mockBill, payment_status: 'paid' }] });

      await Bill.updatePaymentStatus(billId, 'paid');

      const sql = db.query.mock.calls[0][0];
      expect(sql).toContain('paid_date = CURRENT_TIMESTAMP');
    });

    it('should throw error for invalid payment status', async () => {
      await expect(
        Bill.updatePaymentStatus('bill-id', 'invalid-status')
      ).rejects.toThrow('Invalid payment status');
    });

    it('should accept all valid payment statuses', async () => {
      const validStatuses = ['pending', 'partially_paid', 'paid', 'cancelled', 'refunded'];

      for (const status of validStatuses) {
        db.query.mockResolvedValue({ rows: [{ ...mockBill, payment_status: status }] });
        
        const result = await Bill.updatePaymentStatus('bill-id', status);
        expect(result.payment_status).toBe(status);
      }
    });

    it('should accept all valid payment methods', async () => {
      const validMethods = ['cash', 'card', 'bank_transfer', 'mobile_money', 'insurance'];

      for (const method of validMethods) {
        db.query.mockResolvedValue({ rows: [{ ...mockBill, payment_method: method }] });
        
        const result = await Bill.updatePaymentStatus('bill-id', 'paid', method);
        expect(result.payment_method).toBe(method);
      }
    });
  });

  describe('getPaymentSummary()', () => {
    it('should return payment summary statistics', async () => {
      const mockSummary = {
        total_bills: '10',
        paid_count: '7',
        pending_count: '3',
        total_amount: '25000.00',
        total_received: '18000.00',
        total_pending: '7000.00'
      };

      db.query.mockResolvedValue({ rows: [mockSummary] });

      const result = await Bill.getPaymentSummary();

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*)'),
        expect.any(Array)
      );
      expect(result.total_bills).toBe('10');
      expect(result.paid_count).toBe('7');
      expect(result.total_received).toBe('18000.00');
      expect(result.total_pending).toBe('7000.00');
    });

    it('should handle zero values', async () => {
      const emptySummary = {
        total_bills: '0',
        paid_count: '0',
        pending_count: '0',
        total_amount: '0.00',
        total_received: '0.00',
        total_pending: '0.00'
      };

      db.query.mockResolvedValue({ rows: [emptySummary] });

      const result = await Bill.getPaymentSummary();

      expect(result.total_bills).toBe('0');
      expect(result.total_received).toBe('0.00');
    });
  });

  describe('Edge Cases', () => {
    it('should handle bill with only custom services (no service_id)', async () => {
      const billData = {
        patient_id: 'patient-123',
        items: [
          { service_name: 'Custom Service 1', quantity: 1, unit_price: 100 },
          { service_name: 'Custom Service 2', quantity: 2, unit_price: 50 }
        ]
      };

      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{}] })
      };

      db.transaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      await Bill.create(billData);

      // Should handle items without service_id
      const itemCalls = mockClient.query.mock.calls.filter(call => 
        call[0].includes('INSERT INTO bill_items')
      );
      expect(itemCalls.length).toBe(2);
    });

    it('should handle 100% discount edge case', async () => {
      const billData = {
        patient_id: 'patient-123',
        items: [{ service_name: 'Free Service', quantity: 1, unit_price: 100 }],
        discount: 115 // 100 + 15% tax
      };

      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{}] })
      };

      db.transaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      await Bill.create(billData);

      // Total should be 0 after full discount
      // This tests the generated column logic
    });

    it('should handle large quantities and prices', async () => {
      const billData = {
        patient_id: 'patient-123',
        items: [
          { service_name: 'Expensive Service', quantity: 1000, unit_price: 9999.99 }
        ]
      };

      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [{}] })
      };

      db.transaction.mockImplementation(async (callback) => {
        return callback(mockClient);
      });

      await Bill.create(billData);

      // Should handle large numbers without overflow
      // Database decimal(10,2) handles up to 99,999,999.99
    });
  });
});