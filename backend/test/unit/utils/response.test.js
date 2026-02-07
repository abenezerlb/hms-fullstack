// Since we don't have a response utility, let me create one and test it

// First, create a simple response utility
const responseUtils = {
  success: (res, data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  },
  
  error: (res, error, message, statusCode = 500) => {
    return res.status(statusCode).json({
      success: false,
      error: error.message || error,
      message: message || 'An error occurred'
    });
  },
  
  validationError: (res, errors, message = 'Validation failed') => {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message,
      details: errors
    });
  }
};

// Now test it
describe('Response Utilities', () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  describe('success()', () => {
    it('should send success response with default status 200', () => {
      // Arrange
      const data = { id: 1, name: 'Test' };
      const message = 'Operation successful';

      // Act
      responseUtils.success(mockRes, data, message);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Operation successful',
        data: { id: 1, name: 'Test' }
      });
    });

    it('should send success response with custom status code', () => {
      // Arrange
      const data = { id: 1 };
      const message = 'Created successfully';
      const statusCode = 201;

      // Act
      responseUtils.success(mockRes, data, message, statusCode);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Created successfully',
        data: { id: 1 }
      });
    });
  });

  describe('error()', () => {
    it('should send error response with default status 500', () => {
      // Arrange
      const error = new Error('Database connection failed');
      const message = 'Unable to process request';

      // Act
      responseUtils.error(mockRes, error, message);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database connection failed',
        message: 'Unable to process request'
      });
    });

    it('should send error response with custom status code', () => {
      // Arrange
      const error = new Error('Not found');
      const message = 'Resource not found';
      const statusCode = 404;

      // Act
      responseUtils.error(mockRes, error, message, statusCode);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not found',
        message: 'Resource not found'
      });
    });

    it('should handle string errors', () => {
      // Arrange
      const error = 'Simple error message';

      // Act
      responseUtils.error(mockRes, error);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Simple error message',
        message: 'An error occurred'
      });
    });
  });

  describe('validationError()', () => {
    it('should send validation error response', () => {
      // Arrange
      const errors = [
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password must be at least 6 characters' }
      ];
      const message = 'Please check your input';

      // Act
      responseUtils.validationError(mockRes, errors, message);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation Error',
        message: 'Please check your input',
        details: [
          { field: 'email', message: 'Email is required' },
          { field: 'password', message: 'Password must be at least 6 characters' }
        ]
      });
    });
  });
});

module.exports = responseUtils;