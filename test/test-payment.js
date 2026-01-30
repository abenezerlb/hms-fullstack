const axios = require('axios');

async function testPayment() {
    const baseURL = 'http://localhost:3000/api/payments';
    
    try {
        // First, create a test bill (you'd normally do this through your application)
        console.log('1. Testing payment initiation...');
        
        const paymentData = {
            billId: 'your-bill-id-here', // Get from your database
            paymentMethod: 'mobile_money',
            phone: '+251911234567'
        };
        
        const response = await axios.post(`${baseURL}/initiate`, paymentData);
        console.log('Payment Initiated:', response.data);
        
        if (response.data.data.transactionId) {
            console.log('\n2. Verifying payment...');
            // Wait a few seconds then verify
            setTimeout(async () => {
                const verifyResponse = await axios.get(
                    `${baseURL}/verify/${response.data.data.transactionId}`
                );
                console.log('Payment Verification:', verifyResponse.data);
            }, 5000);
        }
        
    } catch (error) {
        console.error('Test failed:', error.response?.data || error.message);
    }
}

testPayment();