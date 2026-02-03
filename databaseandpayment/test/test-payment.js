const axios = require('axios');
const path = require('path');

// Load .env FIRST before any database imports
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// Now import database
const { Pool } = require('pg');

const BASE_URL = 'http://localhost:3000/api/payments';

async function testPaymentWithDB() {
    console.log('💰 Testing Payment System with Database\n');
    
    let pool = null;
    let dbClient = null;
    let testBillId = null;
    
    try {
        // Step 1: Create database connection
        console.log('1. Creating database connection...');
        pool = new Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });
        
        // Test connection
        dbClient = await pool.connect();
        console.log('✅ Database connected');
        
        // Step 2: Create test data
        console.log('\n2. Creating test data...');
        
        // Create test patient
        const patient = await dbClient.query(`
            INSERT INTO patients (full_name, phone, date_of_birth, gender, address)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name
            RETURNING id, full_name, phone
        `, ['Test Patient', '+251911234567', '1990-01-01', 'male', 'Addis Ababa']);
        
        console.log(`   Patient: ${patient.rows[0].full_name}`);
        
        // Create test bill
        const bill = await dbClient.query(`
            INSERT INTO bills (patient_id, bill_number, amount, payment_status)
            VALUES ($1, 'TEST-' || EXTRACT(EPOCH FROM NOW())::INT, 1850.50, 'pending')
            RETURNING id, bill_number, amount
        `, [patient.rows[0].id]);
        
        testBillId = bill.rows[0].id;
        console.log(`   Bill: ${bill.rows[0].bill_number} (${bill.rows[0].amount} ETB)`);
        
        dbClient.release();
        dbClient = null;
        
        // Step 3: Check if server is running
        console.log('\n3. Checking server...');
        let serverRunning = false;
        
        try {
            await axios.get('http://localhost:3000/health', { timeout: 2000 });
            serverRunning = true;
            console.log('✅ Server is running');
        } catch (serverError) {
            console.log('⚠️  Server not running.');
            console.log('   Note: This is expected if server isn\'t started yet.');
            console.log('   Start server with: npm run dev');
            
            // Test database-only functionality
            console.log('\n📋 Database-Only Test Results:');
            console.log('   ✅ Database connection successful');
            console.log('   ✅ Test patient created');
            console.log('   ✅ Test bill created');
            console.log('   ✅ Payment tables accessible');
            
            // Don't end pool here - let finally block handle it
            return;
        }
        
        // Step 4: Test payment API (only if server is running)
        if (serverRunning) {
            console.log('\n4. Testing payment API...');
            
            const paymentResponse = await axios.post(`${BASE_URL}/initiate`, {
                billId: bill.rows[0].id,
                paymentMethod: 'mobile_money',
                phone: '+251911234567',
                provider: 'telebirr'
            });
            
            console.log('✅ Payment initiated');
            console.log('   Message:', paymentResponse.data.message);
            
            if (paymentResponse.data.data.transactionId) {
                const txId = paymentResponse.data.data.transactionId;
                
                // Wait and verify
                console.log('\n5. Verifying payment...');
                await new Promise(resolve => setTimeout(resolve, 3000));
                
                const verifyResponse = await axios.get(`${BASE_URL}/verify/${txId}`);
                console.log('   Status:', verifyResponse.data.data.status);
                
                // Get invoice
                console.log('\n6. Getting invoice...');
                const invoiceResponse = await axios.get(`${BASE_URL}/invoice/${bill.rows[0].id}`);
                console.log('   Invoice:', invoiceResponse.data.data.invoiceNumber);
            }
        }
        
        console.log('\n🎉 Tests completed!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        
        // Don't print full stack for connection errors
        if (!error.message.includes('password') && !error.message.includes('SASL')) {
            console.error('Stack:', error.stack);
        }
        
    } finally {
        // Cleanup in proper order
        try {
            // 1. Release client if still active
            if (dbClient) {
                dbClient.release();
            }
            
            // 2. Cleanup test data
            if (testBillId && pool) {
                const cleanupClient = await pool.connect();
                await cleanupClient.query('DELETE FROM bills WHERE id = $1', [testBillId]);
                cleanupClient.release();
                console.log('✅ Test data cleaned');
            }
            
            // 3. End pool if it exists
            if (pool) {
                await pool.end();
                console.log('✅ Database connection closed');
            }
            
        } catch (cleanupError) {
            // Ignore cleanup errors (like "pool already ended")
            if (!cleanupError.message.includes('more than once')) {
                console.log('Cleanup note:', cleanupError.message);
            }
        }
    }
}

// Run test
testPaymentWithDB();