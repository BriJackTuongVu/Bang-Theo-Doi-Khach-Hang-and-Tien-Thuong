// Test script để kiểm tra Stripe scheduler
const { autoCheckStripePayments } = require('./server/scheduler');

async function testStripeCheck() {
  console.log('🧪 Testing Stripe scheduler function...');
  
  try {
    // Test cho ngày 24/6
    console.log('Testing for 2025-06-24...');
    await autoCheckStripePayments('2025-06-24');
    console.log('✅ Stripe check completed for 2025-06-24');
    
    // Test cho ngày 26/6  
    console.log('Testing for 2025-06-26...');
    await autoCheckStripePayments('2025-06-26');
    console.log('✅ Stripe check completed for 2025-06-26');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testStripeCheck();