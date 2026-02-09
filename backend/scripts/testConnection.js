/**
 * Database Connection Test Script
 * 
 * Tests the database connection and shows configuration details.
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

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

async function testConnection() {
  console.log('🔍 DATABASE CONNECTION TEST');
  console.log('='.repeat(50));
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Host: ${DB_HOST}`);
  console.log(`Port: ${DB_PORT}`);
  console.log(`User: ${DB_USER}`);
  console.log(`Database: ${DB_NAME}`);
  console.log(`Password: ${DB_PASSWORD ? '***' + DB_PASSWORD.slice(-3) : 'Not set'}`);
  console.log('='.repeat(50));
  
  // Test 1: Try to connect to PostgreSQL (postgres database)
  console.log('\n1. Testing PostgreSQL connection...');
  try {
    const adminPool = new Pool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: 'postgres',
      connectionTimeoutMillis: 5000
    });
    
    const client = await adminPool.connect();
    const result = await client.query('SELECT version()');
    client.release();
    await adminPool.end();
    
    console.log('✅ PostgreSQL connection successful!');
    console.log(`   Version: ${result.rows[0].version.split(',')[0]}`);
  } catch (error) {
    console.log('❌ Cannot connect to PostgreSQL:', error.message);
    console.log('\nPossible solutions:');
    console.log('1. Is PostgreSQL running?');
    console.log('2. Check your .env file configuration');
    console.log('3. Check firewall settings');
    console.log('4. Try: psql -h localhost -p 5432 -U postgres');
    return false;
  }
  
  // Test 2: Check if database exists
  console.log('\n2. Checking if database exists...');
  try {
    const adminPool = new Pool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: 'postgres',
      connectionTimeoutMillis: 5000
    });
    
    const client = await adminPool.connect();
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [DB_NAME]
    );
    client.release();
    await adminPool.end();
    
    if (result.rows.length > 0) {
      console.log(`✅ Database '${DB_NAME}' exists`);
    } else {
      console.log(`❌ Database '${DB_NAME}' does not exist`);
      console.log('\nTo create it, run:');
      console.log(`  psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -c "CREATE DATABASE ${DB_NAME};"`);
    }
  } catch (error) {
    console.log('❌ Error checking database:', error.message);
  }
  
  // Test 3: Try to connect to the HMS database
  console.log('\n3. Testing HMS database connection...');
  try {
    const hmsPool = new Pool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      connectionTimeoutMillis: 5000
    });
    
    const client = await hmsPool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    client.release();
    await hmsPool.end();
    
    console.log('✅ HMS database connection successful!');
    console.log(`   Current time: ${result.rows[0].current_time}`);
  } catch (error) {
    console.log('❌ Cannot connect to HMS database:', error.message);
    
    if (error.message.includes('does not exist')) {
      console.log('\nTo fix: Create the database first');
      console.log(`  psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -c "CREATE DATABASE ${DB_NAME};"`);
    } else if (error.message.includes('password authentication')) {
      console.log('\nTo fix: Check your password in .env file');
    }
  }
  
  // Test 4: Check for common issues
  console.log('\n4. Checking for common issues...');
  
  // Check if port is in use
  const net = require('net');
  const socket = new net.Socket();
  
  await new Promise((resolve) => {
    socket.setTimeout(2000);
    socket.on('connect', () => {
      console.log('✅ Port 5432 is reachable');
      socket.destroy();
      resolve();
    });
    socket.on('timeout', () => {
      console.log('❌ Port 5432 timeout - PostgreSQL may not be running');
      socket.destroy();
      resolve();
    });
    socket.on('error', () => {
      console.log('❌ Port 5432 connection refused');
      socket.destroy();
      resolve();
    });
    socket.connect(DB_PORT, DB_HOST);
  });
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 SUMMARY');
  console.log('='.repeat(50));
  console.log('To fix connection issues:');
  console.log('1. Start PostgreSQL service');
  console.log('2. Check .env file configuration');
  console.log('3. Create database if needed');
  console.log('4. Test with: psql -h localhost -p 5432 -U postgres');
  console.log('='.repeat(50));
}

// Run if called directly
if (require.main === module) {
  testConnection().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testConnection };