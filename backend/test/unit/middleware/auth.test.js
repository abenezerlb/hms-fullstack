const jwt = require('jsonwebtoken');
const { authenticateToken, optionalAuthenticate, generateToken } = require('../../../middleware/auth');
const jwtConfig = require('../../../config/jwt');

// Mock Express request, response, next
const mockRequest = (headers = {}) => ({
  headers: { ...headers }
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateToken()', () => {
    it('should return 401 when no token provided', () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();

      // Act
      authenticateToken(req, res, mockNext);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Authentication required",
        message: "No authentication token provided."
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', () => {
      // Arrange
      const req = mockRequest({
        authorization: 'Bearer expired-token'
      });
      const res = mockResponse();

      // Mock jwt.verify to throw TokenExpiredError
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(error, null);
      });

      // Act
      authenticateToken(req, res, mockNext);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Token expired",
        message: "Authentication token has expired. Please login again."
      });
    });

    it('should return 403 when token is invalid', () => {
      // Arrange
      const req = mockRequest({
        authorization: 'Bearer invalid-token'
      });
      const res = mockResponse();

      // Mock jwt.verify to throw JsonWebTokenError
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(error, null);
      });

      // Act
      authenticateToken(req, res, mockNext);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Invalid token",
        message: "Invalid authentication token."
      });
    });

    it('should attach user to request and call next() when token is valid', () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'doctor@test.com',
        role: 'doctor',
        name: 'Test Doctor'
      };

      const req = mockRequest({
        authorization: 'Bearer valid-token'
      });
      const res = mockResponse();

      // Mock jwt.verify to succeed
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, mockUser);
      });

      // Act
      authenticateToken(req, res, mockNext);

      // Assert
      expect(req.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should handle server errors gracefully', () => {
      // Arrange
      const req = mockRequest({
        authorization: 'Bearer some-token'
      });
      const res = mockResponse();

      // Mock jwt.verify to throw unexpected error
      jwt.verify.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Act
      authenticateToken(req, res, mockNext);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Internal server error",
        message: "Authentication failed due to server error."
      });
    });
  });

  describe('optionalAuthenticate()', () => {
    it('should set req.user to null when no token provided', () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();

      // Act
      optionalAuthenticate(req, res, mockNext);

      // Assert
      expect(req.user).toBeNull();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set req.user when valid token provided', () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@test.com' };
      const req = mockRequest({
        authorization: 'Bearer valid-token'
      });
      const res = mockResponse();

      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(null, mockUser);
      });

      // Act
      optionalAuthenticate(req, res, mockNext);

      // Assert
      expect(req.user).toEqual(mockUser);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should continue even with invalid token (req.user = null)', () => {
      // Arrange
      const req = mockRequest({
        authorization: 'Bearer invalid-token'
      });
      const res = mockResponse();

      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      jwt.verify.mockImplementation((token, secret, callback) => {
        callback(error, null);
      });

      // Act
      optionalAuthenticate(req, res, mockNext);

      // Assert
      expect(req.user).toBeNull();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('generateToken()', () => {
    it('should generate JWT token with correct payload', () => {
      // Arrange
      const user = {
        id: 'user-123',
        email: 'doctor@test.com',
        role: 'doctor',
        name: 'Test Doctor',
        department: 'Cardiology',
        specialization: 'Heart Specialist'
      };

      jwt.sign.mockReturnValue('generated-jwt-token');

      // Act
      const token = generateToken(user);

      // Assert
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
      expect(token).toBe('generated-jwt-token');
    });
  });

  describe('getUserIdFromToken()', () => {
    // Note: This function is not exported in our middleware
    // We'll test it if we export it
    it('should extract user ID from valid token', () => {
      // This would require exporting the function
      // For now, we'll skip or modify the middleware to export it
    });
  });
});