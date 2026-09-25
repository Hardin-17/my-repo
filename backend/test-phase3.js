const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function runPhase3Tests() {
  console.log('====================================================');
  console.log('   STARTING VAULT PHASE 3 COMPREHENSIVE TEST SUITE  ');
  console.log('====================================================\n');

  process.env.PORT = '5003';
  process.env.NODE_ENV = 'test';

  const config = require('./src/config/env');
  const { getDbStatus } = require('./src/config/db');
  const app = require('./src/server.js');
  const storageNodeService = require('./src/services/storageNodeService');

  // Wait for database connection
  while (getDbStatus().readyState !== 1) {
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  await new Promise((resolve) => setTimeout(resolve, 600));

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

    for (const [key, value] of Object.entries(fields)) {
      parts.push(
        Buffer.from(
          `--${boundary}${crlf}Content-Disposition: form-data; name="${key}"${crlf}${crlf}${value}${crlf}`
        )
      );
    }

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

  // 1. Authenticate user
  console.log('1. Registering operator and acquiring token...');
  const regRes = await request({
    method: 'POST',
    path: '/api/auth/register',
    body: {
      name: 'Chaos Engineer',
      email: `chaos_${Date.now()}@vault.internal`,
      password: 'password123',
    },
  });
  const token = regRes.body.data.token;
  console.log(`   Operator authenticated: ${!!token}`);

  // 2. Upload test object with 3x replication factor
  console.log('2. Uploading object "distributed_kernel.bin" (3x replication)...');
  const payloadBytes = Buffer.from('CRITICAL CLUSTER DATA PAYLOAD FOR PHASE 3 RECOVERY TEST ' + Date.now());
  const expectedHash = crypto.createHash('sha256').update(payloadBytes).digest('hex');
  const multipart = createMultipartPayload('distributed_kernel.bin', payloadBytes, {
    replicationFactor: '3',
  });
  const uploadRes = await request({
    method: 'POST',
    path: '/api/objects',
    token,
    headers: { 'Content-Type': multipart.contentType },
    body: multipart.body,
    isMultipart: true,
  });

  const obj = uploadRes.body.data;
  console.log(`   Object ID: ${obj.objectId}`);
  console.log(`   Replicas placed on: ${obj.replicas.map((r) => r.nodeId).join(', ')}`);
  const failedNodeId = obj.replicas[0].nodeId;

  // 3. Inject Node Failure
  console.log(`3. Testing POST /api/chaos/node-failure (Killing ${failedNodeId})...`);
  const failRes = await request({
    method: 'POST',
    path: '/api/chaos/node-failure',
    token,
    body: { nodeId: failedNodeId, reason: 'Simulated power unit trip' },
  });
  console.log(`   Status: ${failRes.statusCode} - Node status: ${failRes.body?.data?.status}`);
  console.log(`   Affected objects: ${failRes.body?.data?.affectedObjects}, Repair jobs: ${failRes.body?.data?.repairJobsCreated}`);
  if (failRes.statusCode !== 200 || failRes.body.data.status !== 'OFFLINE') {
    throw new Error('Node failure injection failed');
  }

  // 4. Verify Object is marked DEGRADED
  console.log('4. Verifying object status changed to DEGRADED...');
  const degradedObjRes = await request({ path: `/api/objects/${obj.objectId}`, token });
  console.log(`   Object status: ${degradedObjRes.body.data.status} (Expected DEGRADED)`);
  if (degradedObjRes.body.data.status !== 'DEGRADED') {
    throw new Error('Object status was not marked DEGRADED upon node failure');
  }

  // 5. Wait for Background Repair Worker to heal replica
  console.log('5. Waiting for background self-healing worker to heal replica...');
  let healed = false;
  let healedObj = null;
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const checkRes = await request({ path: `/api/objects/${obj.objectId}`, token });
    healedObj = checkRes.body.data;
    const healthyCount = healedObj.replicas.filter((r) => r.status === 'HEALTHY').length;
    console.log(`   [Tick ${i + 1}] Object status: ${healedObj.status}, Healthy replicas: ${healthyCount}/3`);
    if (healedObj.status === 'HEALTHY' && healthyCount >= 3) {
      healed = true;
      break;
    }
  }

  if (!healed) {
    throw new Error('Automated replica self-healing did not restore object to HEALTHY state');
  }
  console.log('   Self-healing confirmed: Replication factor restored to 3/3 HEALTHY!');

  // 6. Verify Physical Replica on Target Node
  console.log('6. Verifying physical replica on target node...');
  const newReplica = healedObj.replicas.find((r) => r.nodeId !== failedNodeId && r.status === 'HEALTHY');
  const existsOnDisk = await storageNodeService.replicaExists(newReplica.nodeId, healedObj.storageKey);
  console.log(`   Replica physically exists on ${newReplica.nodeId}: ${existsOnDisk}`);
  if (!existsOnDisk) throw new Error('Physical replica file missing on target node!');

  // 7. Verify Checksum of Restored Replica
  console.log('7. Verifying SHA-256 Checksum on healed replica...');
  const checksumCheck = await storageNodeService.verifyReplicaChecksum(
    newReplica.nodeId,
    healedObj.storageKey,
    expectedHash
  );
  console.log(`   Checksum match: ${checksumCheck.match}`);
  if (!checksumCheck.match) throw new Error('Restored replica checksum mismatch!');

  // 8. Test Data Corruption Injection
  console.log(`8. Testing POST /api/chaos/corrupt-replica (Corrupting replica on ${newReplica.nodeId})...`);
  const corruptRes = await request({
    method: 'POST',
    path: '/api/chaos/corrupt-replica',
    token,
    body: { objectId: obj.objectId, nodeId: newReplica.nodeId },
  });
  console.log(`   Status: ${corruptRes.statusCode} - Replica marked: ${corruptRes.body?.data?.status}`);
  if (corruptRes.statusCode !== 200 || corruptRes.body.data.status !== 'CORRUPTED') {
    throw new Error('Data corruption injection failed');
  }

  // 9. Test Integrity Verification Endpoint
  console.log(`9. Testing POST /api/integrity/verify/${obj.objectId}...`);
  const verifyRes = await request({
    method: 'POST',
    path: `/api/integrity/verify/${obj.objectId}`,
    token,
  });
  console.log(`   Status: ${verifyRes.statusCode} - Has Corrupted: ${verifyRes.body?.data?.hasCorruptedReplica}`);
  console.log(`   Repair job scheduled: ${verifyRes.body?.data?.repairJobCreated}`);
  if (verifyRes.statusCode !== 200 || !verifyRes.body.data.hasCorruptedReplica) {
    throw new Error('Integrity verification did not detect corrupted replica!');
  }

  // 10. Wait for Corrupted Replica Self-Healing
  console.log('10. Waiting for self-healing repair of corrupted replica...');
  let corruptionHealed = false;
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const checkRes = await request({ path: `/api/objects/${obj.objectId}`, token });
    const healthyCount = checkRes.body.data.replicas.filter((r) => r.status === 'HEALTHY').length;
    console.log(`   [Tick ${i + 1}] Status: ${checkRes.body.data.status}, Healthy replicas: ${healthyCount}/3`);
    if (checkRes.body.data.status === 'HEALTHY' && healthyCount >= 3) {
      corruptionHealed = true;
      break;
    }
  }
  if (!corruptionHealed) {
    throw new Error('Corrupted replica self-healing did not complete');
  }
  console.log('   Corruption successfully repaired from healthy peer node!');

  // 11. Test Node Recovery
  console.log(`11. Testing POST /api/chaos/node-recover (Recovering ${failedNodeId})...`);
  const recoverRes = await request({
    method: 'POST',
    path: '/api/chaos/node-recover',
    token,
    body: { nodeId: failedNodeId },
  });
  console.log(`   Status: ${recoverRes.statusCode} - Node status: ${recoverRes.body?.data?.status}`);
  if (recoverRes.statusCode !== 200 || recoverRes.body.data.status !== 'ONLINE') {
    throw new Error('Node recovery failed');
  }

  // 12. Test Recovery Metrics Endpoint
  console.log('12. Testing GET /api/recovery/metrics...');
  const recMetricsRes = await request({ path: '/api/recovery/metrics', token });
  console.log(`   Status: ${recMetricsRes.statusCode}`);
  console.log(`   Repair jobs created: ${recMetricsRes.body.data.repairJobsCreated}`);
  console.log(`   Repair jobs completed: ${recMetricsRes.body.data.repairJobsCompleted}`);
  console.log(`   Total bytes repaired: ${recMetricsRes.body.data.totalBytesRepaired}`);
  console.log(`   Avg repair time: ${recMetricsRes.body.data.averageRepairTimeSeconds}s`);
  if (recMetricsRes.statusCode !== 200 || recMetricsRes.body.data.repairJobsCompleted < 1) {
    throw new Error('Recovery metrics calculation failed');
  }

  // 13. Test Recovery Jobs List
  console.log('13. Testing GET /api/recovery/jobs...');
  const jobsRes = await request({ path: '/api/recovery/jobs', token });
  console.log(`   Status: ${jobsRes.statusCode} - Jobs count: ${jobsRes.body.data.length}`);
  if (jobsRes.statusCode !== 200 || jobsRes.body.data.length === 0) {
    throw new Error('Recovery jobs list is empty');
  }

  // 14. Test Unauthorized Chaos Rejection
  console.log('14. Testing Unauthorized Chaos Request (No Token)...');
  const unauthChaos = await request({
    method: 'POST',
    path: '/api/chaos/node-failure',
    body: { nodeId: 'node-01' },
  });
  console.log(`   Status: ${unauthChaos.statusCode} (Expected 401 Unauthorized)`);
  if (unauthChaos.statusCode !== 401) throw new Error('Unauthorized chaos request was not rejected!');

  console.log('\n====================================================');
  console.log('  ALL PHASE 3 BACKEND TESTS PASSED SUCCESSFULLY!    ');
  console.log('====================================================\n');
  process.exit(0);
}

runPhase3Tests().catch((err) => {
  console.error('\n*** PHASE 3 TEST FAILED ***', err);
  process.exit(1);
});
