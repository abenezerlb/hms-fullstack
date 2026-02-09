/**
 * Fix Migration Issue Script
 * 
 * This script fixes common migration issues like:
 * 1. schema_version table creation errors
 * 2. UUID extension issues
 * 3. Missing migrations directory
 */

const fs = require('fs').promises;
const path = require('path');
const { query } = require('../database/connection');
const logger = require('../utils/logger');

/**
 * Fix schema_version table
 */
async function fixSchemaVersionTable() {
  try {
    logger.info('Attempting to fix schema_version table...');
    
    // First, try to drop the table if it exists (with bad structure)
    try {
      await query('DROP TABLE IF EXISTS schema_version CASCADE');
      logger.info('Dropped existing schema_version table');
    } catch (error) {
      logger.debug('Could not drop schema_version table:', error.message);
    }
    
    // Create a simple schema_version table without UUID dependency
    await query(`
      CREATE TABLE IF NOT EXISTS schema_version (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
        description TEXT,
        script_name VARCHAR(255) NOT NULL UNIQUE,
        checksum VARCHAR(64),
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER
      )
    `);
    
    logger.info('✅ Created fixed schema_version table');
    return true;
  } catch (error) {
    logger.error('Failed to fix schema_version table:', error.message);
    
    // Try even simpler version
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS schema_version (
          id SERIAL PRIMARY KEY,
          script_name VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      logger.info('✅ Created minimal schema_version table');
      return true;
    } catch (simpleError) {
      logger.error('Failed to create even minimal table:', simpleError.message);
      return false;
    }
  }
}

/**
 * Check and fix UUID extension
 */
async function fixUuidExtension() {
  try {
    logger.info('Checking UUID extension...');
    
    // Check if extension exists
    const result = await query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'
      ) as extension_exists
    `);
    
    if (result.rows[0].extension_exists) {
      logger.info('✅ UUID extension already exists');
      return true;
    }
    
    // Try to create extension
    try {
      await query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      logger.info('✅ Created UUID extension');
      return true;
    } catch (extError) {
      logger.warn('Could not create UUID extension:', extError.message);
      logger.info('Some features may not work without UUID extension');
      return false;
    }
  } catch (error) {
    logger.error('Error checking UUID extension:', error.message);
    return false;
  }
}

/**
 * Check and create migrations directory
 */
async function ensureMigrationsDirectory() {
  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
  
  try {
    await fs.access(migrationsDir);
    logger.info('✅ Migrations directory exists');
    
    // Check if it has files
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(file => file.endsWith('.sql'));
    
    if (sqlFiles.length === 0) {
      logger.warn('Migrations directory is empty');
      await createSampleMigrations();
    }
    
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.info('Creating migrations directory...');
      await fs.mkdir(migrationsDir, { recursive: true });
      logger.info('✅ Created migrations directory');
      
      // Create sample migrations
      await createSampleMigrations();
      return true;
    }
    
    logger.error('Error with migrations directory:', error.message);
    return false;
  }
}

/**
 * Create sample migration files
 */
async function createSampleMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
  
  // Create the UUID check migration
  const uuidCheckMigration = `
/*
UUID Extension Check Migration
Version: 0.1.0
Description: Checks and enables UUID extension if available
*/

DO $$
BEGIN
    -- Try to create extension
    BEGIN
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        RAISE NOTICE 'UUID extension enabled';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Note: UUID extension not available: %', SQLERRM;
    END;
END $$;

RAISE NOTICE 'Migration 000 completed';
`;
  
  // Create the main schema migration
  const mainSchemaMigration = `
/*
Main Schema Migration
Version: 1.0.0
Description: Creates core HMS tables
*/

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'doctor', 'receptionist', 'lab_technician')),
    specialization VARCHAR(100),
    phone VARCHAR(20),
    department VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Patients Table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(200) NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    date_of_birth DATE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(100),
    address TEXT,
    emergency_contact VARCHAR(20),
    blood_type VARCHAR(5),
    allergies TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);

-- Insert admin user
INSERT INTO users (name, email, password, role, specialization, phone) 
VALUES ('Admin User', 'admin@hms.et', '$2b$10$YourHashedPasswordHere', 'admin', 'Administration', '+251911111111')
ON CONFLICT (email) DO NOTHING;

RAISE NOTICE 'Main schema migration completed';
`;
  
  try {
    // Write migration files
    await fs.writeFile(
      path.join(migrationsDir, '000_check_uuid_extension.sql'),
      uuidCheckMigration
    );
    
    await fs.writeFile(
      path.join(migrationsDir, '001_main_schema.sql'),
      mainSchemaMigration
    );
    
    logger.info('✅ Created sample migration files');
    return true;
  } catch (error) {
    logger.error('Error creating sample migrations:', error.message);
    return false;
  }
}

/**
 * Show current migration status
 */
async function showStatus() {
  try {
    // Check if schema_version table exists
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_version'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      logger.info('schema_version table: ❌ Does not exist');
    } else {
      // Check table structure
      const columns = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'schema_version'
      `);
      
      logger.info('schema_version table: ✅ Exists');
      logger.info(`  Columns: ${columns.rows.map(c => c.column_name).join(', ')}`);
    }
    
    // Check UUID extension
    const uuidExt = await query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'
      )
    `);
    
    logger.info(`UUID extension: ${uuidExt.rows[0].exists ? '✅ Exists' : '❌ Missing'}`);
    
    // Check migrations directory
    const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
    try {
      await fs.access(migrationsDir);
      const files = await fs.readdir(migrationsDir);
      const sqlFiles = files.filter(f => f.endsWith('.sql'));
      logger.info(`Migrations directory: ✅ Exists (${sqlFiles.length} SQL files)`);
    } catch {
      logger.info('Migrations directory: ❌ Does not exist');
    }
    
  } catch (error) {
    logger.error('Error checking status:', error.message);
  }
}

/**
 * Main fix function
 */
async function fixMigrationIssues() {
  logger.info('🔧 Fixing Migration Issues');
  logger.info('='.repeat(50));
  
  try {
    // Show current status
    await showStatus();
    
    logger.info('\nFixing issues...');
    
    // Fix in order
    const results = {
      schemaVersionTable: await fixSchemaVersionTable(),
      uuidExtension: await fixUuidExtension(),
      migrationsDirectory: await ensureMigrationsDirectory()
    };
    
    logger.info('\n' + '='.repeat(50));
    logger.info('🔧 FIX RESULTS');
    logger.info('='.repeat(50));
    
    Object.entries(results).forEach(([key, value]) => {
      const name = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      logger.info(`${name}: ${value ? '✅ Fixed' : '❌ Failed'}`);
    });
    
    logger.info('='.repeat(50));
    
    if (Object.values(results).every(r => r)) {
      logger.info('\n✅ All issues fixed successfully!');
      logger.info('You can now run: node scripts/runMigration.js');
    } else {
      logger.info('\n⚠️ Some issues could not be fixed automatically');
      logger.info('You may need to manually fix the remaining issues');
    }
    
    // Show final status
    logger.info('\n📊 FINAL STATUS');
    logger.info('='.repeat(50));
    await showStatus();
    
  } catch (error) {
    logger.error('Error fixing migration issues:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  fixMigrationIssues();
}

module.exports = {
  fixMigrationIssues,
  fixSchemaVersionTable,
  fixUuidExtension,
  ensureMigrationsDirectory,
  showStatus
};