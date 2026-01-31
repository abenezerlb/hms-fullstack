const { pool } = require('./db');

async function resetDatabase() {
    try {
        // Drop all tables (be careful - this deletes all data!)
        await pool.query(`
            DROP TABLE IF EXISTS 
                payments, 
                bill_items, 
                services, 
                audit_logs, 
                bills, 
                medical_records, 
                appointments, 
                patients, 
                users 
            CASCADE;
        `);
        
        console.log('All tables dropped successfully.');
        console.log('Run "npm run db:setup" to recreate the database.');
        
    } catch (error) {
        console.error('Error resetting database:', error);
    } finally {
        pool.end();
    }
}

resetDatabase();