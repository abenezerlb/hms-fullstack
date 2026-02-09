/**
 * Cleanup Database Script
 * 
 * Removes problematic tables and resets the database for a fresh start.
 */

const { query } = require('../database/connection');
const logger = require('../utils/logger');

async function cleanupDatabase() {
  logger.warn('⚠️  DATABASE CLEANUP - THIS WILL REMOVE ALL DATA!');
  logger.warn('='.repeat(50));
  
  const tables = [
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
  
  let droppedCount = 0;
  
  for (const table of tables) {
    try {
      await query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      logger.info(`✅ Dropped: ${table}`);
      droppedCount++;
    } catch (error) {
      logger.debug(`Note: Could not drop ${table}: ${error.message}`);
    }
  }
  
  // Also drop any functions that might have been created
  try {
    await query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');
    logger.info('✅ Dropped: update_updated_at_column function');
  } catch (error) {
    logger.debug('Note: Could not drop function');
  }
  
  logger.info('\n' + '='.repeat(50));
  logger.info(`✅ CLEANUP COMPLETE: Dropped ${droppedCount} tables`);
  logger.info('='.repeat(50));
  logger.info('\nNext: Run migrations to recreate the database:');
  logger.info('  node scripts/runMigrationsDirectly.js');
  logger.info('='.repeat(50));
}

// Run if called directly
if (require.main === module) {
  cleanupDatabase().catch(error => {
    logger.error('Cleanup failed:', error);
    process.exit(1);
  });
}

module.exports = { cleanupDatabase };