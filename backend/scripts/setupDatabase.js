/**
 * Simple Database Setup Script
 * For beginners or when the main setup script fails
 */

const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

// Load environment variables
require('dotenv').config();

const {
  DB_HOST = 'localhost',
  DB_PORT = 5432,
  DB_USER = 'postgres',
  DB_PASSWORD = 'postgres',
  DB_NAME = 'hms'
} = process.env;

/**
 * Create a simple schema directly
 */
const simpleSchema = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
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

-- Patients table
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

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);

-- Insert admin user (password: admin123)
INSERT INTO users (name, email, password, role, specialization, phone) 
VALUES ('Admin User', 'admin@hms.et', '$2b$10$YourHashedPasswordHere', 'admin', 'Administration', '+251911111111')
ON CONFLICT (email) DO NOTHING;

-- Insert sample doctor
INSERT INTO users (name, email, password, role, specialization, phone) 
VALUES ('Dr. Alemayehu Teklu', 'alex@hms.et', '$2b$10$YourHashedPasswordHere', 'doctor', 'Cardiology', '+251922222222')
ON CONFLICT (email) DO NOTHING;

-- Insert sample patient
INSERT INTO patients (full_name, gender, date_of_birth, phone, email, address, emergency_contact, blood_type, allergies) 
VALUES ('Mekdes Abebe', 'female', '1990-05-15', '+251911234567', 'mekdes@email.com', 'Addis Ababa, Bole', '+251912345678', 'O+', 'Penicillin')
ON CONFLICT (phone) DO NOTHING;
`;

/**
 * Simple setup without external dependencies
 */
async function simpleSetup() {
  logger.info('🚀 Starting Simple Database Setup');
  logger.info('This script will create a basic HMS database structure.');
  
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: 'postgres' // Connect to default database first
  });
  
  try {
    // Connect to PostgreSQL
    await client.connect();
    logger.info('✅ Connected to PostgreSQL');
    
    // Check if database exists
    const dbCheck = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [DB_NAME]
    );
    
    if (dbCheck.rows.length === 0) {
      // Create database
      logger.info(`Creating database: ${DB_NAME}`);
      await client.query(`CREATE DATABASE ${DB_NAME}`);
      logger.info(`✅ Database created: ${DB_NAME}`);
    } else {
      logger.info(`✅ Database already exists: ${DB_NAME}`);
    }
    
    // Close connection to postgres database
    await client.end();
    
    // Connect to the new database
    const dbClient = new Client({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME
    });
    
    await dbClient.connect();
    logger.info(`✅ Connected to database: ${DB_NAME}`);
    
    // Create tables
    logger.info('Creating tables...');
    await dbClient.query(simpleSchema);
    logger.info('✅ Tables created successfully');
    
    // Test the setup
    const usersCount = await dbClient.query('SELECT COUNT(*) FROM users');
    const patientsCount = await dbClient.query('SELECT COUNT(*) FROM patients');
    
    logger.info('\n📊 Setup Summary:');
    logger.info(`Users created: ${usersCount.rows[0].count}`);
    logger.info(`Patients created: ${patientsCount.rows[0].count}`);
    
    await dbClient.end();
    
    logger.info('\n' + '='.repeat(50));
    logger.info('✅ SIMPLE SETUP COMPLETED!');
    logger.info('='.repeat(50));
    logger.info('\nYou can now:');
    logger.info('1. Login with: admin@hms.et / admin123');
    logger.info('2. Run the server: npm start');
    logger.info('3. Access: http://localhost:3000');
    logger.info('='.repeat(50));
    
  } catch (error) {
    logger.error('❌ Setup failed:', error.message);
    
    logger.info('\nTroubleshooting:');
    logger.info('1. Is PostgreSQL installed and running?');
    logger.info('2. Check your connection details:');
    logger.info(`   Host: ${DB_HOST}`);
    logger.info(`   Port: ${DB_PORT}`);
    logger.info(`   User: ${DB_USER}`);
    logger.info('3. Try these commands:');
    logger.info('   Linux/Mac: sudo systemctl status postgresql');
    logger.info('   Windows: Check PostgreSQL service in Services');
    logger.info('4. Default credentials: postgres / postgres');
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  simpleSetup();
}

module.exports = { simpleSetup };