/**
 * Database Connection Manager for HMS
 * Centralized connection handling with proper error management
 */

const { Pool } = require('pg');
const logger = require('../utils/logger'); // You'll need to create this

class DatabaseConnection {
    constructor() {
        this.pool = null;
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    /**
     * Initialize database connection pool
     */
    async initialize() {
        try {
            // Validate environment variables
            this.validateEnvVars();

            this.pool = new Pool({
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT) || 5432,
                database: process.env.DB_NAME || 'hms_db',
                user: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD,
                
                // Connection pool settings
                max: parseInt(process.env.DB_POOL_MAX) || 20,
                min: parseInt(process.env.DB_POOL_MIN) || 2,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
                
                // SSL for production (important for compliance!)
                ssl: process.env.NODE_ENV === 'production' 
                    ? { rejectUnauthorized: false } 
                    : false
            });

            // Test connection
            const client = await this.pool.connect();
            const result = await client.query('SELECT NOW()');
            client.release();
            
            this.isConnected = true;
            logger.info(`✅ Database connected successfully: ${process.env.DB_NAME}`);
            logger.info(`📊 Database time: ${result.rows[0].now}`);
            
            // Setup pool error handling
            this.setupPoolEventHandlers();
            
            return this.pool;
            
        } catch (error) {
            this.handleConnectionError(error);
            throw error;
        }
    }

    /**
     * Validate required environment variables
     */
    validateEnvVars() {
        const required = ['DB_NAME', 'DB_USER', 'DB_PASSWORD'];
        const missing = [];
        
        required.forEach(varName => {
            if (!process.env[varName] || process.env[varName].trim() === '') {
                missing.push(varName);
            }
        });
        
        if (missing.length > 0) {
            throw new Error(`Missing database environment variables: ${missing.join(', ')}`);
        }
    }

    /**
     * Setup event handlers for connection pool
     */
    setupPoolEventHandlers() {
        this.pool.on('error', (err) => {
            logger.error('⚠️ Unexpected database pool error:', err);
            this.isConnected = false;
            
            // Attempt reconnect after delay
            setTimeout(() => this.reconnect(), 5000);
        });

        this.pool.on('connect', () => {
            logger.debug('📡 New database connection established');
        });

        this.pool.on('remove', () => {
            logger.debug('🔌 Database connection removed from pool');
        });
    }

    /**
     * Attempt to reconnect to database
     */
    async reconnect() {
        if (this.retryCount >= this.maxRetries) {
            logger.error('❌ Maximum reconnection attempts reached');
            return;
        }
        
        this.retryCount++;
        logger.warn(`🔄 Attempting database reconnection (${this.retryCount}/${this.maxRetries})`);
        
        try {
            await this.initialize();
            this.retryCount = 0; // Reset on success
        } catch (error) {
            logger.error(`Reconnection attempt ${this.retryCount} failed:`, error.message);
            
            // Exponential backoff
            const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
            setTimeout(() => this.reconnect(), delay);
        }
    }

    /**
     * Handle connection errors
     */
    handleConnectionError(error) {
        logger.error('❌ Database connection failed:', {
            message: error.message,
            code: error.code,
            detail: error.detail
        });
        
        this.isConnected = false;
        
        // Provide helpful troubleshooting tips
        if (error.code === '28P01') {
            logger.error('💡 Tip: Check DB_USER and DB_PASSWORD credentials');
        } else if (error.code === '3D000') {
            logger.error(`💡 Tip: Database '${process.env.DB_NAME}' might not exist. Create it first.`);
        } else if (error.code === 'ECONNREFUSED') {
            logger.error('💡 Tip: PostgreSQL might not be running or is on a different port');
        }
    }

    /**
     * Execute a query with parameters
     * @param {string} text - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise} Query result
     */
    async query(text, params = []) {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
        
        const start = Date.now();
        
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            
            // Log slow queries (for performance monitoring)
            if (duration > 1000) {
                logger.warn(`🐌 Slow query detected (${duration}ms): ${text}`);
            }
            
            return result;
        } catch (error) {
            logger.error('Query error:', {
                query: text,
                params: params,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Execute a transaction
     * @param {Function} callback - Async function receiving client
     */
    async transaction(callback) {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Transaction failed:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get raw pool (for advanced use cases)
     */
    getPool() {
        return this.pool;
    }

    /**
     * Check database health
     */
    async checkHealth() {
        try {
            const result = await this.query('SELECT 1 as health_check');
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                details: {
                    totalCount: this.pool.totalCount,
                    idleCount: this.pool.idleCount,
                    waitingCount: this.pool.waitingCount
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    /**
     * Gracefully shutdown database connections
     */
    async shutdown() {
        if (this.pool) {
            logger.info('🔌 Shutting down database connections...');
            await this.pool.end();
            this.isConnected = false;
            logger.info('✅ Database connections closed');
        }
    }
}

// Create singleton instance
const database = new DatabaseConnection();

// Initialize on module load (or defer to app startup)
if (process.env.DB_AUTO_INIT !== 'false') {
    database.initialize().catch(err => {
        logger.error('Failed to auto-initialize database:', err);
    });
}

module.exports = database;