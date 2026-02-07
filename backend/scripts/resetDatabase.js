/**
 * Database Reset Script
 * 
 * WARNING: THIS SCRIPT WILL DELETE ALL DATA IN THE DATABASE!
 * Use only for development and testing environments.
 * 
 * This script:
 * 1. Drops all tables and related objects
 * 2. Clears all data
 * 3. Can be used to start fresh during development
 * 
 * Usage: node scripts/resetDatabase.js [--force]
 *   --force: Skip confirmation prompt
 */

const { query, getClient } = require('../database/connection');
const logger = require('../utils/logger');
const readline = require('readline');

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Load environment variables
require('dotenv').config();

const { NODE_ENV, DB_NAME } = process.env;

/**
 * Ask for confirmation before resetting database
 */
function askForConfirmation() {
  return new Promise((resolve) => {
    rl.question(`\n⚠️  WARNING: This will DELETE ALL DATA in database "${DB_NAME}"!\n` +
                `This action cannot be undone.\n\n` +
                `Type "RESET ${DB_NAME}" to confirm: `, (answer) => {
      rl.close();
      resolve(answer === `RESET ${DB_NAME}`);
    });
  });
}

/**
 * Get list of all tables in the database
 */
async function getAllTables() {
  try {
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    return result.rows.map(row => row.table_name);
  } catch (error) {
    logger.error('Error getting table list:', error.message);
    return [];
  }
}

/**
 * Disable triggers to avoid constraint issues during drop
 */
async function disableTriggers(client) {
  try {
    await client.query('SET session_replication_role = replica;');
    logger.info('Database triggers disabled');
    return true;
  } catch (error) {
    logger.error('Error disabling triggers:', error.message);
    return false;
  }
}

/**
 * Enable triggers after reset
 */
async function enableTriggers(client) {
  try {
    await client.query('SET session_replication_role = DEFAULT;');
    logger.info('Database triggers re-enabled');
    return true;
  } catch (error) {
    logger.error('Error enabling triggers:', error.message);
    return false;
  }
}

/**
 * Drop all tables in the correct order (considering foreign keys)
 */
async function dropAllTables(client) {
  try {
    // Get all tables
    const tables = await getAllTables();
    
    if (tables.length === 0) {
      logger.info('No tables found in the database');
      return 0;
    }
    
    logger.info(`Found ${tables.length} tables to drop`);
    
    // Drop tables in reverse order to handle foreign key constraints
    // Custom order based on our schema dependencies
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
      'users',
      'schema_version'
    ];
    
    // Filter to only include tables that actually exist
    const tablesToDrop = dropOrder.filter(table => tables.includes(table));
    
    // Add any remaining tables that weren't in our custom order
    const remainingTables = tables.filter(table => !tablesToDrop.includes(table));
    tablesToDrop.push(...remainingTables);
    
    let droppedCount = 0;
    
    for (const table of tablesToDrop) {
      try {
        await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        logger.info(`✅ Dropped table: ${table}`);
        droppedCount++;
      } catch (error) {
        logger.warn(`⚠️ Could not drop table ${table}:`, error.message);
      }
    }
    
    return droppedCount;
  } catch (error) {
    logger.error('Error dropping tables:', error.message);
    throw error;
  }
}

/**
 * Drop all views in the database
 */
async function dropAllViews(client) {
  try {
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public';
    `);
    
    const views = result.rows.map(row => row.table_name);
    
    if (views.length === 0) {
      logger.info('No views found in the database');
      return 0;
    }
    
    logger.info(`Found ${views.length} views to drop`);
    
    let droppedCount = 0;
    
    for (const view of views) {
      try {
        await client.query(`DROP VIEW IF EXISTS ${view} CASCADE`);
        logger.info(`✅ Dropped view: ${view}`);
        droppedCount++;
      } catch (error) {
        logger.warn(`⚠️ Could not drop view ${view}:`, error.message);
      }
    }
    
    return droppedCount;
  } catch (error) {
    logger.error('Error dropping views:', error.message);
    throw error;
  }
}

/**
 * Drop all functions in the database
 */
async function dropAllFunctions(client) {
  try {
    const result = await client.query(`
      SELECT proname, oidvectortypes(proargtypes) as args
      FROM pg_proc 
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname NOT LIKE 'pg_%';
    `);
    
    const functions = result.rows;
    
    if (functions.length === 0) {
      logger.info('No functions found in the database');
      return 0;
    }
    
    logger.info(`Found ${functions.length} functions to drop`);
    
    let droppedCount = 0;
    
    for (const func of functions) {
      try {
        await client.query(`DROP FUNCTION IF EXISTS ${func.proname}(${func.args || ''}) CASCADE`);
        logger.info(`✅ Dropped function: ${func.proname}`);
        droppedCount++;
      } catch (error) {
        logger.warn(`⚠️ Could not drop function ${func.proname}:`, error.message);
      }
    }
    
    return droppedCount;
  } catch (error) {
    logger.error('Error dropping functions:', error.message);
    throw error;
  }
}

/**
 * Drop all extensions except essential ones
 */
async function dropExtensions(client) {
  try {
    // Keep uuid-ossp as it's needed for our schema
    await client.query(`DROP EXTENSION IF EXISTS "uuid-ossp" CASCADE`);
    logger.info('✅ Dropped extension: uuid-ossp');
    
    return 1;
  } catch (error) {
    logger.warn('⚠️ Could not drop extensions:', error.message);
    return 0;
  }
}

/**
 * Main reset function
 */
async function resetDatabase(force = false) {
  // Safety check for production
  if (NODE_ENV === 'production') {
    logger.error('❌ Database reset is NOT allowed in production environment!');
    process.exit(1);
  }
  
  logger.warn('🚨 DATABASE RESET INITIATED 🚨');
  logger.warn(`Environment: ${NODE_ENV}`);
  logger.warn(`Database: ${DB_NAME}`);
  
  // Ask for confirmation unless force flag is used
  if (!force) {
    const confirmed = await askForConfirmation();
    if (!confirmed) {
      logger.info('Database reset cancelled by user');
      process.exit(0);
    }
  } else {
    logger.warn('Force flag used, skipping confirmation');
  }
  
  let client;
  
  try {
    // Get a database client for transaction
    client = await getClient();
    
    // Start transaction
    await client.query('BEGIN');
    
    // Disable triggers
    await disableTriggers(client);
    
    logger.info('\nStarting database reset...');
    
    // Drop extensions
    const extensionsDropped = await dropExtensions(client);
    
    // Drop views
    const viewsDropped = await dropAllViews(client);
    
    // Drop functions
    const functionsDropped = await dropAllFunctions(client);
    
    // Drop tables
    const tablesDropped = await dropAllTables(client);
    
    // Re-enable triggers
    await enableTriggers(client);
    
    // Commit transaction
    await client.query('COMMIT');
    
    logger.info('\n==========================================');
    logger.info('✅ DATABASE RESET COMPLETED SUCCESSFULLY');
    logger.info('==========================================');
    logger.info(`Extensions dropped: ${extensionsDropped}`);
    logger.info(`Views dropped: ${viewsDropped}`);
    logger.info(`Functions dropped: ${functionsDropped}`);
    logger.info(`Tables dropped: ${tablesDropped}`);
    logger.info('==========================================');
    logger.info('\nNext steps:');
    logger.info('1. Run migrations: node scripts/runMigration.js');
    logger.info('2. Seed data: node scripts/seedDemo.js');
    logger.info('==========================================\n');
    
  } catch (error) {
    // Rollback transaction on error
    if (client) {
      await client.query('ROLLBACK');
      await enableTriggers(client);
      client.release();
    }
    
    logger.error('❌ Database reset failed:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const force = args.includes('--force') || args.includes('-f');

// Run if called directly
if (require.main === module) {
  resetDatabase(force).catch(error => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = resetDatabase;