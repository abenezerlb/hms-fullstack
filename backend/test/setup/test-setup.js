// Global test setup
const path = require('path');

// Load test environment variables
require('dotenv').config({ 
  path: path.resolve(__dirname, '../../.env.test') 
});

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(30000);

// Suppress console logs during tests (optional)
if (process.env.SUPPRESS_LOGS === 'true') {
  global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
}

// Mock database for unit tests
jest.mock('../../config/database', () => ({
  query: jest.fn(),
  pool: {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn()
  },
  transaction: jest.fn()
}));

// Mock external services
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-jwt-token'),
  verify: jest.fn()
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(() => Promise.resolve('hashed-password')),
  compare: jest.fn(() => Promise.resolve(true))
}));

// Global test utilities
global.generateTestData = () => ({
  timestamp: new Date().toISOString(),
  randomString: (length = 10) => Math.random().toString(36).substring(2, length + 2),
  randomNumber: (min = 1, max = 1000) => Math.floor(Math.random() * (max - min + 1)) + min,
  randomEmail: () => `test${Math.random().toString(36).substring(2, 10)}@test.com`,
  randomPhone: () => `+2519${Math.floor(Math.random() * 100000000)}`.substring(0, 13)
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Clean up after all tests in a file
afterAll(() => {
  jest.restoreAllMocks();
});