const User = require('../../../models/User');
const db = require('../../../config/database');
const bcrypt = require('bcryptjs');

// Mock data
const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Test Doctor',
  email: 'doctor@test.com',
  password: 'hashed-password',
  role: 'doctor',
  specialization: 'Cardiology',
  phone: '+251911111111',
  department: 'Cardiology',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

describe('User Model', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('should create a new user successfully', async () => {
      // Arrange
      const userData = {
        name: 'New Doctor',
        email: 'newdoctor@test.com',
        password: 'password123',
        role: 'doctor',
        specialization: 'General Medicine',
        phone: '+251922222222',
        department: 'OPD'
      };

      // Mock bcrypt.hash
      bcrypt.hash.mockResolvedValue('hashed-password-123');

      // Mock database query
      db.query.mockResolvedValue({
        rows: [{
          ...mockUser,
          ...userData,
          password: 'hashed-password-123'
        }]
      });

      // Act
      const result = await User.create(userData);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          'New Doctor',
          'newdoctor@test.com',
          'hashed-password-123',
          'doctor',
          'General Medicine',
          '+251922222222',
          'OPD'
        ])
      );

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name', 'New Doctor');
      expect(result).toHaveProperty('email', 'newdoctor@test.com');
      expect(result).toHaveProperty('role', 'doctor');
      expect(result.password).toBeUndefined(); // Password should not be returned
    });

    it('should throw error when email already exists', async () => {
      // Arrange
      const userData = {
        name: 'Existing Doctor',
        email: 'existing@test.com',
        password: 'password123',
        role: 'doctor'
      };

      // Mock database error (PostgreSQL unique violation)
      const dbError = new Error('Unique violation');
      dbError.code = '23505';

      db.query.mockRejectedValue(dbError);

      // Act & Assert
      await expect(User.create(userData)).rejects.toThrow('Email already exists');
    });

    it('should handle database errors', async () => {
      // Arrange
      const userData = {
        name: 'Test User',
        email: 'test@test.com',
        password: 'password123',
        role: 'doctor'
      };

      db.query.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(User.create(userData)).rejects.toThrow('Database connection failed');
    });
  });

  describe('findByEmail()', () => {
    it('should find user by email', async () => {
      // Arrange
      const email = 'doctor@test.com';
      
      db.query.mockResolvedValue({
        rows: [mockUser]
      });

      // Act
      const result = await User.findByEmail(email);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users'),
        [email]
      );
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      // Arrange
      db.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await User.findByEmail('nonexistent@test.com');

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('findById()', () => {
    it('should find user by ID without password', async () => {
      // Arrange
      const userId = mockUser.id;
      
      db.query.mockResolvedValue({
        rows: [{
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
          specialization: mockUser.specialization,
          phone: mockUser.phone,
          department: mockUser.department,
          is_active: mockUser.is_active,
          created_at: mockUser.created_at,
          updated_at: mockUser.updated_at
        }]
      });

      // Act
      const result = await User.findById(userId);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, name, email'),
        [userId]
      );
      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('id', userId);
    });
  });

  describe('findAll()', () => {
    it('should return paginated users with filters', async () => {
      // Arrange
      const filters = { role: 'doctor', department: 'Cardiology' };
      const page = 1;
      const limit = 10;
      
      const mockUsers = [
        { ...mockUser, id: 'user-1' },
        { ...mockUser, id: 'user-2', name: 'Doctor Two' }
      ];

      // Mock count query
      db.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // Count query
        .mockResolvedValueOnce({ rows: mockUsers }); // Data query

      // Act
      const result = await User.findAll(filters, page, limit);

      // Assert
      expect(db.query).toHaveBeenCalledTimes(2);
      
      // Check count query
      expect(db.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('SELECT COUNT(*)'),
        expect.arrayContaining(['doctor', 'Cardiology'])
      );

      // Check data query
      expect(db.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('LIMIT'),
        expect.arrayContaining(['doctor', 'Cardiology', 10, 0])
      );

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        pages: 1
      });
    });

    it('should handle empty filters', async () => {
      // Arrange
      db.query
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await User.findAll({}, 1, 10);

      // Assert
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('update()', () => {
    it('should update user information', async () => {
      // Arrange
      const userId = mockUser.id;
      const updateData = {
        name: 'Updated Name',
        specialization: 'Updated Specialization',
        phone: '+251933333333'
      };

      const updatedUser = {
        ...mockUser,
        ...updateData
      };

      db.query.mockResolvedValue({ rows: [updatedUser] });

      // Act
      const result = await User.update(userId, updateData);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['Updated Name', 'Updated Specialization', '+251933333333', userId])
      );
      expect(result).toEqual(updatedUser);
    });

    it('should not update password via update method', async () => {
      // Arrange
      const userId = mockUser.id;
      const updateData = {
        name: 'Updated Name',
        password: 'newpassword123' // This should be ignored
      };

      db.query.mockResolvedValue({ rows: [{ ...mockUser, name: 'Updated Name' }] });

      // Act
      const result = await User.update(userId, updateData);

      // Assert
      // Check that password is not in the SET clause
      expect(db.query.mock.calls[0][0]).not.toContain('password =');
      expect(result.name).toBe('Updated Name');
    });

    it('should throw error when no fields to update', async () => {
      // Arrange
      const userId = mockUser.id;
      const updateData = {};

      // Act & Assert
      await expect(User.update(userId, updateData)).rejects.toThrow('No fields to update');
    });
  });

  describe('updatePassword()', () => {
    it('should update user password', async () => {
      // Arrange
      const userId = mockUser.id;
      const newPassword = 'newSecurePassword123';
      
      bcrypt.hash.mockResolvedValue('new-hashed-password');
      db.query.mockResolvedValue({ rows: [{ id: userId }] });

      // Act
      const result = await User.updatePassword(userId, newPassword);

      // Assert
      expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET password = $1'),
        ['new-hashed-password', userId]
      );
      expect(result).toHaveProperty('id', userId);
    });
  });

  describe('delete()', () => {
    it('should soft delete user (set is_active = false)', async () => {
      // Arrange
      const userId = mockUser.id;
      
      db.query.mockResolvedValue({ rows: [{ id: userId }] });

      // Act
      const result = await User.delete(userId);

      // Assert
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET is_active = FALSE'),
        [userId]
      );
      expect(result).toHaveProperty('id', userId);
    });
  });

  describe('comparePassword()', () => {
    it('should compare passwords correctly', async () => {
      // Arrange
      const candidatePassword = 'myPassword123';
      const hashedPassword = 'hashed-version-of-password';
      
      bcrypt.compare.mockResolvedValue(true);

      // Act
      const result = await User.comparePassword(candidatePassword, hashedPassword);

      // Assert
      expect(bcrypt.compare).toHaveBeenCalledWith(candidatePassword, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      // Arrange
      bcrypt.compare.mockResolvedValue(false);

      // Act
      const result = await User.comparePassword('wrong', 'hashed');

      // Assert
      expect(result).toBe(false);
    });
  });
});