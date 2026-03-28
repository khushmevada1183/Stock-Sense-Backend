const https = require('https');

const BASE_URL = 'https://stock-sense-backend-ocjo.onrender.com/api';
const ENDPOINTS = [
  '/health', // Note: /health might be on root (https://stock-sense-backend-ocjo.onrender.com/health) and also under /api/health
  '/trending',
  '/news',
  '/ipo',
  '/stock?name=RELIANCE',
  '/historical_data?stock_name=RELIANCE&period=1m&filter=default',
  '/commodities',
  '/BSE_most_active',
  '/price_shockers'
];

async function checkEndpoint(endpoint) {
  const url = endpoint.startsWith('/') ? `${BASE_URL}${endpoint}` : `${BASE_URL}/${endpoint}`;
  const start = Date.now();
  
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const time = Date.now() - start;
        let snippet = data.substring(0, 80).replace(/\n/g, ' ');
        if (snippet.length === 80) snippet += '...';
        
        resolve({
          endpoint,
          status: res.statusCode,
          time: `${time}ms`,
          responseSnippet: snippet
        });
      });
    }).on('error', (err) => {
      resolve({
        endpoint,
        status: 'ERROR',
        time: `${Date.now() - start}ms`,
        responseSnippet: err.message
      });
    });
  });
}

async function runChecks() {
  console.log('Testing live endpoints at:', BASE_URL);
  console.log('--------------------------------------------------');
  
  // Also check root health
  const rootHealth = await new Promise((res) => {
      https.get('https://stock-sense-backend-ocjo.onrender.com/health', (r) => {
          let data = '';
          r.on('data', c => data+=c);
          r.on('end', () => res({ status: r.statusCode, data: data.substring(0, 50) }));
      }).on('error', () => res({status: 'ERROR'}));
  });
  console.log(`[Root Health] https://stock-sense-backend-ocjo.onrender.com/health => ${rootHealth.status} | Snippet: ${rootHealth.data}`);
  console.log('--------------------------------------------------');

  for (const ep of ENDPOINTS) {
    const result = await checkEndpoint(ep);
    const color = result.status === 200 ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}[${result.status}]\x1b[0m ${result.time.padEnd(6)} | ${result.endpoint.padEnd(45)} => ${result.responseSnippet}`);
  }
}

runChecks();
