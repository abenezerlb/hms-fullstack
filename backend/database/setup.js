/**
 * Database Setup Module
 * 
 * This module provides programmatic access to database setup functions.
 * It's used by the setup script and can also be imported by other modules
 * for database initialization.
 * 
 * Key features:
 * - Creates database schema
 * - Runs migrations in order
 * - Seeds initial data
 * - Provides status checking
 */

const fs = require('fs').promises;
const path = require('path');
const { query } = require('./connection');
const logger = require('../utils/logger');

/**
 * Check if database tables exist
 * @returns {Promise<boolean>} True if all core tables exist
 */
async function checkDatabaseSetup() {
  try {
    // Check for core tables
    const tables = ['users', 'patients', 'appointments', 'medical_records', 'bills', 'payments'];
    
    for (const table of tables) {
      const result = await query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
        [table]
      );
      
      if (!result.rows[0].exists) {
        logger.warn(`Table ${table} does not exist`);
        return false;
      }
    }
    
    logger.info('All core database tables exist');
    return true;
  } catch (error) {
    logger.error('Error checking database setup:', error.message);
    return false;
  }
}

/**
 * Get database schema version
 * @returns {Promise<string>} Current schema version or 'unknown'
 */
async function getSchemaVersion() {
  try {
    // Check if we have a schema version table (you might want to add one)
    const result = await query(`
      SELECT version FROM schema_version ORDER BY applied_at DESC LIMIT 1
    `);
    
    return result.rows[0]?.version || '1.0.0'; // Default to initial version
  } catch {
    // If schema_version table doesn't exist, return default
    return '1.0.0';
  }
}

/**
 * Run a single SQL migration file
 * @param {string} filePath - Path to SQL file
 * @returns {Promise<boolean>} Success status
 */
async function runMigrationFile(filePath) {
  try {
    logger.info(`Running migration: ${path.basename(filePath)}`);
    
    // Read the SQL file
    const sql = await fs.readFile(filePath, 'utf8');
    
    // Execute the SQL
    await query(sql);
    
    logger.info(`Migration ${path.basename(filePath)} completed successfully`);
    return true;
  } catch (error) {
    logger.error(`Error running migration ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Run all migrations in the migrations directory
 * @returns {Promise<number>} Number of migrations run
 */
async function runAllMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  
  try {
    // Read migration files
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Important: sort to run in correct order
    
    logger.info(`Found ${sqlFiles.length} migration files`);
    
    // Run each migration
    for (const file of sqlFiles) {
      const filePath = path.join(migrationsDir, file);
      await runMigrationFile(filePath);
    }
    
    return sqlFiles.length;
  } catch (error) {
    logger.error('Error running migrations:', error.message);
    throw error;
  }
}

/**
 * Seed initial data into the database
 * This should be run after migrations
 */
async function seedInitialData() {
  try {
    logger.info('Seeding initial data...');
    
    // Check if we already have admin user
    const adminCheck = await query('SELECT COUNT(*) FROM users WHERE role = $1', ['admin']);
    const adminCount = parseInt(adminCheck.rows[0].count);
    
    if (adminCount === 0) {
      logger.info('Creating initial admin user...');
      
      // Hash password: 'admin123' (in production, use environment variable)
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await query(
        `INSERT INTO users (name, email, password, role, specialization, phone) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['System Administrator', 'admin@hms.et', hashedPassword, 'admin', 'Administration', '+251911111111']
      );
      
      logger.info('Admin user created: admin@hms.et / admin123');
    }
    
    // Check if we have sample services
    const servicesCheck = await query('SELECT COUNT(*) FROM services');
    const servicesCount = parseInt(servicesCheck.rows[0].count);
    
    if (servicesCount === 0) {
      logger.info('Seeding sample services...');
      
      const sampleServices = [
        ['CONSULT', 'General Consultation', 500.00, 'Consultation'],
        ['LAB-CBC', 'Complete Blood Count', 350.00, 'Laboratory'],
        ['XRAY-CHEST', 'Chest X-Ray', 1200.00, 'Radiology'],
        ['ECG', 'Electrocardiogram', 800.00, 'Cardiology'],
        ['URINALYSIS', 'Urine Analysis', 250.00, 'Laboratory'],
        ['MRI-BRAIN', 'MRI Brain Scan', 5000.00, 'Radiology'],
        ['PHYSIO', 'Physiotherapy Session', 700.00, 'Therapy'],
        ['EMERG', 'Emergency Consultation', 1000.00, 'Emergency']
      ];
      
      for (const service of sampleServices) {
        await query(
          `INSERT INTO services (service_code, service_name, price, category) 
           VALUES ($1, $2, $3, $4)`,
          service
        );
      }
      
      logger.info(`Added ${sampleServices.length} sample services`);
    }
    
    logger.info('Initial data seeding completed');
    return true;
  } catch (error) {
    logger.error('Error seeding initial data:', error.message);
    throw error;
  }
}

/**
 * Reset database to initial state (for development/testing)
 * WARNING: This will delete all data!
 */
async function resetDatabase() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database reset is not allowed in production');
  }
  
  try {
    logger.warn('Resetting database... THIS WILL DELETE ALL DATA!');
    
    // Disable triggers temporarily
    await query('SET session_replication_role = replica;');
    
    // Drop all tables in reverse order (due to foreign key constraints)
    const dropOrder = [
      'sessions',
      'audit_logs',
      'bill_items',
      'payments',
      'bills',
      'medical_records',
      'appointments',
      'services',
      'patients',
      'users'
    ];
    
    for (const table of dropOrder) {
      try {
        await query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        logger.info(`Dropped table: ${table}`);
      } catch (error) {
        logger.warn(`Could not drop table ${table}:`, error.message);
      }
    }
    
    // Re-enable triggers
    await query('SET session_replication_role = DEFAULT;');
    
    logger.info('Database reset completed. Run migrations to recreate schema.');
    return true;
  } catch (error) {
    logger.error('Error resetting database:', error.message);
    throw error;
  }
}

// Export all functions
module.exports = {
  checkDatabaseSetup,
  getSchemaVersion,
  runAllMigrations,
  seedInitialData,
  resetDatabase,
  runMigrationFile
};