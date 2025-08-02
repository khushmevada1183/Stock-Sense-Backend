const axios = require('axios');

async function quickTest() {
  try {
    console.log('Testing trending endpoint with timeout...');
    const response = await axios.get('http://localhost:10000/api/trending', {
      timeout: 10000 // 10 second timeout
    });
    
    console.log('✅ Success! Response status:', response.status);
    console.log('✅ Success flag:', response.data.success);
    console.log('✅ Has data:', !!response.data.data);
    
    if (response.data.data?.trending_stocks?.top_gainers) {
      console.log('✅ Top gainer:', response.data.data.trending_stocks.top_gainers[0]?.company_name);
    }
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('❌ Request timed out - this suggests the rate limiting delay is too long');
    } else {
      console.log('❌ Error:', error.response?.data || error.message);
    }
  }
}

quickTest();
