// Runs once before all tests
module.exports = async () => {
  console.log('🚀 Global Test Setup Started');
  
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DB_NAME = process.env.DB_NAME || 'hms_test_db';
  process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only';
  
  // You could start a test database container here
  // For now, we'll just set up the environment
  
  console.log('✅ Global Test Setup Complete');
};