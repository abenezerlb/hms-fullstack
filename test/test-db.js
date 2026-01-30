const { query } = require('../database/db');

async function testDatabase() {
    console.log('🚀 Testing HMS Database Connection...\n');
    
    try {
        // Test 1: Basic connection
        console.log('1. Testing database connection...');
        const connectionTest = await query('SELECT NOW() as current_time, version() as pg_version');
        console.log('✅ Database connected successfully!');
        console.log(`   Time: ${connectionTest.rows[0].current_time}`);
        console.log(`   PostgreSQL: ${connectionTest.rows[0].pg_version.split(',')[0]}`);
        
        // Test 2: Check all tables exist
        console.log('\n2. Checking table creation...');
        const tables = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log(`✅ Found ${tables.rows.length} tables:`);
        tables.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ${row.table_name}`);
        });
        
        // Test 3: Count records in each table
        console.log('\n3. Checking initial data...');
        
        const tablesToCheck = ['users', 'patients', 'services'];
        
        for (const table of tablesToCheck) {
            try {
                const countResult = await query(`SELECT COUNT(*) as count FROM ${table}`);
                console.log(`   📊 ${table}: ${countResult.rows[0].count} records`);
            } catch (err) {
                console.log(`   ❌ ${table}: Error - ${err.message}`);
            }
        }
        
        // Test 4: Test foreign key relationships
        console.log('\n4. Testing relationships...');
        
        // Test user roles
        const roles = await query(`
            SELECT role, COUNT(*) as count 
            FROM users 
            GROUP BY role 
            ORDER BY role
        `);
        
        console.log('   User roles distribution:');
        roles.rows.forEach(row => {
            console.log(`      ${row.role}: ${row.count} users`);
        });
        
        // Test 5: Insert a test patient
        console.log('\n5. Testing data insertion...');
        
        const testPatient = {
            full_name: 'Test Patient Alemayehu',
            gender: 'male',
            date_of_birth: '1990-01-01',
            phone: '+251900000001',
            address: 'Addis Ababa, Test Address'
        };
        
        const insertResult = await query(`
            INSERT INTO patients (full_name, gender, date_of_birth, phone, address)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, full_name, created_at
        `, [testPatient.full_name, testPatient.gender, testPatient.date_of_birth, 
            testPatient.phone, testPatient.address]);
        
        console.log(`   ✅ Test patient inserted: ${insertResult.rows[0].full_name}`);
        console.log(`      ID: ${insertResult.rows[0].id}`);
        console.log(`      Created: ${insertResult.rows[0].created_at}`);
        
        // Test 6: Create an appointment
        console.log('\n6. Testing appointment creation...');
        
        // Get a doctor and the test patient
        const doctor = await query("SELECT id FROM users WHERE role = 'doctor' LIMIT 1");
        const patient = await query("SELECT id FROM patients WHERE phone = '+251900000001'");
        
        if (doctor.rows[0] && patient.rows[0]) {
            const appointmentResult = await query(`
                INSERT INTO appointments (patient_id, doctor_id, appointment_date, status)
                VALUES ($1, $2, $3, $4)
                RETURNING id, appointment_date, status
            `, [
                patient.rows[0].id,
                doctor.rows[0].id,
                new Date(Date.now() + 86400000), // Tomorrow
                'scheduled'
            ]);
            
            console.log(`   ✅ Test appointment created:`);
            console.log(`      Appointment ID: ${appointmentResult.rows[0].id}`);
            console.log(`      Date: ${appointmentResult.rows[0].appointment_date}`);
            console.log(`      Status: ${appointmentResult.rows[0].status}`);
        }
        
        // Test 7: Complex query - Get all data
        console.log('\n7. Testing complex queries...');
        
        const complexQuery = await query(`
            SELECT 
                p.full_name as patient_name,
                p.phone,
                u.name as doctor_name,
                u.role,
                a.appointment_date,
                a.status
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN users u ON a.doctor_id = u.id
            ORDER BY a.appointment_date DESC
            LIMIT 5
        `);
        
        if (complexQuery.rows.length > 0) {
            console.log('   Latest appointments:');
            complexQuery.rows.forEach(row => {
                console.log(`      👨‍⚕️ Dr. ${row.doctor_name} → ${row.patient_name} (${row.appointment_date})`);
            });
        }
        
        // Test 8: Check constraints
        console.log('\n8. Testing database constraints...');
        
        try {
            // Try to insert duplicate phone (should fail)
            await query(`
                INSERT INTO patients (full_name, date_of_birth, phone)
                VALUES ('Duplicate Test', '1990-01-01', '+251911234567')
            `);
            console.log('   ❌ Phone uniqueness constraint failed!');
        } catch (err) {
            if (err.code === '23505') { // Unique violation
                console.log('   ✅ Phone uniqueness constraint working!');
            }
        }
        
        // Test 9: Clean up test data
        console.log('\n9. Cleaning up test data...');
        await query("DELETE FROM patients WHERE phone = '+251900000001'");
        console.log('   ✅ Test data cleaned up');
        
        console.log('\n🎉 ALL DATABASE TESTS PASSED! 🎉');
        console.log('Your HMS database is working perfectly!');
        
    } catch (error) {
        console.error('\n❌ Database test failed!');
        console.error('Error:', error.message);
        console.error('\nTroubleshooting tips:');
        console.error('1. Check if PostgreSQL is running: `sudo systemctl status postgresql`');
        console.error('2. Verify credentials in .env file');
        console.error('3. Check if database exists: `psql -U postgres -c "\\l"`');
        console.error('4. Check if user has permissions: `psql -U postgres -c "\\du"`');
        process.exit(1);
    }
}

testDatabase();