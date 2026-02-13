const AuthController = require('../../../controllers/authController');
const User = require('../../../models/User');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../../../config/jwt');

// Mock dependencies
jest.mock('../../../models/User');
jest.mock('jsonwebtoken');
jest.mock('../../../config/jwt', () => ({
  secret: 'test-secret',
  options: { expiresIn: '24h' }
}));

describe('AuthController', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock request, response, next
    mockReq = {
      body: {},
      user: null
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });

  describe('login()', () => {
    const validCredentials = {
      email: 'doctor@test.com',
      password: 'password123'
    };

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

    it('should return 400 when email or password is missing', async () => {
      // Arrange
      mockReq.body = { email: 'test@test.com' }; // Missing password

      // Act
      await AuthController.login(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Validation failed",
        message: "Email and password are required."
      });
    });

    it('should return 401 when user not found', async () => {
      // Arrange
      mockReq.body = validCredentials;
      User.findByEmail.mockResolvedValue(null);

      // Act
      await AuthController.login(mockReq, mockRes);

      // Assert
      expect(User.findByEmail).toHaveBeenCalledWith('doctor@test.com');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Invalid credentials",
        message: "Invalid email or password."
      });
    });

    it('should return 401 when password is incorrect', async () => {
      // Arrange
      mockReq.body = validCredentials;
      User.findByEmail.mockResolvedValue(mockUser);
      User.comparePassword.mockResolvedValue(false); // Password doesn't match

      // Act
      await AuthController.login(mockReq, mockRes);

      // Assert
      expect(User.comparePassword).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Invalid credentials",
        message: "Invalid email or password."
      });
    });

    it('should return 403 when user account is inactive', async () => {
      // Arrange
      mockReq.body = validCredentials;
      const inactiveUser = { ...mockUser, is_active: false };
      User.findByEmail.mockResolvedValue(inactiveUser);
      User.comparePassword.mockResolvedValue(true);

      // Act
      await AuthController.login(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Account disabled",
        message: "Your account has been deactivated. Please contact administrator."
      });
    });

    it('should return JWT token and user data on successful login', async () => {
      // Arrange
      mockReq.body = validCredentials;
      User.findByEmail.mockResolvedValue(mockUser);
      User.comparePassword.mockResolvedValue(true);
      jwt.sign.mockReturnValue('generated-jwt-token');

      // Act
      await AuthController.login(mockReq, mockRes);

      // Assert
      // Check JWT generation
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          name: mockUser.name,
          department: mockUser.department,
          specialization: mockUser.specialization
        },
        jwtConfig.secret,
        jwtConfig.options
      );

      // Check response
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Login successful",
        token: 'generated-jwt-token',
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
          specialization: mockUser.specialization,
          phone: mockUser.phone,
          department: mockUser.department,
          is_active: mockUser.is_active,
          created_at: mockUser.created_at
        }
      });

      // Should not call status() for successful response
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle server errors gracefully', async () => {
      // Arrange
      mockReq.body = validCredentials;
      User.findByEmail.mockRejectedValue(new Error('Database error'));

      // Act
      await AuthController.login(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Internal server error",
        message: "Login failed. Please try again later."
      });
    });
  });

  describe('getProfile()', () => {
    it('should return user profile when authenticated', async () => {
      // Arrange
      const mockUserData = {
        id: 'user-123',
        name: 'Test Doctor',
        email: 'doctor@test.com',
        role: 'doctor',
        specialization: 'Cardiology'
      };

      mockReq.user = { id: 'user-123' };
      User.findById.mockResolvedValue(mockUserData);

      // Act
      await AuthController.getProfile(mockReq, mockRes);

      // Assert
      expect(User.findById).toHaveBeenCalledWith('user-123');
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUserData
      });
    });

    it('should return 404 when user not found', async () => {
      // Arrange
      mockReq.user = { id: 'non-existent-id' };
      User.findById.mockResolvedValue(null);

      // Act
      await AuthController.getProfile(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Not found",
        message: "User not found."
      });
    });

    it('should handle errors when fetching profile', async () => {
      // Arrange
      mockReq.user = { id: 'user-123' };
      User.findById.mockRejectedValue(new Error('Database error'));

      // Act
      await AuthController.getProfile(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Internal server error",
        message: "Failed to fetch profile. Please try again later."
      });
    });
  });

  describe('refreshToken()', () => {
    it('should return 400 when token is missing', async () => {
      // Arrange
      mockReq.body = {};

      // Act
      await AuthController.refreshToken(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Validation failed",
        message: "Token is required."
      });
    });

    it('should return 403 when token is invalid', async () => {
      // Arrange
      mockReq.body = { token: 'invalid-token' };
      jwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      // Act
      await AuthController.refreshToken(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Invalid token",
        message: "Invalid refresh token."
      });
    });

    it('should return 401 when user not found or inactive', async () => {
      // Arrange
      mockReq.body = { token: 'old-token' };
      const decoded = { id: 'user-123' };
      
      jwt.verify.mockReturnValue(decoded);
      User.findById.mockResolvedValue(null); // User not found

      // Act
      await AuthController.refreshToken(mockReq, mockRes);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Invalid credentials",
        message: "User not found or inactive."
      });
    });

    it('should generate new token when refresh is successful', async () => {
      // Arrange
      const oldToken = 'old-jwt-token';
      const newToken = 'new-jwt-token';
      const user = {
        id: 'user-123',
        name: 'Test Doctor',
        email: 'doctor@test.com',
        role: 'doctor',
        department: 'Cardiology',
        specialization: 'Cardiology',
        is_active: true
      };

      mockReq.body = { token: oldToken };
      
      // Mock jwt.verify to decode old token
      jwt.verify.mockImplementation((token, secret, options) => {
        if (options && options.ignoreExpiration) {
          return { id: user.id };
        }
        throw new Error('Token expired');
      });

      User.findById.mockResolvedValue(user);
      jwt.sign.mockReturnValue(newToken);

      // Act
      await AuthController.refreshToken(mockReq, mockRes);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(
        oldToken,
        jwtConfig.secret,
        {
          issuer: jwtConfig.issuer,
          audience: jwtConfig.audience,
          ignoreExpiration: true
        }
      );

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          department: user.department,
          specialization: user.specialization
        },
        jwtConfig.secret,
        jwtConfig.options
      );

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Token refreshed successfully",
        token: newToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    });
  });
});