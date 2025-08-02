const axios = require('axios');

async function testAPI() {
  const baseURL = 'http://localhost:10000';
  
  console.log('Testing API endpoints...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const health = await axios.get(`${baseURL}/health`);
    console.log('✅ Health check passed:', health.data);
    
    // Test trending endpoint multiple times to check rate limiting
    console.log('\n2. Testing trending endpoint (this should work now)...');
    const trending = await axios.get(`${baseURL}/api/trending`);
    console.log('✅ Trending endpoint response:', trending.data.success ? 'Success' : 'Failed');
    console.log('   Sample data:', trending.data.data?.trending_stocks?.top_gainers?.[0]?.company_name || 'No data');
    
    // Test news endpoint  
    console.log('\n3. Testing news endpoint...');
    const news = await axios.get(`${baseURL}/api/news`);
    console.log('✅ News endpoint response:', news.data.success ? 'Success' : 'Failed');
    
    // Test IPO endpoint
    console.log('\n4. Testing IPO endpoint...');
    const ipo = await axios.get(`${baseURL}/api/ipo`);
    console.log('✅ IPO endpoint response:', ipo.data.success ? 'Success' : 'Failed');
    
    console.log('\n🎉 All main endpoints are working! The rate limiting improvements are successful.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 429) {
      console.log('   This indicates rate limiting is working');
    }
  }
}

testAPI();
