const axios = require('axios');
const { query } = require('./database/db');

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
    console.log('🚀 Testing HMS API Endpoints...\n');
    
    try {
        // Test 1: Health endpoint
        console.log('1. Testing health endpoint...');
        const health = await axios.get(`${BASE_URL}/health`);
        console.log(`   ✅ Health: ${health.data.status}`);
        console.log(`   Service: ${health.data.service}`);
        
        // Test 2: Database test endpoint
        console.log('\n2. Testing database endpoint...');
        const dbTest = await axios.get(`${BASE_URL}/api/test-db`);
        console.log(`   ✅ ${dbTest.data.message}`);
        
        // Test 3: Create a bill for testing payments
        console.log('\n3. Creating test bill for payment testing...');
        
        // First get a patient and doctor
        const patient = await query("SELECT id FROM patients LIMIT 1");
        const doctor = await query("SELECT id FROM users WHERE role = 'doctor' LIMIT 1");
        
        if (!patient.rows[0] || !doctor.rows[0]) {
            // Create sample data if needed
            await query(`
                INSERT INTO patients (full_name, date_of_birth, phone, gender)
                VALUES ('API Test Patient', '1990-01-01', '+251911111111', 'female')
                ON CONFLICT (phone) DO NOTHING
            `);
        }
        
        // Create a test appointment
        const appointment = await query(`
            INSERT INTO appointments (patient_id, doctor_id, appointment_date, status)
            VALUES (
                (SELECT id FROM patients LIMIT 1),
                (SELECT id FROM users WHERE role = 'doctor' LIMIT 1),
                NOW() + interval '1 day',
                'scheduled'
            )
            RETURNING id
        `);
        
        // Create a test bill
        const bill = await query(`
            INSERT INTO bills (patient_id, appointment_id, bill_number, amount)
            VALUES (
                (SELECT id FROM patients LIMIT 1),
                $1,
                'TEST-' || EXTRACT(EPOCH FROM NOW())::INT,
                1500.00
            )
            RETURNING id, bill_number, amount
        `, [appointment.rows[0].id]);
        
        console.log(`   ✅ Test bill created: ${bill.rows[0].bill_number}`);
        console.log(`   Amount: ${bill.rows[0].amount} ETB`);
        
        // Test 4: Test payment initiation (mocked)
        console.log('\n4. Testing payment initiation...');
        
        try {
            const paymentInit = await axios.post(`${BASE_URL}/api/payments/initiate`, {
                billId: bill.rows[0].id,
                paymentMethod: 'mobile_money',
                phone: '+251911111111'
            });
            
            console.log(`   ✅ Payment initiated successfully!`);
            console.log(`   Message: ${paymentInit.data.data.message}`);
            
            if (paymentInit.data.data.transactionId) {
                console.log(`   Transaction ID: ${paymentInit.data.data.transactionId}`);
                
                // Test 5: Verify payment
                console.log('\n5. Testing payment verification...');
                
                // Wait a moment for mock processing
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const verify = await axios.get(
                    `${BASE_URL}/api/payments/verify/${paymentInit.data.data.transactionId}`
                );
                
                console.log(`   ✅ Payment status: ${verify.data.data.status}`);
            }
            
        } catch (paymentError) {
            console.log(`   ⚠️ Payment endpoint returned: ${paymentError.response?.data?.error || paymentError.message}`);
            console.log('   This is expected if the server is not running or endpoints need auth');
        }
        
        // Test 6: Generate invoice
        console.log('\n6. Testing invoice generation...');
        
        try {
            const invoice = await axios.get(`${BASE_URL}/api/payments/invoice/${bill.rows[0].id}`);
            console.log(`   ✅ Invoice generated:`);
            console.log(`   Invoice #: ${invoice.data.data.invoiceNumber}`);
            console.log(`   Patient: ${invoice.data.data.patient.name}`);
            console.log(`   Total: ${invoice.data.data.total} ETB`);
        } catch (invoiceError) {
            console.log(`   ⚠️ Invoice error: ${invoiceError.message}`);
        }
        
        console.log('\n🎉 API TESTS COMPLETED!');
        console.log('\n📊 Next steps:');
        console.log('1. Start your server: npm run dev');
        console.log('2. Test endpoints with Postman or browser');
        console.log('3. Check database with: psql -U hms_admin -d healthcare_db');
        
    } catch (error) {
        console.error('\n❌ API test failed!');
        console.error('Error:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('\n⚠️ Server is not running! Start it with:');
            console.error('   npm run dev');
        }
    }
}

// Check if server is running first
axios.get(`${BASE_URL}/health`)
    .then(() => testAPI())
    .catch(() => {
        console.log('⚠️ Server not running at http://localhost:3000');
        console.log('Starting server test without API...');
        testAPI();
    });