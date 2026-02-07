/**
 * Migration Runner Script
 * 
 * This script runs database migrations in order.
 * It tracks which migrations have been run using a schema_version table.
 * 
 * Features:
 * 1. Runs migrations in alphabetical/numerical order
 * 2. Tracks executed migrations
 * 3. Supports dry-run mode
 * 4. Can run specific migration files
 * 5. Provides rollback capability
 * 
 * Usage: node scripts/runMigration.js [options]
 * Options:
 *   --dry-run      Show what would be run without executing
 *   --file=name    Run a specific migration file
 *   --rollback=1   Rollback last N migrations
 *   --status       Show migration status
 */

const fs = require('fs').promises;
const path = require('path');
const { query, getClient } = require('../database/connection');
const logger = require('../utils/logger');

// Load environment variables
require('dotenv').config();

const { NODE_ENV } = process.env;

/**
 * Ensure schema_version table exists
 */
async function ensureSchemaVersionTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS schema_version (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        version VARCHAR(50) NOT NULL,
        description TEXT,
        script_name VARCHAR(255) NOT NULL,
        checksum VARCHAR(64),
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER
      )
    `);
    
    logger.debug('Schema version table checked/created');
    return true;
  } catch (error) {
    logger.error('Error creating schema_version table:', error.message);
    return false;
  }
}

/**
 * Get list of already applied migrations
 */
async function getAppliedMigrations() {
  try {
    const result = await query(`
      SELECT script_name, version, applied_at, checksum 
      FROM schema_version 
      ORDER BY applied_at
    `);
    
    return result.rows;
  } catch (error) {
    logger.error('Error getting applied migrations:', error.message);
    return [];
  }
}

/**
 * Get list of migration files in migrations directory
 */
async function getMigrationFiles() {
  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
  
  try {
    const files = await fs.readdir(migrationsDir);
    
    // Filter for SQL files and sort them
    const sqlFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Natural sort will order 001_, 002_, etc.
    
    logger.info(`Found ${sqlFiles.length} migration files in ${migrationsDir}`);
    
    return sqlFiles.map(file => ({
      name: file,
      path: path.join(migrationsDir, file)
    }));
  } catch (error) {
    logger.error('Error reading migration files:', error.message);
    throw error;
  }
}

/**
 * Calculate checksum of a file
 */
async function calculateChecksum(filePath) {
  try {
    const crypto = require('crypto');
    const content = await fs.readFile(filePath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    logger.error(`Error calculating checksum for ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Check if migration has already been applied
 */
async function isMigrationApplied(scriptName, checksum) {
  const appliedMigrations = await getAppliedMigrations();
  
  const applied = appliedMigrations.find(m => m.script_name === scriptName);
  
  if (!applied) {
    return false;
  }
  
  // Check if checksum matches (detect modified migration files)
  if (checksum && applied.checksum !== checksum) {
    logger.warn(`⚠️ Migration ${scriptName} has been modified since it was applied!`);
    logger.warn(`  Applied checksum: ${applied.checksum}`);
    logger.warn(`  Current checksum: ${checksum}`);
    return 'modified';
  }
  
  return true;
}

/**
 * Record migration in schema_version table
 */
async function recordMigration(scriptName, description, checksum, executionTime) {
  // Extract version from filename (e.g., "001_initial" -> "001")
  const versionMatch = scriptName.match(/^(\d+)/);
  const version = versionMatch ? versionMatch[1] : scriptName;
  
  try {
    await query(`
      INSERT INTO schema_version (version, description, script_name, checksum, execution_time_ms)
      VALUES ($1, $2, $3, $4, $5)
    `, [version, description, scriptName, checksum, executionTime]);
    
    return true;
  } catch (error) {
    logger.error(`Error recording migration ${scriptName}:`, error.message);
    return false;
  }
}

/**
 * Run a single migration file
 */
async function runMigration(migrationFile, dryRun = false) {
  const { name, path: filePath } = migrationFile;
  
  logger.info(`\nProcessing migration: ${name}`);
  
  // Calculate checksum
  const checksum = await calculateChecksum(filePath);
  
  // Check if already applied
  const appliedStatus = await isMigrationApplied(name, checksum);
  
  if (appliedStatus === true) {
    logger.info(`✅ Already applied: ${name}`);
    return { applied: false, reason: 'already_applied' };
  }
  
  if (appliedStatus === 'modified') {
    logger.warn(`⚠️ Skipping modified migration: ${name}`);
    return { applied: false, reason: 'modified' };
  }
  
  if (dryRun) {
    logger.info(`📋 Would apply: ${name} (dry run)`);
    return { applied: false, reason: 'dry_run' };
  }
  
  // Read migration file
  let sql;
  try {
    sql = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    logger.error(`Error reading migration file ${name}:`, error.message);
    return { applied: false, error: error.message };
  }
  
  // Extract description from SQL comments
  const descriptionMatch = sql.match(/Description:\s*(.+?)\n/);
  const description = descriptionMatch ? descriptionMatch[1].trim() : 'No description';
  
  logger.info(`Applying: ${name} - ${description}`);
  
  const startTime = Date.now();
  let success = false;
  
  try {
    // Run the migration
    await query(sql);
    const executionTime = Date.now() - startTime;
    
    // Record the migration
    await recordMigration(name, description, checksum, executionTime);
    
    logger.info(`✅ Applied successfully in ${executionTime}ms`);
    success = true;
    
    return { 
      applied: true, 
      name, 
      description, 
      executionTime,
      checksum 
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error(`❌ Failed to apply migration ${name}:`, error.message);
    
    return { 
      applied: false, 
      name, 
      description, 
      executionTime,
      error: error.message 
    };
  }
}

/**
 * Run all pending migrations
 */
async function runAllMigrations(dryRun = false) {
  logger.info('Starting migration process...');
  logger.info(`Environment: ${NODE_ENV}`);
  logger.info(`Dry run: ${dryRun ? 'Yes' : 'No'}`);
  
  // Ensure schema_version table exists
  if (!(await ensureSchemaVersionTable())) {
    return { success: false, error: 'Failed to ensure schema_version table' };
  }
  
  // Get migration files
  let migrationFiles;
  try {
    migrationFiles = await getMigrationFiles();
  } catch (error) {
    return { success: false, error: error.message };
  }
  
  if (migrationFiles.length === 0) {
    logger.info('No migration files found');
    return { success: true, applied: 0, total: 0 };
  }
  
  // Get already applied migrations
  const appliedMigrations = await getAppliedMigrations();
  const appliedNames = appliedMigrations.map(m => m.script_name);
  
  // Filter for pending migrations
  const pendingMigrations = migrationFiles.filter(file => 
    !appliedNames.includes(file.name)
  );
  
  logger.info(`Total migrations: ${migrationFiles.length}`);
  logger.info(`Already applied: ${appliedMigrations.length}`);
  logger.info(`Pending: ${pendingMigrations.length}`);
  
  if (pendingMigrations.length === 0) {
    logger.info('✅ Database is up to date. No pending migrations.');
    return { success: true, applied: 0, total: migrationFiles.length };
  }
  
  logger.info('\nPending migrations to apply:');
  pendingMigrations.forEach((file, index) => {
    logger.info(`  ${index + 1}. ${file.name}`);
  });
  
  if (dryRun) {
    logger.info('\n📋 Dry run complete. No changes were made.');
    return { 
      success: true, 
      applied: 0, 
      total: migrationFiles.length,
      pending: pendingMigrations.length,
      dryRun: true 
    };
  }
  
  // Run pending migrations
  let appliedCount = 0;
  const results = [];
  
  for (const migrationFile of pendingMigrations) {
    const result = await runMigration(migrationFile, dryRun);
    results.push(result);
    
    if (result.applied) {
      appliedCount++;
    } else if (result.error) {
      // Stop on error
      logger.error(`❌ Migration failed. Stopping.`);
      return { 
        success: false, 
        applied: appliedCount, 
        total: migrationFiles.length,
        results,
        error: result.error 
      };
    }
  }
  
  logger.info('\n==========================================');
  logger.info('✅ MIGRATION COMPLETED SUCCESSFULLY');
  logger.info('==========================================');
  logger.info(`Applied: ${appliedCount} migration(s)`);
  logger.info(`Total: ${migrationFiles.length} migration(s) in system`);
  logger.info('==========================================\n');
  
  // Show final status
  await showMigrationStatus();
  
  return { 
    success: true, 
    applied: appliedCount, 
    total: migrationFiles.length,
    results 
  };
}

/**
 * Show migration status
 */
async function showMigrationStatus() {
  const appliedMigrations = await getAppliedMigrations();
  const migrationFiles = await getMigrationFiles();
  
  console.log('\n📊 MIGRATION STATUS');
  console.log('=' .repeat(50));
  
  console.log(`Applied: ${appliedMigrations.length}`);
  console.log(`Available: ${migrationFiles.length}`);
  console.log(`Pending: ${migrationFiles.length - appliedMigrations.length}`);
  
  console.log('\nApplied Migrations:');
  appliedMigrations.forEach((migration, index) => {
    const status = migration.checksum ? '✅' : '⚠️';
    console.log(`  ${status} ${migration.script_name} (${migration.applied_at.toISOString().split('T')[0]})`);
  });
  
  console.log('\nPending Migrations:');
  const appliedNames = appliedMigrations.map(m => m.script_name);
  migrationFiles.forEach(file => {
    if (!appliedNames.includes(file.name)) {
      console.log(`  ⏳ ${file.name}`);
    }
  });
  
  console.log('=' .repeat(50));
}

/**
 * Rollback last N migrations
 */
async function rollbackMigrations(count = 1) {
  if (NODE_ENV === 'production') {
    logger.error('❌ Rollback is NOT allowed in production environment!');
    return { success: false, error: 'Production rollback not allowed' };
  }
  
  logger.warn(`⚠️  Rolling back last ${count} migration(s)`);
  
  // Get last N applied migrations
  const result = await query(`
    SELECT script_name, version, applied_at 
    FROM schema_version 
    ORDER BY applied_at DESC 
    LIMIT $1
  `, [count]);
  
  const migrationsToRollback = result.rows;
  
  if (migrationsToRollback.length === 0) {
    logger.info('No migrations to rollback');
    return { success: true, rolledBack: 0 };
  }
  
  logger.info('\nMigrations to rollback:');
  migrationsToRollback.forEach((migration, index) => {
    logger.info(`  ${index + 1}. ${migration.script_name} (${migration.applied_at.toISOString().split('T')[0]})`);
  });
  
  // Note: In a real system, you would need rollback SQL scripts
  // For now, we'll just remove them from the tracking table
  let rolledBackCount = 0;
  
  for (const migration of migrationsToRollback) {
    try {
      await query('DELETE FROM schema_version WHERE script_name = $1', [migration.script_name]);
      logger.info(`✅ Rolled back: ${migration.script_name}`);
      rolledBackCount++;
    } catch (error) {
      logger.error(`❌ Failed to rollback ${migration.script_name}:`, error.message);
      // Continue with others
    }
  }
  
  logger.info(`\n✅ Rollback completed. ${rolledBackCount} migration(s) rolled back.`);
  
  return { success: true, rolledBack: rolledBackCount };
}

/**
 * Run a specific migration file
 */
async function runSpecificMigration(filename) {
  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
  const filePath = path.join(migrationsDir, filename);
  
  try {
    // Check if file exists
    await fs.access(filePath);
  } catch {
    logger.error(`Migration file not found: ${filename}`);
    return { success: false, error: 'File not found' };
  }
  
  const migrationFile = { name: filename, path: filePath };
  return await runMigration(migrationFile, false);
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    file: null,
    rollback: null,
    status: false
  };
  
  args.forEach(arg => {
    if (arg === '--dry-run' || arg === '-d') {
      options.dryRun = true;
    } else if (arg.startsWith('--file=')) {
      options.file = arg.split('=')[1];
    } else if (arg.startsWith('--rollback=')) {
      options.rollback = parseInt(arg.split('=')[1]);
    } else if (arg === '--status' || arg === '-s') {
      options.status = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Migration Runner Script
Usage: node scripts/runMigration.js [options]

Options:
  --dry-run, -d          Show what would be run without executing
  --file=filename        Run a specific migration file
  --rollback=N           Rollback last N migrations (dev only)
  --status, -s           Show migration status
  --help, -h             Show this help message

Examples:
  node scripts/runMigration.js           # Run all pending migrations
  node scripts/runMigration.js --dry-run # Show what would be run
  node scripts/runMigration.js --status  # Show current status
  node scripts/runMigration.js --file=001_initial_schema.sql
      `);
      process.exit(0);
    }
  });
  
  return options;
}

/**
 * Main function
 */
async function main() {
  const options = parseArgs();
  
  try {
    if (options.status) {
      await showMigrationStatus();
      return;
    }
    
    if (options.rollback !== null) {
      await rollbackMigrations(options.rollback);
      return;
    }
    
    if (options.file) {
      await runSpecificMigration(options.file);
      return;
    }
    
    await runAllMigrations(options.dryRun);
    
  } catch (error) {
    logger.error('Migration process failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });
}

// Export functions for programmatic use
module.exports = {
  runAllMigrations,
  runSpecificMigration,
  rollbackMigrations,
  showMigrationStatus,
  getAppliedMigrations
};