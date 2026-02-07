/**
 * Database Backup Script
 * 
 * This script creates a backup of the HMS database.
 * It can create both SQL dump files and compressed backups.
 * 
 * Features:
 * 1. Creates timestamped backup files
 * 2. Supports full and partial backups
 * 3. Can compress backups to save space
 * 4. Maintains backup rotation
 * 
 * Usage: node scripts/backupDatabase.js [options]
 * Options:
 *   --type=full|schema|data  Type of backup (default: full)
 *   --compress               Compress the backup file
 *   --output=path           Custom output directory
 *   --keep=number           Number of backups to keep (default: 7)
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const execAsync = util.promisify(exec);

// Load environment variables
require('dotenv').config();

const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  NODE_ENV
} = process.env;

// Default backup directory
const DEFAULT_BACKUP_DIR = path.join(__dirname, '..', 'backups');
const DEFAULT_KEEP_COUNT = 7; // Keep 7 days of backups

/**
 * Ensure backup directory exists
 */
async function ensureBackupDir(backupDir) {
  try {
    await fs.mkdir(backupDir, { recursive: true });
    logger.info(`Backup directory: ${backupDir}`);
    return true;
  } catch (error) {
    logger.error(`Error creating backup directory: ${error.message}`);
    return false;
  }
}

/**
 * Generate backup filename with timestamp
 */
function generateBackupFilename(backupType, compress = false) {
  const timestamp = new Date().toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .split('.')[0];
  
  const baseName = `${DB_NAME}_${backupType}_${timestamp}`;
  
  return compress ? `${baseName}.sql.gz` : `${baseName}.sql`;
}

/**
 * Create full database backup
 */
async function createFullBackup(outputPath, compress = false) {
  const dumpCommand = `PGPASSWORD="${DB_PASSWORD}" pg_dump \
    -h ${DB_HOST} \
    -p ${DB_PORT} \
    -U ${DB_USER} \
    -d ${DB_NAME} \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --encoding=UTF8 \
    --format=plain`;
  
  const finalCommand = compress 
    ? `${dumpCommand} | gzip > "${outputPath}"`
    : `${dumpCommand} > "${outputPath}"`;
  
  try {
    logger.info(`Creating full backup to: ${outputPath}`);
    logger.info(`Compression: ${compress ? 'Enabled' : 'Disabled'}`);
    
    const { stdout, stderr } = await execAsync(finalCommand, { shell: true });
    
    if (stderr && !stderr.includes('WARNING')) {
      logger.warn(`Backup warnings: ${stderr}`);
    }
    
    // Check if file was created
    const stats = await fs.stat(outputPath);
    const fileSize = (stats.size / 1024 / 1024).toFixed(2); // MB
    
    logger.info(`✅ Backup created successfully: ${fileSize} MB`);
    return true;
  } catch (error) {
    logger.error(`❌ Backup failed: ${error.message}`);
    if (error.stderr) {
      logger.error(`Error details: ${error.stderr}`);
    }
    return false;
  }
}

/**
 * Create schema-only backup (no data)
 */
async function createSchemaBackup(outputPath, compress = false) {
  const dumpCommand = `PGPASSWORD="${DB_PASSWORD}" pg_dump \
    -h ${DB_HOST} \
    -p ${DB_PORT} \
    -U ${DB_USER} \
    -d ${DB_NAME} \
    --schema-only \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --encoding=UTF8 \
    --format=plain`;
  
  const finalCommand = compress 
    ? `${dumpCommand} | gzip > "${outputPath}"`
    : `${dumpCommand} > "${outputPath}"`;
  
  try {
    logger.info(`Creating schema backup to: ${outputPath}`);
    
    const { stdout, stderr } = await execAsync(finalCommand, { shell: true });
    
    if (stderr && !stderr.includes('WARNING')) {
      logger.warn(`Backup warnings: ${stderr}`);
    }
    
    const stats = await fs.stat(outputPath);
    const fileSize = (stats.size / 1024).toFixed(2); // KB
    
    logger.info(`✅ Schema backup created: ${fileSize} KB`);
    return true;
  } catch (error) {
    logger.error(`❌ Schema backup failed: ${error.message}`);
    return false;
  }
}

/**
 * Create data-only backup (no schema)
 */
async function createDataBackup(outputPath, compress = false) {
  const dumpCommand = `PGPASSWORD="${DB_PASSWORD}" pg_dump \
    -h ${DB_HOST} \
    -p ${DB_PORT} \
    -U ${DB_USER} \
    -d ${DB_NAME} \
    --data-only \
    --encoding=UTF8 \
    --format=plain`;
  
  const finalCommand = compress 
    ? `${dumpCommand} | gzip > "${outputPath}"`
    : `${dumpCommand} > "${outputPath}"`;
  
  try {
    logger.info(`Creating data backup to: ${outputPath}`);
    
    const { stdout, stderr } = await execAsync(finalCommand, { shell: true });
    
    if (stderr && !stderr.includes('WARNING')) {
      logger.warn(`Backup warnings: ${stderr}`);
    }
    
    const stats = await fs.stat(outputPath);
    const fileSize = (stats.size / 1024 / 1024).toFixed(2); // MB
    
    logger.info(`✅ Data backup created: ${fileSize} MB`);
    return true;
  } catch (error) {
    logger.error(`❌ Data backup failed: ${error.message}`);
    return false;
  }
}

/**
 * List existing backups
 */
async function listBackups(backupDir) {
  try {
    const files = await fs.readdir(backupDir);
    const backupFiles = files
      .filter(file => file.endsWith('.sql') || file.endsWith('.sql.gz'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        return {
          name: file,
          path: filePath,
          fullPath: filePath
        };
      })
      .sort((a, b) => b.name.localeCompare(a.name)); // Newest first
    
    return backupFiles;
  } catch (error) {
    logger.error(`Error listing backups: ${error.message}`);
    return [];
  }
}

/**
 * Rotate old backups (keep only specified number)
 */
async function rotateBackups(backupDir, keepCount) {
  try {
    const backups = await listBackups(backupDir);
    
    if (backups.length <= keepCount) {
      logger.info(`No rotation needed. Current backups: ${backups.length}, Keep limit: ${keepCount}`);
      return 0;
    }
    
    const toDelete = backups.slice(keepCount);
    let deletedCount = 0;
    
    logger.info(`Rotating backups. Keeping ${keepCount}, deleting ${toDelete.length} old backups`);
    
    for (const backup of toDelete) {
      try {
        await fs.unlink(backup.fullPath);
        logger.info(`🗑️  Deleted old backup: ${backup.name}`);
        deletedCount++;
      } catch (error) {
        logger.warn(`Could not delete backup ${backup.name}: ${error.message}`);
      }
    }
    
    logger.info(`✅ Backup rotation completed. Deleted ${deletedCount} files`);
    return deletedCount;
  } catch (error) {
    logger.error(`Error rotating backups: ${error.message}`);
    return 0;
  }
}

/**
 * Restore database from backup
 * Note: This is a separate function that could be called from another script
 */
async function restoreDatabase(backupPath) {
  // Safety check for production
  if (NODE_ENV === 'production') {
    logger.error('❌ Database restore is NOT allowed in production via script!');
    return false;
  }
  
  const isCompressed = backupPath.endsWith('.gz');
  
  let restoreCommand;
  
  if (isCompressed) {
    restoreCommand = `gunzip -c "${backupPath}" | PGPASSWORD="${DB_PASSWORD}" psql \
      -h ${DB_HOST} \
      -p ${DB_PORT} \
      -U ${DB_USER} \
      -d ${DB_NAME}`;
  } else {
    restoreCommand = `PGPASSWORD="${DB_PASSWORD}" psql \
      -h ${DB_HOST} \
      -p ${DB_PORT} \
      -U ${DB_USER} \
      -d ${DB_NAME} \
      -f "${backupPath}"`;
  }
  
  try {
    logger.info(`Restoring database from: ${backupPath}`);
    
    const { stdout, stderr } = await execAsync(restoreCommand, { shell: true });
    
    if (stderr && !stderr.includes('WARNING')) {
      logger.warn(`Restore warnings: ${stderr}`);
    }
    
    logger.info('✅ Database restored successfully');
    return true;
  } catch (error) {
    logger.error(`❌ Database restore failed: ${error.message}`);
    if (error.stderr) {
      logger.error(`Error details: ${error.stderr}`);
    }
    return false;
  }
}

/**
 * Main backup function
 */
async function backupDatabase(options = {}) {
  const {
    type = 'full', // full, schema, data
    compress = false,
    outputDir = DEFAULT_BACKUP_DIR,
    keep = DEFAULT_KEEP_COUNT
  } = options;
  
  logger.info('Starting database backup...');
  logger.info(`Environment: ${NODE_ENV}`);
  logger.info(`Database: ${DB_NAME}`);
  logger.info(`Backup type: ${type}`);
  logger.info(`Output directory: ${outputDir}`);
  
  // Validate backup type
  const validTypes = ['full', 'schema', 'data'];
  if (!validTypes.includes(type)) {
    logger.error(`Invalid backup type: ${type}. Must be one of: ${validTypes.join(', ')}`);
    return false;
  }
  
  // Ensure backup directory exists
  if (!(await ensureBackupDir(outputDir))) {
    return false;
  }
  
  // Generate backup filename
  const filename = generateBackupFilename(type, compress);
  const outputPath = path.join(outputDir, filename);
  
  let success = false;
  
  // Create backup based on type
  switch (type) {
    case 'full':
      success = await createFullBackup(outputPath, compress);
      break;
    case 'schema':
      success = await createSchemaBackup(outputPath, compress);
      break;
    case 'data':
      success = await createDataBackup(outputPath, compress);
      break;
  }
  
  if (success) {
    // Rotate old backups
    await rotateBackups(outputDir, keep);
    
    // List current backups
    const backups = await listBackups(outputDir);
    logger.info(`\nCurrent backups (${backups.length} total):`);
    backups.forEach((backup, index) => {
      const prefix = index < keep ? '✅' : '🗑️ ';
      logger.info(`  ${prefix} ${backup.name}`);
    });
    
    logger.info('\n==========================================');
    logger.info('✅ BACKUP COMPLETED SUCCESSFULLY');
    logger.info('==========================================');
    logger.info(`Backup file: ${filename}`);
    logger.info(`Backup size: ${(require('fs').statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
    logger.info(`Location: ${outputPath}`);
    logger.info('==========================================\n');
  }
  
  return success;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    type: 'full',
    compress: false,
    output: DEFAULT_BACKUP_DIR,
    keep: DEFAULT_KEEP_COUNT
  };
  
  args.forEach(arg => {
    if (arg.startsWith('--type=')) {
      options.type = arg.split('=')[1];
    } else if (arg === '--compress' || arg === '-c') {
      options.compress = true;
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1];
    } else if (arg.startsWith('--keep=')) {
      options.keep = parseInt(arg.split('=')[1]);
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Database Backup Script
Usage: node scripts/backupDatabase.js [options]

Options:
  --type=full|schema|data  Type of backup (default: full)
  --compress, -c           Compress the backup file
  --output=path           Custom output directory
  --keep=number           Number of backups to keep (default: 7)
  --help, -h              Show this help message

Examples:
  node scripts/backupDatabase.js
  node scripts/backupDatabase.js --type=schema --compress
  node scripts/backupDatabase.js --output=./my-backups --keep=30
      `);
      process.exit(0);
    }
  });
  
  return options;
}

// Run if called directly
if (require.main === module) {
  const options = parseArgs();
  backupDatabase(options).catch(error => {
    logger.error('Unhandled error:', error);
    process.exit(1);
  });
}

// Export functions for programmatic use
module.exports = {
  backupDatabase,
  restoreDatabase,
  listBackups,
  rotateBackups
};