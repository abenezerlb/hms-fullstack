const { Pool } = require('pg');
const path = require('path');

// Load .env from project root
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// Debug: Check if env vars are loaded
if (!process.env.DB_PASSWORD) {
    console.warn('⚠️  DB_PASSWORD not found in environment variables');
}

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to PostgreSQL:', err.message);
    } else {
        console.log('Connected to PostgreSQL database:', process.env.DB_NAME);
        release();
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};