const http = require('http');

async function testBackend() {
  const config = require('./src/config/env');
  const app = require('./src/server.js');
  
  // Wait a moment for server to listen
  await new Promise((resolve) => setTimeout(resolve, 600));

  function request(options, data = null) {
    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null,
          });
        });
      });
      req.on('error', reject);
      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  console.log('Testing GET /api/health...');
  const healthRes = await request({
    hostname: '127.0.0.1',
    port: config.port,
    path: '/api/health',
    method: 'GET',
  });
  console.log('Health Response Status:', healthRes.statusCode);
  console.log('Health Response Body:', JSON.stringify(healthRes.body, null, 2));

  console.log('\nTesting POST /api/auth/register with empty payload (Validation Test)...');
  const regValidationRes = await request(
    {
      hostname: '127.0.0.1',
      port: config.port,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    {}
  );
  console.log('Validation Status (Expected 400):', regValidationRes.statusCode);
  console.log('Validation Errors:', JSON.stringify(regValidationRes.body, null, 2));

  console.log('\nTesting 404 Route...');
  const notFoundRes = await request({
    hostname: '127.0.0.1',
    port: config.port,
    path: '/api/nonexistent',
    method: 'GET',
  });
  console.log('404 Status (Expected 404):', notFoundRes.statusCode);

  console.log('\nAll backend initial tests completed successfully!');
  process.exit(0);
}

testBackend().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
