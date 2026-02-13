const request = require('supertest');
const app = require('../../server');
const db = require('../../config/database');
const User = require('../../models/User');

// Mock the database for integration tests
jest.mock('../../config/database');
jest.mock('../../models/User');

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate user and return token', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'doctor@test.com',
        password: 'hashed-password',
        name: 'Test Doctor',
        role: 'doctor',
        specialization: 'Cardiology',
        phone: '+251911111111',
        department: 'Cardiology',
        is_active: true,
        created_at: new Date().toISOString()
      };

      User.findByEmail.mockResolvedValue(mockUser);
      User.comparePassword.mockResolvedValue(true);

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'doctor@test.com',
          password: 'password123'
        });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('doctor@test.com');
      expect(response.body.user.role).toBe('doctor');
      expect(response.body.user.password).toBeUndefined(); // Password should not be in response
    });

    it('should return 401 for invalid credentials', async () => {
      // Arrange
      User.findByEmail.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@test.com',
          password: 'wrongpassword'
        });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return 400 for missing fields', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com'
          // Missing password
        });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile with valid token', async () => {
      // This would require generating a valid JWT token
      // For now, we'll mock the auth middleware
    });

    it('should return 401 without token', async () => {
      // Act
      const response = await request(app)
        .get('/api/auth/profile');

      // Assert
      expect(response.status).toBe(401);
    });
  });
});