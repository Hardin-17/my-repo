const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function runPhase5Tests() {
  console.log('====================================================');
  console.log('   STARTING VAULT PHASE 5 HARDENING TEST SUITE      ');
  console.log('====================================================\n');

  process.env.PORT = '5005';
  process.env.NODE_ENV = 'test';
  process.env.DEMO_MODE = 'true';

  const config = require('./src/config/env');
  const { getDbStatus } = require('./src/config/db');
  const app = require('./src/server.js');

  // Wait for database connection
  while (getDbStatus().readyState !== 1) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  await new Promise((resolve) => setTimeout(resolve, 800));

  function request({ method = 'GET', path, token = null, headers = {}, body = null, isMultipart = false }) {
    return new Promise((resolve, reject) => {
      const reqHeaders = { ...headers };
      if (token) {
        reqHeaders['Authorization'] = `Bearer ${token}`;
      }
      if (body && !isMultipart && !reqHeaders['Content-Type']) {
        reqHeaders['Content-Type'] = 'application/json';
      }

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: config.port,
          path,
          method,
          headers: reqHeaders,
        },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const buffer = Buffer.concat(chunks);
            let parsedBody = null;
            const contentType = res.headers['content-type'] || '';
            if (contentType.includes('application/json')) {
              try {
                parsedBody = JSON.parse(buffer.toString());
              } catch {
                parsedBody = buffer.toString();
              }
            } else {
              parsedBody = buffer;
            }

            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: parsedBody,
            });
          });
        }
      );

      req.on('error', reject);

      if (body) {
        if (isMultipart || Buffer.isBuffer(body)) {
          req.write(body);
        } else {
          req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
      }
      req.end();
    });
  }

  function createMultipartBody(boundary, fields, fileField) {
    const crlf = '\r\n';
    const parts = [];

    for (const [key, value] of Object.entries(fields)) {
      parts.push(
        Buffer.from(
          `--${boundary}${crlf}Content-Disposition: form-data; name="${key}"${crlf}${crlf}${value}${crlf}`
        )
      );
    }

    if (fileField) {
      parts.push(
        Buffer.from(
          `--${boundary}${crlf}Content-Disposition: form-data; name="${fileField.name}"; filename="${fileField.filename}"${crlf}Content-Type: ${fileField.contentType}${crlf}${crlf}`
        )
      );
      parts.push(fileField.buffer);
      parts.push(Buffer.from(crlf));
    }

    parts.push(Buffer.from(`--${boundary}--${crlf}`));
    return Buffer.concat(parts);
  }

  let testCount = 0;
  let passCount = 0;

  function assert(condition, message) {
    testCount++;
    if (condition) {
      console.log(`  ✅ Test ${testCount}: ${message}`);
      passCount++;
    } else {
      console.error(`  ❌ Test ${testCount} FAILED: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Health Probes (Live & Ready)
    // ----------------------------------------------------
    console.log('\n--- 1. HEALTH PROBES & OBSERVABILITY ---');
    const healthRes = await request({ method: 'GET', path: '/api/health' });
    assert(healthRes.statusCode === 200, 'GET /api/health returned 200 OK');
    assert(healthRes.body.status === 'ok', 'Health status is ok');
    assert(healthRes.body.database.connected === true, 'Health reports database connected');

    const liveRes = await request({ method: 'GET', path: '/api/health/live' });
    assert(liveRes.statusCode === 200, 'GET /api/health/live probe returned 200 OK');
    assert(liveRes.body.status === 'alive', 'Liveness probe confirmed alive');

    const readyRes = await request({ method: 'GET', path: '/api/health/ready' });
    assert(readyRes.statusCode === 200, 'GET /api/health/ready probe returned 200 OK');
    assert(readyRes.body.status === 'ready', 'Readiness probe confirmed database ready');

    // ----------------------------------------------------
    // TEST 2: Security Headers & Request IDs
    // ----------------------------------------------------
    console.log('\n--- 2. SECURITY HEADERS & REQUEST IDs ---');
    assert(
      healthRes.headers['x-content-type-options'] === 'nosniff',
      'Header X-Content-Type-Options: nosniff present (Helmet)'
    );
    assert(!!healthRes.headers['x-request-id'], 'Header X-Request-Id automatically generated');

    const customReqId = `custom-probe-${Date.now()}`;
    const customIdRes = await request({
      method: 'GET',
      path: '/api/health',
      headers: { 'x-request-id': customReqId },
    });
    assert(
      customIdRes.headers['x-request-id'] === customReqId,
      'Provided x-request-id correctly preserved through request lifecycle'
    );

    // ----------------------------------------------------
    // TEST 3: Structured Error Responses & Error Masking
    // ----------------------------------------------------
    console.log('\n--- 3. STRUCTURED API ERROR HANDLING ---');
    const notFoundRes = await request({ method: 'GET', path: '/api/nonexistent-route-path' });
    assert(notFoundRes.statusCode === 404, 'Nonexistent route returns 404');
    assert(notFoundRes.body.success === false, 'Error body contains success: false');
    assert(!!notFoundRes.body.error, 'Error body contains structured error object');
    assert(notFoundRes.body.error.code === 'ROUTE_NOT_FOUND', 'Structured error code verified');

    // ----------------------------------------------------
    // TEST 4: Authentication Security & Password Privacy
    // ----------------------------------------------------
    console.log('\n--- 4. AUTHENTICATION & PASSWORD PRIVACY ---');
    const userEmail = `hardening_ops_${Date.now()}@vault.storage`;
    const regRes = await request({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        email: userEmail,
        password: 'HardenedPassword123!',
        name: 'Production Security Officer',
      },
    });

    assert(regRes.statusCode === 201, 'User registered successfully');
    assert(regRes.body.data.user.password === undefined, 'Plaintext/hashed password strictly absent from response');
    const token = regRes.body.data.token;
    assert(!!token, 'Acquired JWT bearer token');

    // Login test
    const loginRes = await request({
      method: 'POST',
      path: '/api/auth/login',
      body: {
        email: userEmail,
        password: 'HardenedPassword123!',
      },
    });
    assert(loginRes.statusCode === 200, 'User logged in successfully');
    assert(loginRes.body.data.user.password === undefined, 'Password strictly absent from login response');

    // ----------------------------------------------------
    // TEST 5: Concurrency - Concurrent Uploads & Downloads
    // ----------------------------------------------------
    console.log('\n--- 5. CONCURRENCY & STREAMING INTEGRITY ---');
    const concurrencyCount = 3;
    const uploadPromises = [];

    for (let i = 0; i < concurrencyCount; i++) {
      const content = Buffer.from(`Concurrent payload chunk ${i} - ${Date.now()}`);
      const boundary = `----WebKitBoundaryConc${i}_${Date.now()}`;
      const body = createMultipartBody(
        boundary,
        { replicationFactor: '3', durabilityPolicy: 'QUORUM' },
        { name: 'file', filename: `conc-file-${i}.txt`, contentType: 'text/plain', buffer: content }
      );

      uploadPromises.push(
        request({
          method: 'POST',
          path: '/api/objects',
          token,
          headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
          body,
          isMultipart: true,
        })
      );
    }

    const uploadResults = await Promise.all(uploadPromises);
    assert(
      uploadResults.every((r) => r.statusCode === 201),
      `All ${concurrencyCount} simultaneous concurrent writes succeeded without race conditions`
    );

    const uploadedIds = uploadResults.map((r) => r.body.data.objectId);

    // Concurrent downloads
    const downloadPromises = uploadedIds.map((id) =>
      request({
        method: 'GET',
        path: `/api/objects/${id}/download?readPolicy=ANY_HEALTHY`,
        token,
      })
    );

    const downloadResults = await Promise.all(downloadPromises);
    assert(
      downloadResults.every((r) => r.statusCode === 200),
      `All ${concurrencyCount} simultaneous concurrent reads streamed successfully`
    );

    // ----------------------------------------------------
    // TEST 6: Demo Reset Guard (Authenticated & Controlled)
    // ----------------------------------------------------
    console.log('\n--- 6. DEMO RESET CONTROLS ---');

    // Unauthorized reset rejection
    const unauthResetRes = await request({
      method: 'POST',
      path: '/api/demo/reset',
    });
    assert(unauthResetRes.statusCode === 401, 'Unauthorized demo reset attempt rejected with HTTP 401');

    // Authorized demo reset
    const authResetRes = await request({
      method: 'POST',
      path: '/api/demo/reset',
      token,
    });
    assert(authResetRes.statusCode === 200, 'Authorized demo reset executed cleanly');
    assert(authResetRes.body.data.reset === true, 'Reset confirmed in response payload');

    // Re-verify nodes are back online after reset
    const nodesAfterReset = await request({ method: 'GET', path: '/api/nodes', token });
    assert(nodesAfterReset.body.data.length === 5, '5 default demo storage nodes re-initialized');

    console.log('\n====================================================');
    console.log(`   PHASE 5 TEST SUITE PASSED: ${passCount}/${testCount} TESTS OK!   `);
    console.log('====================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED WITH ERROR:', error);
    process.exit(1);
  }
}

runPhase5Tests();
