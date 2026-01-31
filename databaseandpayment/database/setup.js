const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function setupDatabase() {
    try {
        // Read schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute schema
        await pool.query(schemaSQL);
        console.log('Database schema created successfully!');
        
        // Insert more sample data if needed
        const samplePatients = `
            INSERT INTO patients (full_name, gender, date_of_birth, phone, address) VALUES
            ('Mekdes Abebe', 'female', '1990-05-15', '+251911234567', 'Addis Ababa, Bole'),
            ('Yohannes Girma', 'male', '1985-11-22', '+251912345678', 'Addis Ababa, Kazanchis'),
            ('Selamawit Bekele', 'female', '1995-03-08', '+251913456789', 'Addis Ababa, Mexico')
            ON CONFLICT (phone) DO NOTHING;
        `;
        
        await pool.query(samplePatients);
        console.log('Sample data inserted!');
        
    } catch (error) {
        console.error('Error setting up database:', error);
    } finally {
        pool.end();
    }
}

setupDatabase();