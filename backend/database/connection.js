/**
 * Database Connection Module
 * 
 * This module establishes and manages the PostgreSQL database connection
 * using the 'pg' library (node-postgres). It provides:
 * 1. A connection pool for efficient database operations
 * 2. Connection health checks
 * 3. Graceful shutdown handling
 * 
 * Why use connection pooling?
 * - Reuses connections instead of creating new ones for each query
 * - Improves performance by reducing connection overhead
 * - Manages maximum concurrent connections
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

// Load environment variables
const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  NODE_ENV
} = process.env;

/**
 * Database configuration object
 * Different configurations for development, test, and production environments
 */
const dbConfig = {
  host: DB_HOST || 'localhost',
  port: parseInt(DB_PORT) || 5432,
  user: DB_USER || 'hms_user',
  password: DB_PASSWORD || 'hms_password',
  database: DB_NAME || 'hms_db',
  // Connection pool settings
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle
  connectionTimeoutMillis: 2000, // how long to wait for a connection
  // SSL configuration (important for production)
  ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Create a connection pool
const pool = new Pool(dbConfig);

/**
 * Event listener for when a client connects to the pool
 * Useful for debugging and monitoring
 */
pool.on('connect', () => {
  logger.info('Database connection established');
});

/**
 * Event listener for pool errors
 * Handles connection errors gracefully
 */
pool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err);
  // In production, you might want to implement reconnection logic here
});

/**
 * Test database connection
 * This function is used during application startup to verify database connectivity
 * @returns {Promise<boolean>} True if connection successful, false otherwise
 */
const testConnection = async () => {
  try {
    // Try to get a client from the pool and run a simple query
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    client.release(); // Always release the client back to the pool
    
    logger.info('Database connection test successful:', result.rows[0].current_time);
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error.message);
    return false;
  }
};

/**
 * Get a client from the pool for transaction handling
 * Important for operations that require multiple queries in a transaction
 * @returns {Promise<import('pg').PoolClient>} Database client
 */
const getClient = async () => {
  return await pool.connect();
};

/**
 * Execute a query with parameters
 * This is the main function used throughout the application for database operations
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters (prevents SQL injection)
 * @returns {Promise<import('pg').QueryResult>} Query result
 */
const query = (text, params) => {
  // Log queries in development for debugging (not in production for performance)
  if (NODE_ENV === 'development') {
    logger.debug(`Executing query: ${text}`, { params });
  }
  
  return pool.query(text, params);
};

/**
 * Gracefully shutdown the database pool
 * Should be called when the application is shutting down
 */
const shutdown = async () => {
  logger.info('Shutting down database pool...');
  await pool.end();
  logger.info('Database pool has been shut down');
};

// Export the database functions and pool
module.exports = {
  pool,
  query,
  getClient,
  testConnection,
  shutdown
};