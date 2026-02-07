#!/usr/bin/env node

/**
 * Complete database setup script
 * Combines: database creation, schema setup, and seeding
 */

require('dotenv').config({ path: '.env' });
const dbManager = require('../database/connection');
const logger = require('../utils/logger');

async function setupDatabase() {
    try {
        logger.info('🚀 Starting HMS Database Setup...');
        
        // Step 1: Initialize connection (creates DB if needed)
        await dbManager.initialize();
        
        // Step 2: Setup schema
        await dbManager.setupSchema();
        
        // Step 3: Seed initial data
        await dbManager.seedInitialData();
        
        // Step 4: Verify setup
        const health = await dbManager.checkHealth();
        logger.info('✅ Database Setup Complete!', health);
        
        // Step 5: Show summary
        await showDatabaseSummary();
        
    } catch (error) {
        logger.error('❌ Database setup failed:', error);
        process.exit(1);
    } finally {
        await dbManager.shutdown();
    }
}

async function showDatabaseSummary() {
    const query = `
        SELECT 
            (SELECT COUNT(*) FROM users) as user_count,
            (SELECT COUNT(*) FROM patients) as patient_count,
            (SELECT COUNT(*) FROM services) as service_count,
            (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as table_count;
    `;
    
    const result = await dbManager.query(query);
    const summary = result.rows[0];
    
    console.log('\n📊 DATABASE SUMMARY:');
    console.log('────────────────────');
    console.log(`Tables Created: ${summary.table_count}`);
    console.log(`Users Seeded: ${summary.user_count}`);
    console.log(`Patients Seeded: ${summary.patient_count}`);
    console.log(`Services Available: ${summary.service_count}`);
    console.log('────────────────────\n');
    
    console.log('🎉 HMS Database is ready!');
    console.log('Next steps:');
    console.log('1. Start the server: npm start');
    console.log('2. Test API endpoints');
    console.log('3. Run tests: npm test\n');
}

// Run if called directly
if (require.main === module) {
    setupDatabase();
}

module.exports = setupDatabase;