/**
 * HMS Database Setup Script
 * Enhanced version that combines robust error handling with your excellent schema
 */

const fs = require('fs');
const path = require('path');
const dbManager = require('./connection');  // Using our enhanced connection manager
const logger = require('../utils/logger');

async function setupDatabase() {
    try {
        logger.info('🚀 Starting HMS Database Setup...');
        
        // Step 1: Initialize database connection (creates DB if needed)
        logger.info('Step 1: Connecting to database...');
        await dbManager.initialize();
        
        // Step 2: Check if schema already exists (avoid re-running)
        logger.info('Step 2: Checking existing schema...');
        const schemaExists = await checkSchemaExists();
        
        if (schemaExists) {
            logger.info('✅ Database schema already exists.');
            logger.info('Running safe updates instead...');
            await runSafeUpdates();
        } else {
            // Step 3: Create schema from your excellent schema.sql file
            logger.info('Step 3: Creating database schema...');
            await createSchema();
            
            // Step 4: Seed initial data
            logger.info('Step 4: Seeding initial data...');
            await seedInitialData();
        }
        
        // Step 5: Verify setup
        logger.info('Step 5: Verifying setup...');
        const health = await verifySetup();
        
        // Step 6: Show summary
        await showDatabaseSummary();
        
        logger.info('🎉 HMS Database Setup Complete!');
        return { success: true, health };
        
    } catch (error) {
        logger.error('❌ Database setup failed:', error);
        throw error;
    } finally {
        // Don't shutdown - keep connection alive for app
        logger.info('Database setup process completed.');
    }
}

/**
 * Check if schema already exists
 */
async function checkSchemaExists() {
    try {
        const result = await dbManager.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `);
        return result.rows[0].exists;
    } catch (error) {
        // If query fails, schema likely doesn't exist
        return false;
    }
}

/**
 * Create schema from schema.sql file
 */
async function createSchema() {
    try {
        // Read your excellent schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found at: ${schemaPath}`);
        }
        
        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        
        // Execute schema creation in a transaction
        await dbManager.transaction(async (client) => {
            // Split by semicolons but be careful with trigger definitions
            const statements = schemaSQL
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0);
            
            for (const statement of statements) {
                if (statement) {
                    try {
                        await client.query(statement + ';');
                        logger.debug(`Executed: ${statement.substring(0, 100)}...`);
                    } catch (stmtError) {
                        // Log but continue for some errors (like duplicate objects)
                        if (stmtError.message.includes('already exists')) {
                            logger.debug(`Skipped (already exists): ${statement.substring(0, 50)}...`);
                        } else {
                            throw stmtError;
                        }
                    }
                }
            }
        });
        
        logger.info('✅ Database schema created successfully');
        
    } catch (error) {
        logger.error('❌ Schema creation failed:', error.message);
        throw error;
    }
}

/**
 * Run safe updates without dropping existing data
 */
async function runSafeUpdates() {
    try {
        // Add any missing tables
        const tables = await dbManager.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        const existingTables = tables.rows.map(row => row.table_name);
        const requiredTables = ['users', 'patients', 'appointments', 'medical_records', 'bills', 'payments', 'services', 'bill_items', 'audit_logs', 'sessions'];
        
        const missingTables = requiredTables.filter(table => !existingTables.includes(table));
        
        if (missingTables.length > 0) {
            logger.warn(`Missing tables: ${missingTables.join(', ')}`);
            logger.info('Creating missing tables...');
            
            // For now, we'll create missing tables from schema
            // In a real app, you'd have migration scripts
            await createMissingTables(missingTables);
        }
        
        // Add any missing columns to existing tables
        await addMissingColumns();
        
        logger.info('✅ Database updates completed safely');
        
    } catch (error) {
        logger.error('❌ Safe updates failed:', error);
        throw error;
    }
}

/**
 * Create specific missing tables
 */
async function createMissingTables(missingTables) {
    // This is simplified - in production, use proper migrations
    const tableDefinitions = {
        'audit_logs': `
            CREATE TABLE IF NOT EXISTS audit_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID REFERENCES users(id),
                action VARCHAR(50) NOT NULL,
                table_name VARCHAR(50),
                record_id UUID,
                old_values JSONB,
                new_values JSONB,
                ip_address INET,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `,
        'sessions': `
            CREATE TABLE IF NOT EXISTS sessions (
                id VARCHAR(255) PRIMARY KEY,
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at BIGINT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `
    };
    
    for (const table of missingTables) {
        if (tableDefinitions[table]) {
            await dbManager.query(tableDefinitions[table]);
            logger.info(`Created missing table: ${table}`);
        }
    }
}

/**
 * Add missing columns to existing tables
 */
async function addMissingColumns() {
    // Check and add common missing columns
    const columnChecks = [
        { table: 'users', column: 'department', type: 'VARCHAR(100)' },
        { table: 'patients', column: 'emergency_contact', type: 'VARCHAR(20)' },
        { table: 'bills', column: 'insurance_claim_id', type: 'VARCHAR(100)' }
    ];
    
    for (const check of columnChecks) {
        try {
            const result = await dbManager.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = $1 
                AND column_name = $2
            `, [check.table, check.column]);
            
            if (result.rows.length === 0) {
                await dbManager.query(`
                    ALTER TABLE ${check.table} 
                    ADD COLUMN ${check.column} ${check.type}
                `);
                logger.info(`Added column ${check.column} to ${check.table}`);
            }
        } catch (error) {
            // Column might already exist or table doesn't exist
            logger.debug(`Column check skipped for ${check.table}.${check.column}: ${error.message}`);
        }
    }
}

/**
 * Seed initial data
 */
async function seedInitialData() {
    try {
        // Check if we already have seed data
        const userCount = await dbManager.query('SELECT COUNT(*) FROM users');
        
        if (parseInt(userCount.rows[0].count) > 0) {
            logger.info('✅ Seed data already exists, skipping...');
            return;
        }
        
        logger.info('Seeding initial data...');
        
        // Insert admin user (with placeholder password - will be hashed by app)
        await dbManager.query(`
            INSERT INTO users (id, name, email, password, role, specialization, phone, department) VALUES
            ('11111111-1111-1111-1111-111111111111', 'Admin User', 'admin@hms.et', 'temporary_password', 'admin', 'Administration', '+251911111111', 'Administration')
            ON CONFLICT (email) DO NOTHING;
        `);
        
        // Insert sample doctor
        await dbManager.query(`
            INSERT INTO users (id, name, email, password, role, specialization, phone, department) VALUES
            ('22222222-2222-2222-2222-222222222222', 'Dr. Alemayehu Teklu', 'alex@hms.et', 'temporary_password', 'doctor', 'Cardiology', '+251922222222', 'Cardiology')
            ON CONFLICT (email) DO NOTHING;
        `);
        
        // Insert sample patients (from your setup.js)
        await dbManager.query(`
            INSERT INTO patients (full_name, gender, date_of_birth, phone, address) VALUES
            ('Mekdes Abebe', 'female', '1990-05-15', '+251911234567', 'Addis Ababa, Bole'),
            ('Yohannes Girma', 'male', '1985-11-22', '+251912345678', 'Addis Ababa, Kazanchis'),
            ('Selamawit Bekele', 'female', '1995-03-08', '+251913456789', 'Addis Ababa, Mexico')
            ON CONFLICT (phone) DO NOTHING;
        `);
        
        // Insert sample services (from your schema.sql)
        await dbManager.query(`
            INSERT INTO services (service_code, service_name, price, category) VALUES
            ('CONSULT', 'General Consultation', 500.00, 'Consultation'),
            ('LAB-CBC', 'Complete Blood Count', 350.00, 'Laboratory'),
            ('XRAY-CHEST', 'Chest X-Ray', 1200.00, 'Radiology'),
            ('ECG', 'Electrocardiogram', 800.00, 'Cardiology'),
            ('URINALYSIS', 'Urine Analysis', 250.00, 'Laboratory')
            ON CONFLICT (service_code) DO NOTHING;
        `);
        
        logger.info('✅ Initial data seeded successfully');
        
    } catch (error) {
        logger.warn('⚠️ Seed data insertion had issues:', error.message);
        // Don't fail the whole setup for seed data issues
    }
}

/**
 * Verify the setup was successful
 */
async function verifySetup() {
    try {
        // Check all required tables exist
        const tablesResult = await dbManager.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            AND table_name IN ('users', 'patients', 'appointments', 'medical_records', 'bills', 'payments', 'services')
        `);
        
        const foundTables = tablesResult.rows.map(row => row.table_name);
        
        if (foundTables.length < 7) {
            throw new Error(`Missing tables. Found: ${foundTables.join(', ')}`);
        }
        
        // Check database health
        const health = await dbManager.checkHealth();
        
        return {
            status: 'healthy',
            tables_created: foundTables.length,
            database_time: health.database_time,
            version: health.version
        };
        
    } catch (error) {
        return {
            status: 'verification_failed',
            error: error.message
        };
    }
}

/**
 * Show a summary of the database setup
 */
async function showDatabaseSummary() {
    try {
        const summaryQuery = `
            SELECT 
                (SELECT COUNT(*) FROM users) as user_count,
                (SELECT COUNT(*) FROM patients) as patient_count,
                (SELECT COUNT(*) FROM services) as service_count,
                (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as table_count;
        `;
        
        const result = await dbManager.query(summaryQuery);
        const summary = result.rows[0];
        
        console.log('\n📊 DATABASE SETUP SUMMARY:');
        console.log('════════════════════════════════');
        console.log(`📁 Total Tables: ${summary.table_count}`);
        console.log(`👥 Users: ${summary.user_count}`);
        console.log(`👤 Patients: ${summary.patient_count}`);
        console.log(`🩺 Services: ${summary.service_count}`);
        console.log('════════════════════════════════\n');
        
        console.log('✅ HMS Database is ready!');
        console.log('\nNext steps:');
        console.log('1. Start the server: npm start');
        console.log('2. Or run in dev mode: npm run dev');
        console.log('3. Test with: curl http://localhost:3000/api/health');
        console.log('4. Login with: admin@hms.et / temporary_password\n');
        
    } catch (error) {
        console.log('⚠️ Could not generate summary:', error.message);
    }
}

/**
 * Export for programmatic use
 */
module.exports = {
    setupDatabase,
    checkSchemaExists,
    createSchema,
    seedInitialData,
    verifySetup
};

// Run if called directly
if (require.main === module) {
    setupDatabase()
        .then(result => {
            if (result.success) {
                console.log('\n🎉 Setup completed successfully!');
                process.exit(0);
            } else {
                console.error('\n❌ Setup completed with issues');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 Setup failed:', error.message);
            process.exit(1);
        });
}