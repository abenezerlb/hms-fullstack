/**
 * Quick Start Script
 * 
 * Sets up everything from scratch without dependencies.
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const logger = require('../utils/logger');

const execAsync = util.promisify(exec);

// Load environment variables
require('dotenv').config();

const {
  DB_HOST = 'localhost',
  DB_PORT = 5432,
  DB_USER = 'postgres',
  DB_PASSWORD = 'postgres',
  DB_NAME = 'hms',
  NODE_ENV = 'development'
} = process.env;

/**
 * Create a fresh .env file if it doesn't exist
 */
async function createEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  
  try {
    await fs.access(envPath);
    logger.info('.env file already exists');
  } catch {
    logger.info('Creating .env file...');
    
    const envContent = `# Database Configuration
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}

# Application Configuration
NODE_ENV=${NODE_ENV}
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=24h
PORT=3000

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password

# Payment Gateway (Ethiopia)
TELEBIRR_API_KEY=your-telebirr-api-key
CBE_BIRR_API_KEY=your-cbe-birr-api-key
`;
    
    await fs.writeFile(envPath, envContent);
    logger.info('✅ Created .env file with default values');
  }
}

/**
 * Install dependencies
 */
async function installDependencies() {
  logger.info('Installing dependencies...');
  
  try {
    const { stdout, stderr } = await execAsync('npm install');
    if (stderr && !stderr.includes('WARN')) {
      logger.warn('npm install warnings:', stderr);
    }
    logger.info('✅ Dependencies installed');
  } catch (error) {
    logger.error('Failed to install dependencies:', error.message);
    throw error;
  }
}

/**
 * Create a simple database schema directly
 */
async function createSimpleSchema() {
  logger.info('Creating simple database schema...');
  
  const schemaSQL = `
-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    appointment_date TIMESTAMP NOT NULL,
    appointment_type VARCHAR(50) DEFAULT 'consultation',
    status VARCHAR(20) DEFAULT 'scheduled' 
        CHECK (status IN ('scheduled', 'confirmed', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show')),
    reason TEXT,
    notes TEXT,
    duration_minutes INTEGER DEFAULT 30,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert admin user (password: admin123 - hashed)
INSERT INTO users (name, email, password, role, specialization, phone) 
VALUES ('Admin User', 'admin@hms.et', '$2b$10$YourHashedPasswordHere', 'admin', 'Administration', '+251911111111')
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (name, email, password, role, specialization, phone) 
VALUES ('Dr. Alemayehu Teklu', 'alex@hms.et', '$2b$10$YourHashedPasswordHere', 'doctor', 'Cardiology', '+251922222222')
ON CONFLICT (email) DO NOTHING;

-- Insert sample patient
INSERT INTO patients (full_name, gender, date_of_birth, phone, email, address, emergency_contact, blood_type, allergies) 
VALUES ('Mekdes Abebe', 'female', '1990-05-15', '+251911234567', 'mekdes@email.com', 'Addis Ababa, Bole', '+251912345678', 'O+', 'Penicillin')
ON CONFLICT (phone) DO NOTHING;
`;
  
  // Save this as a simple migration file
  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
  await fs.mkdir(migrationsDir, { recursive: true });
  
  await fs.writeFile(
    path.join(migrationsDir, '001_simple_schema.sql'),
    schemaSQL
  );
  
  logger.info('✅ Created simple schema migration');
}

/**
 * Create a basic database connection that works
 */
async function createBasicConnection() {
  const connectionPath = path.join(__dirname, '..', 'database', 'connection.js');
  
  const connectionCode = `/**
 * Basic Database Connection
 * Simplified version for development
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

const {
  DB_HOST = 'localhost',
  DB_PORT = 5432,
  DB_USER = 'postgres',
  DB_PASSWORD = 'postgres',
  DB_NAME = 'hms',
  NODE_ENV = 'development'
} = process.env;

// Create connection pool
const pool = new Pool({
  host: DB_HOST,
  port: parseInt(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

// Test connection on startup
pool.on('connect', () => {
  logger.info('Database connected');
});

pool.on('error', (err) => {
  logger.error('Database error:', err.message);
});

/**
 * Test database connection
 */
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    client.release();
    
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error.message);
    return false;
  }
};

/**
 * Execute a query
 */
const query = (text, params) => {
  return pool.query(text, params);
};

/**
 * Get a client for transactions
 */
const getClient = async () => {
  return await pool.connect();
};

module.exports = {
  pool,
  query,
  getClient,
  testConnection
};
`;
  
  await fs.writeFile(connectionPath, connectionCode);
  logger.info('✅ Created basic database connection');
}

/**
 * Create a simple logger if it doesn't exist
 */
async function createSimpleLogger() {
  const loggerPath = path.join(__dirname, '..', 'utils', 'logger.js');
  
  try {
    await fs.access(loggerPath);
    logger.info('Logger already exists');
  } catch {
    const loggerCode = `/**
 * Simple Logger
 */

const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'hms-backend' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          return \`\${timestamp} \${level}: \${message} \${Object.keys(meta).length ? JSON.stringify(meta) : ''}\`;
        })
      )
    })
  ]
});

module.exports = logger;
`;
    
    const utilsDir = path.join(__dirname, '..', 'utils');
    await fs.mkdir(utilsDir, { recursive: true });
    await fs.writeFile(loggerPath, loggerCode);
    logger.info('✅ Created simple logger');
  }
}

/**
 * Main quick start function
 */
async function quickStart() {
  console.log('🚀 HMS QUICK START');
  console.log('='.repeat(50));
  
  try {
    // Step 1: Create .env file
    await createEnvFile();
    
    // Step 2: Install dependencies
    await installDependencies();
    
    // Step 3: Create basic files
    await createSimpleLogger();
    await createBasicConnection();
    await createSimpleSchema();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ QUICK START COMPLETE!');
    console.log('='.repeat(50));
    console.log('\nNext steps:');
    console.log('1. Make sure PostgreSQL is running');
    console.log('2. Test connection: node scripts/testConnection.js');
    console.log('3. Start server: npm start');
    console.log('4. Login with: admin@hms.et / admin123');
    console.log('\nTroubleshooting:');
    console.log('- If PostgreSQL not running:');
    console.log('  Windows: Start PostgreSQL service');
    console.log('  Linux/Mac: sudo systemctl start postgresql');
    console.log('- To create database manually:');
    console.log('  psql -U postgres -c "CREATE DATABASE hms;"');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('❌ Quick start failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  quickStart();
}

module.exports = { quickStart };