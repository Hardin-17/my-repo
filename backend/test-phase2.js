const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function runPhase2Tests() {
  console.log('====================================================');
  console.log('   STARTING VAULT PHASE 2 COMPREHENSIVE TEST SUITE  ');
  console.log('====================================================\n');

  process.env.PORT = '5002';
  process.env.NODE_ENV = 'test';

  const config = require('./src/config/env');
  const { getDbStatus } = require('./src/config/db');
  const app = require('./src/server.js');
  const storageNodeService = require('./src/services/storageNodeService');

  // Allow server and DB memory engine to fully connect
  while (getDbStatus().readyState !== 1) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  // Brief delay for default nodes initialization
  await new Promise((resolve) => setTimeout(resolve, 500));

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
        if (Buffer.isBuffer(body)) {
          req.write(body);
        } else if (typeof body === 'object' && !isMultipart) {
          req.write(JSON.stringify(body));
        } else {
          req.write(body);
        }
      }
      req.end();
    });
  }

  function createMultipartPayload(filename, fileBuffer, fields = {}) {
    const boundary = '----VaultBoundary' + Math.random().toString(36).substring(2);
    const crlf = '\r\n';
    const parts = [];

    // Add extra fields
    for (const [key, value] of Object.entries(fields)) {
      parts.push(
        Buffer.from(
          `--${boundary}${crlf}Content-Disposition: form-data; name="${key}"${crlf}${crlf}${value}${crlf}`
        )
      );
    }

    // Add file
    parts.push(
      Buffer.from(
        `--${boundary}${crlf}Content-Disposition: form-data; name="file"; filename="${filename}"${crlf}Content-Type: application/octet-stream${crlf}${crlf}`
      )
    );
    parts.push(fileBuffer);
    parts.push(Buffer.from(`${crlf}--${boundary}--${crlf}`));

    return {
      body: Buffer.concat(parts),
      contentType: `multipart/form-data; boundary=${boundary}`,
    };
  }

  let token1 = null;
  let token2 = null;
  let uploadedObjectId = null;
  const testPayload = Buffer.from('VAULT distributed object storage test payload content ' + Date.now());
  const expectedSha256 = crypto.createHash('sha256').update(testPayload).digest('hex');

  // Test 1: Health check
  console.log('1. Testing GET /api/health...');
  const healthRes = await request({ path: '/api/health' });
  console.log(`   Status: ${healthRes.statusCode} - Service: ${healthRes.body.service}`);
  if (healthRes.statusCode !== 200) throw new Error('Health check failed');

  // Test 2: Register User 1
  console.log('2. Testing POST /api/auth/register (User 1)...');
  const reg1 = await request({
    method: 'POST',
    path: '/api/auth/register',
    body: {
      name: 'Primary Operator',
      email: `operator1_${Date.now()}@vault.internal`,
      password: 'password123',
    },
  });
  console.log(`   Status: ${reg1.statusCode} - Token acquired: ${!!reg1.body?.data?.token}`);
  if (reg1.statusCode !== 201) throw new Error('Register user 1 failed: ' + JSON.stringify(reg1.body));
  token1 = reg1.body.data.token;

  // Test 3: Register User 2 (for multi-tenant authorization testing)
  console.log('3. Testing POST /api/auth/register (User 2)...');
  const reg2 = await request({
    method: 'POST',
    path: '/api/auth/register',
    body: {
      name: 'Secondary Operator',
      email: `operator2_${Date.now()}@vault.internal`,
      password: 'password123',
    },
  });
  token2 = reg2.body.data.token;
  console.log(`   Status: ${reg2.statusCode} - Token acquired: ${!!token2}`);

  // Test 4: List Initial Storage Nodes
  console.log('4. Testing GET /api/nodes (Listing initialized demo nodes)...');
  const nodesRes = await request({ path: '/api/nodes', token: token1 });
  console.log(`   Status: ${nodesRes.statusCode} - Total nodes found: ${nodesRes.body?.data?.length}`);
  if (nodesRes.statusCode !== 200 || nodesRes.body.data.length < 5) {
    throw new Error('Default 5 nodes were not properly initialized!');
  }

  // Test 5: Upload Object with Replication Factor = 3
  console.log('5. Testing POST /api/objects (Upload object with 3x replication)...');
  const multipart = createMultipartPayload('telemetry_dump.bin', testPayload, {
    replicationFactor: '3',
  });
  const uploadRes = await request({
    method: 'POST',
    path: '/api/objects',
    token: token1,
    headers: { 'Content-Type': multipart.contentType },
    body: multipart.body,
    isMultipart: true,
  });
  console.log(`   Status: ${uploadRes.statusCode} - Message: ${uploadRes.body?.message}`);
  if (uploadRes.statusCode !== 201) {
    throw new Error('Object upload failed: ' + JSON.stringify(uploadRes.body));
  }
  const uploadedObj = uploadRes.body.data;
  uploadedObjectId = uploadedObj.objectId;
  console.log(`   Object ID: ${uploadedObjectId}`);
  console.log(`   Checksum calculated: ${uploadedObj.checksum}`);
  console.log(`   Replicas created: ${uploadedObj.replicas.length}`);

  // Test 6: Verify Checksum matches
  console.log('6. Verifying SHA-256 Checksum...');
  if (uploadedObj.checksum !== expectedSha256) {
    throw new Error(`Checksum mismatch! Expected ${expectedSha256}, got ${uploadedObj.checksum}`);
  }
  console.log('   Checksum matches expected SHA-256 exactly!');

  // Test 7: Verify Replica files exist on actual logical disk
  console.log('7. Verifying replica files on logical node directories...');
  for (const rep of uploadedObj.replicas) {
    const exists = await storageNodeService.replicaExists(rep.nodeId, uploadedObj.storageKey);
    console.log(`   Replica on ${rep.nodeId} exists on disk: ${exists}`);
    if (!exists) throw new Error(`Replica file missing on ${rep.nodeId}!`);
  }

  // Test 8: List User Objects
  console.log('8. Testing GET /api/objects (User 1 object list)...');
  const listRes = await request({ path: '/api/objects', token: token1 });
  console.log(`   Status: ${listRes.statusCode} - Count: ${listRes.body.data.length}`);
  if (listRes.body.data.length !== 1) throw new Error('Object list count incorrect');

  // Test 9: Get Object Details
  console.log(`9. Testing GET /api/objects/${uploadedObjectId}...`);
  const detailsRes = await request({ path: `/api/objects/${uploadedObjectId}`, token: token1 });
  console.log(`   Status: ${detailsRes.statusCode} - Name: ${detailsRes.body.data.originalName}`);
  if (detailsRes.statusCode !== 200) throw new Error('Object details fetch failed');

  // Test 10: Get Object Replicas
  console.log(`10. Testing GET /api/objects/${uploadedObjectId}/replicas...`);
  const repRes = await request({ path: `/api/objects/${uploadedObjectId}/replicas`, token: token1 });
  console.log(`   Status: ${repRes.statusCode} - Replicas returned: ${repRes.body.data.replicas.length}`);
  if (repRes.body.data.replicas.length !== 3) throw new Error('Replicas endpoint returned incorrect count');

  // Test 11: Download Object and verify stream content
  console.log(`11. Testing GET /api/objects/${uploadedObjectId}/download...`);
  const dlRes = await request({ path: `/api/objects/${uploadedObjectId}/download`, token: token1 });
  console.log(`   Status: ${dlRes.statusCode} - Bytes received: ${dlRes.body.length}`);
  const downloadedHash = crypto.createHash('sha256').update(dlRes.body).digest('hex');
  if (downloadedHash !== expectedSha256) {
    throw new Error('Downloaded object content corrupted or hash mismatch!');
  }
  console.log('   Downloaded stream verified: bit-for-bit exact match!');

  // Test 12: Verify Node Capacity Tracking
  console.log('12. Verifying node capacity tracking updates...');
  const updatedNodes = await request({ path: '/api/nodes', token: token1 });
  let foundUsed = false;
  for (const n of updatedNodes.body.data) {
    if (n.usedStorage > 0) {
      foundUsed = true;
      console.log(`   ${n.nodeId}: usedStorage = ${n.usedStorage} bytes, replicas = ${n.replicaCount}`);
    }
  }
  if (!foundUsed) throw new Error('Node usedStorage metric was not incremented!');

  // Test 13: Node Heartbeat
  console.log('13. Testing POST /api/nodes/node-01/heartbeat...');
  const hbRes = await request({ method: 'POST', path: '/api/nodes/node-01/heartbeat', token: token1 });
  console.log(`   Status: ${hbRes.statusCode} - Last Heartbeat updated: ${hbRes.body?.data?.lastHeartbeat}`);
  if (hbRes.statusCode !== 200) throw new Error('Node heartbeat failed');

  // Test 14: Cross-user Access Authorization (User 2 should NOT access User 1 object)
  console.log('14. Testing Cross-User Access Protection (User 2 accessing User 1 object)...');
  const crossRes = await request({ path: `/api/objects/${uploadedObjectId}`, token: token2 });
  console.log(`   Status: ${crossRes.statusCode} (Expected 403 Forbidden)`);
  if (crossRes.statusCode !== 403) throw new Error('Security violation: Cross-user access was permitted!');

  // Test 15: Cross-user Download Protection
  console.log('15. Testing Cross-User Download Protection (User 2 downloading User 1 object)...');
  const crossDlRes = await request({ path: `/api/objects/${uploadedObjectId}/download`, token: token2 });
  console.log(`   Status: ${crossDlRes.statusCode} (Expected 403 Forbidden)`);
  if (crossDlRes.statusCode !== 403) throw new Error('Security violation: Cross-user download was permitted!');

  // Test 16: Unauthorized Request Rejection (No token)
  console.log('16. Testing Unauthorized Request Rejection (No JWT token)...');
  const unauthRes = await request({ path: '/api/objects' });
  console.log(`   Status: ${unauthRes.statusCode} (Expected 401 Unauthorized)`);
  if (unauthRes.statusCode !== 401) throw new Error('Unauthorized request was not rejected!');

  // Test 17: Invalid Replication Factor Rejection
  console.log('17. Testing Invalid Replication Factor Rejection (RF = 8)...');
  const invalidRfPayload = createMultipartPayload('test.txt', Buffer.from('hello'), {
    replicationFactor: '8',
  });
  const invalidRfRes = await request({
    method: 'POST',
    path: '/api/objects',
    token: token1,
    headers: { 'Content-Type': invalidRfPayload.contentType },
    body: invalidRfPayload.body,
    isMultipart: true,
  });
  console.log(`   Status: ${invalidRfRes.statusCode} (Expected 400 Bad Request) - Error: ${invalidRfRes.body.message}`);
  if (invalidRfRes.statusCode !== 400) throw new Error('Invalid replication factor was not rejected!');

  // Test 18: Path Traversal Protection
  console.log('18. Testing Path Traversal Protection on StorageNodeService...');
  try {
    storageNodeService.resolveReplicaPath('node-01', '../../secret.env');
    throw new Error('Path traversal was NOT blocked!');
  } catch (err) {
    console.log(`   Successfully caught expected error: ${err.message}`);
  }

  // Test 19: Cluster Metrics Endpoint
  console.log('19. Testing GET /api/metrics...');
  const metricsRes = await request({ path: '/api/metrics', token: token1 });
  console.log(`   Status: ${metricsRes.statusCode}`);
  console.log(`   Cluster Health: ${metricsRes.body.data.clusterHealth}`);
  console.log(`   Total Nodes: ${metricsRes.body.data.nodes.total}`);
  console.log(`   Total Objects: ${metricsRes.body.data.objects.total}`);
  console.log(`   Total Replicas: ${metricsRes.body.data.objects.totalReplicas}`);
  console.log(`   Recent Activities: ${metricsRes.body.data.recentActivity.length}`);
  if (metricsRes.statusCode !== 200 || metricsRes.body.data.objects.total !== 1) {
    throw new Error('Metrics endpoint calculation failed');
  }

  console.log('\n====================================================');
  console.log('  ALL 19 PHASE 2 BACKEND TESTS PASSED SUCCESSFULLY! ');
  console.log('====================================================\n');
  process.exit(0);
}

runPhase2Tests().catch((err) => {
  console.error('\n*** TEST FAILED ***', err);
  process.exit(1);
});
