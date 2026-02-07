#!/usr/bin/env node

/**
 * SAFE Database Reset Script
 * Asks for confirmation before deleting data
 */

require('dotenv').config({ path: '.env' });
const readline = require('readline');
const dbManager = require('../database/connection');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function resetDatabase() {
    try {
        console.log('⚠️  ⚠️  ⚠️  WARNING: DATABASE RESET ⚠️  ⚠️  ⚠️');
        console.log('This will DELETE ALL DATA in the database!');
        console.log(`Database: ${process.env.DB_NAME}`);
        console.log('\nType "RESET" to confirm:');
        
        const answer = await new Promise(resolve => {
            rl.question('> ', resolve);
        });
        
        if (answer !== 'RESET') {
            console.log('Reset cancelled.');
            rl.close();
            return;
        }
        
        console.log('🔄 Resetting database...');
        
        // Initialize connection
        await dbManager.initialize();
        
        // Drop all tables (in correct order due to foreign keys)
        const dropOrder = [
            'payments', 'bill_items', 'audit_logs', 'bills', 
            'medical_records', 'appointments', 'sessions',
            'patients', 'users', 'services'
        ];
        
        for (const table of dropOrder) {
            try {
                await dbManager.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
                console.log(`  Dropped: ${table}`);
            } catch (error) {
                // Table might not exist yet
            }
        }
        
        // Drop triggers and functions
        await dbManager.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE');
        
        console.log('✅ Database reset complete.');
        console.log('\nRun "npm run db:setup" to recreate the database.');
        
    } catch (error) {
        console.error('❌ Reset failed:', error.message);
    } finally {
        rl.close();
        await dbManager.shutdown();
        process.exit(0);
    }
}

resetDatabase();