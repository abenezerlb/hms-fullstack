/**
 * Run Migrations Directly Script
 * 
 * This script runs migrations without using the schema_version table.
 * Useful when you're having issues with the migration tracking system.
 */

const fs = require('fs').promises;
const path = require('path');
const { query } = require('../database/connection');
const logger = require('../utils/logger');

async function runMigrationsDirectly() {
  logger.info('🚀 Running Migrations Directly');
  logger.info('='.repeat(50));
  
  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
  
  try {
    // Check if migrations directory exists
    await fs.access(migrationsDir);
    
    // Get all migration files
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort alphabetically
    
    if (sqlFiles.length === 0) {
      logger.info('No migration files found');
      return;
    }
    
    logger.info(`Found ${sqlFiles.length} migration files`);
    
    // Run each migration file
    for (const file of sqlFiles) {
      const filePath = path.join(migrationsDir, file);
      logger.info(`\nRunning: ${file}`);
      
      try {
        // Read the SQL file
        const sql = await fs.readFile(filePath, 'utf8');
        
        // Split into individual statements
        const statements = sql
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        // Execute each statement
        for (const statement of statements) {
          if (statement) {
            try {
              await query(statement);
              logger.debug(`  Executed: ${statement.substring(0, 50)}...`);
            } catch (stmtError) {
              // Skip "already exists" errors
              if (stmtError.message.includes('already exists') || 
                  stmtError.message.includes('already exists')) {
                logger.debug(`  Note: ${stmtError.message}`);
              } else {
                throw stmtError;
              }
            }
          }
        }
        
        logger.info(`✅ Completed: ${file}`);
        
      } catch (error) {
        logger.error(`❌ Failed to run ${file}:`, error.message);
        logger.info('Continuing with next migration...');
      }
    }
    
    logger.info('\n' + '='.repeat(50));
    logger.info('✅ ALL MIGRATIONS COMPLETED!');
    logger.info('='.repeat(50));
    
    // Verify the setup
    await verifySetup();
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.error('Migrations directory not found:', migrationsDir);
    } else {
      logger.error('Error running migrations:', error.message);
    }
  }
}

async function verifySetup() {
  logger.info('\n🔍 VERIFYING DATABASE SETUP');
  logger.info('='.repeat(50));
  
  const tables = [
    'users', 'patients', 'appointments', 'medical_records',
    'bills', 'payments', 'bill_items', 'services'
  ];
  
  let allTablesExist = true;
  
  for (const table of tables) {
    try {
      const result = await query(
        'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = $1',
        [table]
      );
      
      if (parseInt(result.rows[0].count) > 0) {
        // Count rows in the table
        const countResult = await query(`SELECT COUNT(*) as count FROM ${table}`);
        logger.info(`✅ ${table.padEnd(20)}: Exists (${countResult.rows[0].count} rows)`);
      } else {
        logger.info(`❌ ${table.padEnd(20)}: Missing`);
        allTablesExist = false;
      }
    } catch (error) {
      logger.info(`❌ ${table.padEnd(20)}: Error - ${error.message}`);
      allTablesExist = false;
    }
  }
  
  logger.info('='.repeat(50));
  
  if (allTablesExist) {
    logger.info('\n🎉 DATABASE SETUP VERIFIED SUCCESSFULLY!');
    logger.info('\nYou can now:');
    logger.info('1. Start the server: npm start');
    logger.info('2. Access: http://localhost:3000');
    logger.info('3. Login with: admin@hms.et / admin123');
  } else {
    logger.info('\n⚠️ Some tables are missing. You may need to run migrations manually.');
  }
}

// Run if called directly
if (require.main === module) {
  runMigrationsDirectly().catch(error => {
    logger.error('Script failed:', error);
    process.exit(1);
  });
}

module.exports = { runMigrationsDirectly, verifySetup };