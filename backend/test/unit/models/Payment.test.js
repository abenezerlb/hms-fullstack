const Payment = require('../../../models/Payment');
const Bill = require('../../../models/Bill');
const db = require('../../../config/database');

// Mock the Bill model
jest.mock('../../../models/Bill');

describe('Payment Model', () => {
  const mockPayment = {
    id: '123e4567-e89b-12d3-a456-426614174005',
    bill_id: 'bill-123',
    transaction_id: 'ET24120001',
    amount: 2357.50,
    currency: 'ETB',
    payment_method: 'mobile_money',
    payment_gateway: 'telebirr',
    gateway_reference: 'TBR123456',
    status: 'pending',
    metadata: {
      phone: '+251911234567',
      bill_number: 'INV-20240130-001'
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const mockBill = {
    id: 'bill-123',
    bill_number: 'INV-20240130-001',
    patient_id: 'patient-123',
    total_amount: 2357.50,
    payment_status: 'pending'
  };

  const mockPatient = {
    id: 'patient-123',
    full_name: 'Mekdes Abebe',
    phone: '+251911234567'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(global.Math, 'random').mockReturnValue(0.123);
  });

  afterEach(() => {
    jest.spyOn(global.Math, 'random').mockRestore();
  });

  describe('create()', () => {
    it('should create a new payment record', async () => {
      const paymentData = {
        bill_id: 'bill-123',
        amount: 2357.50,
        payment_method: 'mobile_money',
        payment_gateway: 'telebirr',
        gateway_reference: 'TBR123456',
        metadata: { phone: '+251911234567' }
      };

      // Mock transaction ID generation
      const mockTransactionId = 'TBR241200123';
      
      db.query.mockResolvedValue({ rows: [{ ...mockPayment, ...paymentData, transaction_id: mockTransactionId }] });

      const result = await Payment.create(paymentData);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payments'),
        expect.arrayContaining([
          'bill-123', expect.stringMatching(/^TBR\d+$/), 2357.50, 'mobile_money', 'telebirr'
        ])
      );
      expect(result.transaction_id).toBeDefined();
      expect(result.amount).toBe(2357.50);
      expect(result.payment_method).toBe('mobile_money');
    });

    it('should generate transaction ID based on gateway', async () => {
      const testCases = [
        { gateway: 'telebirr', expectedPrefix: 'TBR' },
        { gateway: 'cbebirr', expectedPrefix: 'CBE' },
        { gateway: 'hellocash', expectedPrefix: 'HLC' },
        { gateway: 'amole', expectedPrefix: 'AML' },
        { gateway: null, expectedPrefix: 'ET' }
      ];

      for (const testCase of testCases) {
        const paymentData = {
          bill_id: 'bill-123',
          amount: 100,
          payment_method: 'mobile_money',
          payment_gateway: testCase.gateway
        };

        await Payment.create(paymentData);
        
        const transactionId = db.query.mock.calls[0][1][1]; // Second parameter is transaction_id
        expect(transactionId.startsWith(testCase.expectedPrefix)).toBe(true);
        
        jest.clearAllMocks();
      }
    });

    it('should throw error for invalid bill ID', async () => {
      const paymentData = {
        bill_id: 'invalid-bill',
        amount: 100,
        payment_method: 'cash'
      };

      const dbError = new Error('Foreign key violation');
      dbError.code = '23503';
      db.query.mockRejectedValue(dbError);

      await expect(Payment.create(paymentData)).rejects.toThrow('Invalid bill ID');
    });
  });

  describe('generateTransactionId()', () => {
    it('should generate unique transaction IDs', () => {
      // Test is static method, so we need to call it through class
      // Since it's not exported, we'll test the pattern through create()
      // This shows how we'd test if it was exported
      
      const now = new Date('2024-01-30T10:30:00Z');
      jest.useFakeTimers().setSystemTime(now);
      
      // The method uses Date.now() which we've mocked
      // We'll test the pattern indirectly through the create method
      
      const paymentData = {
        bill_id: 'bill-123',
        amount: 100,
        payment_method: 'mobile_money',
        payment_gateway: 'telebirr'
      };

      db.query.mockResolvedValue({ rows: [mockPayment] });

      // Call create which uses generateTransactionId internally
      Payment.create(paymentData);
      
      const transactionId = db.query.mock.calls[0][1][1];
      
      // Pattern: TBR + year(24) + timestamp + random
      expect(transactionId).toMatch(/^TBR24\d{6}123$/);
      
      jest.useRealTimers();
    });
  });

  describe('findByTransactionId()', () => {
    it('should find payment by transaction ID with bill and patient details', async () => {
      const transactionId = 'ET24120001';
      
      db.query.mockResolvedValue({ 
        rows: [{ 
          ...mockPayment,
          bill_number: mockBill.bill_number,
          patient_id: mockBill.patient_id,
          patient_name: mockPatient.full_name,
          patient_phone: mockPatient.phone
        }] 
      });

      const result = await Payment.findByTransactionId(transactionId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN bills b ON p.bill_id = b.id'),
        [transactionId]
      );
      expect(result.transaction_id).toBe(transactionId);
      expect(result.bill_number).toBe('INV-20240130-001');
      expect(result.patient_name).toBe('Mekdes Abebe');
    });

    it('should return undefined for non-existent transaction', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const result = await Payment.findByTransactionId('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('findByBillId()', () => {
    it('should return all payments for a bill', async () => {
      const billId = 'bill-123';
      
      const mockPayments = [
        { ...mockPayment, id: 'payment-1', amount: 1000 },
        { ...mockPayment, id: 'payment-2', amount: 1357.50 }
      ];

      db.query.mockResolvedValue({ rows: mockPayments });

      const result = await Payment.findByBillId(billId);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE bill_id = $1'),
        [billId]
      );
      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(1000);
      expect(result[1].amount).toBe(1357.50);
    });

    it('should return empty array for bill with no payments', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const result = await Payment.findByBillId('new-bill-id');

      expect(result).toEqual([]);
    });
  });

  describe('updateStatus()', () => {
    it('should update payment status', async () => {
      const transactionId = 'ET24120001';
      const status = 'completed';
      const gatewayResponse = { receipt: 'REC-123' };

      const updatedPayment = { ...mockPayment, status, metadata: { gateway_response: gatewayResponse } };
      db.query.mockResolvedValue({ rows: [updatedPayment] });

      const result = await Payment.updateStatus(transactionId, status, gatewayResponse);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payments SET status = $1'),
        expect.arrayContaining([status, transactionId])
      );
      expect(result.status).toBe('completed');
      expect(result.metadata.gateway_response.receipt).toBe('REC-123');
    });

    it('should update metadata with gateway response', async () => {
      const transactionId = 'ET24120001';
      const gatewayResponse = { 
        status_amharic: 'ተጠናቅቋል',
        receipt_number: 'REC-ET241200'
      };

      db.query.mockResolvedValue({ rows: [{ ...mockPayment, metadata: { gateway_response: gatewayResponse } }] });

      await Payment.updateStatus(transactionId, 'completed', gatewayResponse);

      const sql = db.query.mock.calls[0][0];
      expect(sql).toContain("metadata = COALESCE(metadata, '{}'::jsonb) || $");
    });

    it('should throw error for invalid status', async () => {
      await expect(
        Payment.updateStatus('transaction-id', 'invalid-status')
      ).rejects.toThrow('Invalid payment status');
    });

    it('should accept all valid statuses', async () => {
      const validStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded'];

      for (const status of validStatuses) {
        db.query.mockResolvedValue({ rows: [{ ...mockPayment, status }] });
        
        const result = await Payment.updateStatus('transaction-id', status);
        expect(result.status).toBe(status);
      }
    });
  });

  describe('simulatePayment()', () => {
    it('should simulate payment completion for TeleBirr', async () => {
      const transactionId = 'TBR24120001';
      const status = 'completed';

      const mockPaymentData = {
        ...mockPayment,
        transaction_id: transactionId,
        payment_gateway: 'telebirr',
        bill_id: 'bill-123'
      };

      // Mock findByTransactionId
      jest.spyOn(Payment, 'findByTransactionId').mockResolvedValue(mockPaymentData);
      
      // Mock updateStatus
      jest.spyOn(Payment, 'updateStatus').mockResolvedValue({
        ...mockPaymentData,
        status: 'completed',
        metadata: { gateway_response: {} }
      });

      // Mock Bill.updatePaymentStatus
      Bill.updatePaymentStatus.mockResolvedValue({ ...mockBill, payment_status: 'paid' });

      const result = await Payment.simulatePayment(transactionId, status);

      expect(Payment.findByTransactionId).toHaveBeenCalledWith(transactionId);
      expect(Payment.updateStatus).toHaveBeenCalledWith(
        transactionId,
        'completed',
        expect.objectContaining({
          status_amharic: 'ተጠናቅቋል',
          receipt_number: expect.any(String)
        })
      );
      expect(Bill.updatePaymentStatus).toHaveBeenCalledWith(
        'bill-123',
        'paid',
        'mobile_money',
        expect.any(String)
      );
      expect(result.status).toBe('completed');
    });

    it('should simulate payment failure', async () => {
      const transactionId = 'TBR24120001';
      const status = 'failed';

      const mockPaymentData = {
        ...mockPayment,
        transaction_id: transactionId,
        payment_gateway: 'telebirr'
      };

      jest.spyOn(Payment, 'findByTransactionId').mockResolvedValue(mockPaymentData);
      jest.spyOn(Payment, 'updateStatus').mockResolvedValue({
        ...mockPaymentData,
        status: 'failed'
      });

      const result = await Payment.simulatePayment(transactionId, status);

      expect(result.status).toBe('failed');
      expect(Bill.updatePaymentStatus).not.toHaveBeenCalled(); // Should not update bill on failure
    });

    it('should handle different payment gateways', async () => {
      const gateways = [
        { gateway: 'telebirr', name: 'TeleBirr' },
        { gateway: 'cbebirr', name: 'CBE Birr' },
        { gateway: 'hellocash', name: 'HelloCash' },
        { gateway: 'amole', name: 'Amole' }
      ];

      for (const gateway of gateways) {
        const transactionId = `${gateway.gateway.toUpperCase().substring(0, 3)}24120001`;
        const mockPaymentData = {
          ...mockPayment,
          transaction_id: transactionId,
          payment_gateway: gateway.gateway
        };

        jest.spyOn(Payment, 'findByTransactionId').mockResolvedValue(mockPaymentData);
        jest.spyOn(Payment, 'updateStatus').mockResolvedValue(mockPaymentData);

        await Payment.simulatePayment(transactionId, 'completed');

        // Should handle all gateways without error
        expect(Payment.findByTransactionId).toHaveBeenCalledWith(transactionId);
        
        jest.clearAllMocks();
      }
    });

    it('should throw error for non-existent payment', async () => {
      jest.spyOn(Payment, 'findByTransactionId').mockResolvedValue(null);

      await expect(
        Payment.simulatePayment('non-existent', 'completed')
      ).rejects.toThrow('Payment not found');
    });
  });

  describe('getStatistics()', () => {
    it('should return payment statistics with date range', async () => {
      const dateFrom = '2024-01-01';
      const dateTo = '2024-01-31';

      const mockSummary = [
        {
          total_payments: '10',
          total_received: '25000.00',
          total_pending: '5000.00',
          total_failed: '1000.00',
          mobile_money_count: '8',
          bank_transfer_count: '1',
          cash_count: '1',
          payment_gateway: 'telebirr',
          date: '2024-01-15'
        }
      ];

      const mockDailyStats = [
        {
          date: '2024-01-15',
          count: '5',
          amount: '12500.00',
          methods: ['mobile_money', 'cash']
        }
      ];

      db.query
        .mockResolvedValueOnce({ rows: mockSummary })
        .mockResolvedValueOnce({ rows: mockDailyStats });

      const result = await Payment.getStatistics(dateFrom, dateTo);

      expect(db.query).toHaveBeenCalledTimes(2);
      expect(result.summary).toBeDefined();
      expect(result.daily_stats).toBeDefined();
      
      // Check date range in query
      const firstCallSql = db.query.mock.calls[0][0];
      expect(firstCallSql).toContain('BETWEEN $1 AND $2');
    });

    it('should return payment statistics without date range', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await Payment.getStatistics();

      expect(db.query).toHaveBeenCalledTimes(2);
      const firstCallSql = db.query.mock.calls[0][0];
      expect(firstCallSql).not.toContain('BETWEEN');
    });

    it('should aggregate statistics correctly', async () => {
      const mockSummary = [
        { total_payments: '5', total_received: '10000', payment_gateway: 'telebirr' },
        { total_payments: '3', total_received: '5000', payment_gateway: 'cbebirr' }
      ];

      db.query
        .mockResolvedValueOnce({ rows: mockSummary })
        .mockResolvedValueOnce({ rows: [] });

      const result = await Payment.getStatistics();

      // The method aggregates across multiple rows
      // We're testing it doesn't error with multiple rows
      expect(result.summary).toHaveLength(2);
    });
  });

  describe('verifyPayment()', () => {
    it('should verify payment status', async () => {
      const transactionId = 'ET24120001';
      
      const mockPaymentData = {
        ...mockPayment,
        status: 'completed',
        amount: 2357.50,
        currency: 'ETB'
      };

      jest.spyOn(Payment, 'findByTransactionId').mockResolvedValue(mockPaymentData);

      const result = await Payment.verifyPayment(transactionId);

      expect(Payment.findByTransactionId).toHaveBeenCalledWith(transactionId);
      expect(result.transaction_id).toBe(transactionId);
      expect(result.status).toBe('completed');
      expect(result.is_verified).toBe(true);
      expect(result.verified_at).toBeDefined();
    });

    it('should return not verified for pending payments', async () => {
      const transactionId = 'ET24120001';
      
      const pendingPayment = {
        ...mockPayment,
        status: 'pending'
      };

      jest.spyOn(Payment, 'findByTransactionId').mockResolvedValue(pendingPayment);

      const result = await Payment.verifyPayment(transactionId);

      expect(result.is_verified).toBe(false);
      expect(result.next_steps).toContain('pending');
    });

    it('should throw error for non-existent payment', async () => {
      jest.spyOn(Payment, 'findByTransactionId').mockResolvedValue(null);

      await expect(
        Payment.verifyPayment('non-existent')
      ).rejects.toThrow('Payment not found');
    });
  });

  describe('Edge Cases', () => {
    it('should handle payment amount mismatch with bill', async () => {
      // This would be handled at application level
      // Payment can be partial or multiple payments per bill
      const partialPayment = {
        bill_id: 'bill-123',
        amount: 1000.00, // Partial payment
        payment_method: 'mobile_money'
      };

      db.query.mockResolvedValue({ rows: [{ ...mockPayment, ...partialPayment }] });

      const result = await Payment.create(partialPayment);

      expect(result.amount).toBe(1000.00);
      // Should allow partial payments
    });

    it('should handle metadata with special characters', async () => {
      const paymentData = {
        bill_id: 'bill-123',
        amount: 100,
        payment_method: 'mobile_money',
        metadata: {
          phone: '+251911234567',
          note: 'Payment with special chars: አማርኛ & English',
          receipt: 'REC-123/456'
        }
      };

      db.query.mockResolvedValue({ rows: [{ ...mockPayment, ...paymentData }] });

      const result = await Payment.create(paymentData);

      // Should handle Unicode and special characters in metadata
      expect(result.metadata.note).toContain('አማርኛ');
    });

    it('should handle concurrent payment attempts', async () => {
      // This tests the unique constraint on transaction_id
      const paymentData = {
        bill_id: 'bill-123',
        amount: 100,
        payment_method: 'cash'
      };

      const dbError = new Error('Unique violation');
      dbError.code = '23505';
      db.query.mockRejectedValue(dbError);

      await expect(Payment.create(paymentData)).rejects.toThrow();
      // Should handle duplicate transaction IDs gracefully
    });
  });
});