/**
 * Database Setup Script
 * 
 * This script initializes the HMS database by:
 * 1. Creating the database if it doesn't exist
 * 2. Running all migration files in order
 * 3. Seeding initial data
 * 
 * Usage: node scripts/setupDatabase.js
 * 
 * Important: This script should be run once during initial setup
 * and whenever the database schema changes.
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const logger = require('../utils/logger');

// Convert exec to promise-based for easier async/await usage
const execAsync = util.promisify(exec);

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  NODE_ENV
} = process.env;

/**
 * Create database if it doesn't exist
 * PostgreSQL doesn't have CREATE DATABASE IF NOT EXISTS, so we need to check first
 */
async function createDatabaseIfNotExists() {
  const checkDbCommand = `PGPASSWORD="${DB_PASSWORD}" psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'"`;
  
  try {
    logger.info(`Checking if database '${DB_NAME}' exists...`);
    
    // Check if database exists
    const { stdout } = await execAsync(checkDbCommand);
    const dbExists = stdout.trim() === '1';
    
    if (!dbExists) {
      logger.info(`Database '${DB_NAME}' does not exist. Creating...`);
      
      // Create the database
      const createDbCommand = `PGPASSWORD="${DB_PASSWORD}" createdb -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} ${DB_NAME}`;
      await execAsync(createDbCommand);
      
      logger.info(`Database '${DB_NAME}' created successfully`);
    } else {
      logger.info(`Database '${DB_NAME}' already exists`);
    }
    
    return true;
  } catch (error) {
    logger.error('Error checking/creating database:', error.message);
    throw error;
  }
}

/**
 * Run migration files in sequence
 * Migrations are run in alphabetical order (001_, 002_, etc.)
 */
async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
  
  try {
    // Read all migration files
    const files = await fs.readdir(migrationsDir);
    
    // Filter SQL files and sort them
    const sqlFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Natural sort will order 001_, 002_, etc.
    
    logger.info(`Found ${sqlFiles.length} migration files`);
    
    // Run each migration in order
    for (const file of sqlFiles) {
      const filePath = path.join(migrationsDir, file);
      logger.info(`Running migration: ${file}`);
      
      // Read the SQL file
      const sql = await fs.readFile(filePath, 'utf8');
      
      // Execute the SQL
      const runMigrationCommand = `PGPASSWORD="${DB_PASSWORD}" psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f "${filePath}"`;
      await execAsync(runMigrationCommand);
      
      logger.info(`Migration ${file} completed successfully`);
    }
    
    return sqlFiles.length;
  } catch (error) {
    logger.error('Error running migrations:', error.message);
    throw error;
  }
}

/**
 * Run seed files to populate initial data
 * Seeds are run after migrations
 */
async function runSeeds() {
  const seedsDir = path.join(__dirname, '..', 'database', 'seeds');
  
  try {
    // Check if seeds directory exists
    try {
      await fs.access(seedsDir);
    } catch {
      logger.info('No seeds directory found, skipping seeds');
      return 0;
    }
    
    // Read all seed files
    const files = await fs.readdir(seedsDir);
    const sqlFiles = files.filter(file => file.endsWith('.sql'));
    
    logger.info(`Found ${sqlFiles.length} seed files`);
    
    // Run each seed file
    for (const file of sqlFiles) {
      const filePath = path.join(seedsDir, file);
      logger.info(`Running seed: ${file}`);
      
      // Execute the seed SQL
      const runSeedCommand = `PGPASSWORD="${DB_PASSWORD}" psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME} -f "${filePath}"`;
      await execAsync(runSeedCommand);
      
      logger.info(`Seed ${file} completed successfully`);
    }
    
    return sqlFiles.length;
  } catch (error) {
    logger.error('Error running seeds:', error.message);
    throw error;
  }
}

/**
 * Main function that orchestrates the database setup
 */
async function setupDatabase() {
  logger.info('Starting HMS database setup...');
  logger.info(`Environment: ${NODE_ENV}`);
  
  try {
    // Step 1: Create database if needed
    await createDatabaseIfNotExists();
    
    // Step 2: Run migrations
    const migrationCount = await runMigrations();
    
    // Step 3: Run seeds
    const seedCount = await runSeeds();
    
    logger.info('=========================================');
    logger.info('Database setup completed successfully!');
    logger.info(`Migrations run: ${migrationCount}`);
    logger.info(`Seed files run: ${seedCount}`);
    logger.info('=========================================');
    
    // Test the connection
    logger.info('Testing database connection...');
    const { testConnection } = require('../database/connection');
    const connectionOk = await testConnection();
    
    if (connectionOk) {
      logger.info('✅ Database setup and connection test successful!');
    } else {
      logger.error('❌ Database connection test failed');
      process.exit(1);
    }
    
  } catch (error) {
    logger.error('Database setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupDatabase();
}

// Export for programmatic usage
module.exports = {
  setupDatabase,
  createDatabaseIfNotExists,
  runMigrations,
  runSeeds
};