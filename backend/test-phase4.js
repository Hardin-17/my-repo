const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function runPhase4Tests() {
  console.log('====================================================');
  console.log('   STARTING VAULT PHASE 4 COMPREHENSIVE TEST SUITE  ');
  console.log('====================================================\n');

  process.env.PORT = '5004';
  process.env.NODE_ENV = 'test';

  const config = require('./src/config/env');
  const { getDbStatus } = require('./src/config/db');
  const app = require('./src/server.js');
  const storageNodeService = require('./src/services/storageNodeService');

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
    // TEST 1: Register and Authenticate User
    // ----------------------------------------------------
    console.log('\n--- 1. AUTHENTICATION & SETUP ---');
    const userEmail = `distributed_ops_${Date.now()}@vault.storage`;
    const regRes = await request({
      method: 'POST',
      path: '/api/auth/register',
      body: {
        email: userEmail,
        password: 'Password123!',
        name: 'Distributed Systems Lead',
      },
    });

    assert(regRes.statusCode === 201, 'User registered successfully');
    const token = regRes.body.data.token;
    assert(!!token, 'Received valid JWT bearer token');

    // ----------------------------------------------------
    // TEST 2: Write Durability Policies (ONE, QUORUM, ALL)
    // ----------------------------------------------------
    console.log('\n--- 2. WRITE DURABILITY POLICIES ---');

    // 2.1 Durability Policy: ONE
    const fileOne = Buffer.from('Durability ONE content - minimum 1 ack required');
    const boundaryOne = '----WebKitFormBoundaryOne' + Date.now();
    const bodyOne = createMultipartBody(
      boundaryOne,
      { replicationFactor: '3', durabilityPolicy: 'ONE', readPolicy: 'ANY_HEALTHY' },
      { name: 'file', filename: 'durability-one.txt', contentType: 'text/plain', buffer: fileOne }
    );

    const uploadOneRes = await request({
      method: 'POST',
      path: '/api/objects',
      token,
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundaryOne}` },
      body: bodyOne,
      isMultipart: true,
    });

    assert(uploadOneRes.statusCode === 201, 'Upload with durabilityPolicy=ONE succeeded');
    assert(uploadOneRes.body.data.durabilityPolicy === 'ONE', 'Object durabilityPolicy stored as ONE');
    const objectOneId = uploadOneRes.body.data.objectId;

    // 2.2 Durability Policy: QUORUM (Default)
    const fileQuorum = Buffer.from('Durability QUORUM content - minimum floor(RF/2)+1 acks');
    const boundaryQuorum = '----WebKitFormBoundaryQuorum' + Date.now();
    const bodyQuorum = createMultipartBody(
      boundaryQuorum,
      { replicationFactor: '3', durabilityPolicy: 'QUORUM', readPolicy: 'QUORUM' },
      { name: 'file', filename: 'durability-quorum.txt', contentType: 'text/plain', buffer: fileQuorum }
    );

    const uploadQuorumRes = await request({
      method: 'POST',
      path: '/api/objects',
      token,
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundaryQuorum}` },
      body: bodyQuorum,
      isMultipart: true,
    });

    assert(uploadQuorumRes.statusCode === 201, 'Upload with durabilityPolicy=QUORUM succeeded');
    assert(uploadQuorumRes.body.data.durabilityPolicy === 'QUORUM', 'Object durabilityPolicy stored as QUORUM');
    assert(uploadQuorumRes.body.data.readPolicy === 'QUORUM', 'Object readPolicy stored as QUORUM');

    // 2.3 Durability Policy: ALL
    const fileAll = Buffer.from('Durability ALL content - strict 100% replica acks');
    const boundaryAll = '----WebKitFormBoundaryAll' + Date.now();
    const bodyAll = createMultipartBody(
      boundaryAll,
      { replicationFactor: '3', durabilityPolicy: 'ALL' },
      { name: 'file', filename: 'durability-all.txt', contentType: 'text/plain', buffer: fileAll }
    );

    const uploadAllRes = await request({
      method: 'POST',
      path: '/api/objects',
      token,
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundaryAll}` },
      body: bodyAll,
      isMultipart: true,
    });

    assert(uploadAllRes.statusCode === 201, 'Upload with durabilityPolicy=ALL succeeded');
    assert(uploadAllRes.body.data.durabilityPolicy === 'ALL', 'Object durabilityPolicy stored as ALL');

    // ----------------------------------------------------
    // TEST 3: Partial Network Partition Simulation
    // ----------------------------------------------------
    console.log('\n--- 3. NETWORK PARTITION SIMULATION ---');

    // Create partition isolating node-04 and node-05 from node-01, node-02, node-03
    const partitionRes = await request({
      method: 'POST',
      path: '/api/chaos/network-partition',
      token,
      body: {
        groups: [
          ['node-01', 'node-02', 'node-03'],
          ['node-04', 'node-05'],
        ],
        reason: 'Simulated cross-datacenter WAN fiber optic cable cut',
      },
    });

    assert(partitionRes.statusCode === 201, 'Network partition created successfully');
    const partitionId = partitionRes.body.data.partitionId;
    assert(!!partitionId, `Network partition ID generated: ${partitionId}`);
    assert(partitionRes.body.data.blockedPairs.length > 0, 'Blocked node pairs accurately calculated');

    // Check active partitions list
    const listPartitionsRes = await request({
      method: 'GET',
      path: '/api/chaos/network-partitions',
      token,
    });
    assert(listPartitionsRes.statusCode === 200, 'Retrieved network partitions');
    assert(listPartitionsRes.body.data.active.length >= 1, 'Active partitions list contains created partition');

    // Verify nodes are STILL ONLINE (not falsely marked offline!)
    const nodesRes = await request({
      method: 'GET',
      path: '/api/nodes',
      token,
    });
    const node4 = nodesRes.body.data.find((n) => n.nodeId === 'node-04');
    assert(node4.status === 'ONLINE', 'Partitioned node-04 remains ONLINE (network partition semantics preserved)');

    // ----------------------------------------------------
    // TEST 4: Network Partition Quorum Failures & Success
    // ----------------------------------------------------
    console.log('\n--- 4. PARTITION-AWARE QUORUM WRITE BEHAVIOR ---');

    // Isolate node-02, node-03, node-04, node-05 from node-01
    const strictPartitionRes = await request({
      method: 'POST',
      path: '/api/chaos/network-partition',
      token,
      body: {
        groups: [
          ['node-01'],
          ['node-02', 'node-03', 'node-04', 'node-05'],
        ],
        reason: 'Complete network isolation of gateway node-01',
      },
    });
    assert(strictPartitionRes.statusCode === 201, 'Strict partition created');

    // Attempt upload with durabilityPolicy=ALL and RF=3 (where node-01 is isolated from other nodes)
    const fileStrict = Buffer.from('Strict partition content');
    const boundaryStrict = '----WebKitFormBoundaryStrict' + Date.now();
    const bodyStrict = createMultipartBody(
      boundaryStrict,
      { replicationFactor: '3', durabilityPolicy: 'ALL' },
      { name: 'file', filename: 'strict-fail.txt', contentType: 'text/plain', buffer: fileStrict }
    );

    const failUploadRes = await request({
      method: 'POST',
      path: '/api/objects',
      token,
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundaryStrict}` },
      body: bodyStrict,
      isMultipart: true,
    });

    assert(
      failUploadRes.statusCode === 503,
      `Durability ALL rejected under network partition (HTTP ${failUploadRes.statusCode})`
    );

    // Recover the strict partition
    const recoverStrictRes = await request({
      method: 'POST',
      path: '/api/chaos/network-partition/recover',
      token,
      body: { partitionId: strictPartitionRes.body.data.partitionId },
    });
    assert(recoverStrictRes.statusCode === 200, 'Strict network partition recovered');

    // Clean up all partitions
    await request({
      method: 'POST',
      path: '/api/chaos/network-partition/recover',
      token,
      body: {}, // recovers all
    });

    const verifyCleanRes = await request({
      method: 'GET',
      path: '/api/chaos/network-partitions',
      token,
    });
    assert(verifyCleanRes.body.data.active.length === 0, 'All network partitions cleared');

    // ----------------------------------------------------
    // TEST 5: Atomic Versioned Object Updates (v1 -> v2)
    // ----------------------------------------------------
    console.log('\n--- 5. OBJECT VERSIONING & ATOMIC UPDATES ---');

    const updateFile = Buffer.from('Updated content for version 2 of the object');
    const boundaryUpdate = '----WebKitFormBoundaryUpdate' + Date.now();
    const bodyUpdate = createMultipartBody(
      boundaryUpdate,
      { durabilityPolicy: 'QUORUM', readPolicy: 'ANY_HEALTHY' },
      { name: 'file', filename: 'durability-one-v2.txt', contentType: 'text/plain', buffer: updateFile }
    );

    const updateRes = await request({
      method: 'PUT',
      path: `/api/objects/${objectOneId}`,
      token,
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundaryUpdate}` },
      body: bodyUpdate,
      isMultipart: true,
    });

    assert(updateRes.statusCode === 200, 'Object updated successfully via PUT /api/objects/:id');
    assert(updateRes.body.data.version === 2, 'Object version incremented to 2');
    const newChecksum = crypto.createHash('sha256').update(updateFile).digest('hex');
    assert(updateRes.body.data.checksum === newChecksum, 'Object checksum updated to match new version');

    // ----------------------------------------------------
    // TEST 6: Read Policies (ANY_HEALTHY, LOWEST_LATENCY, QUORUM)
    // ----------------------------------------------------
    console.log('\n--- 6. READ POLICIES & RETRIEVAL ---');

    // Download with ANY_HEALTHY
    const dlAnyRes = await request({
      method: 'GET',
      path: `/api/objects/${objectOneId}/download?readPolicy=ANY_HEALTHY`,
      token,
    });
    assert(dlAnyRes.statusCode === 200, 'Download with ANY_HEALTHY policy succeeded');
    assert(dlAnyRes.headers['x-read-policy'] === 'ANY_HEALTHY', 'Header X-Read-Policy confirms ANY_HEALTHY');
    assert(dlAnyRes.headers['x-object-version'] === '2', 'Downloaded content is version 2');

    // Download with LOWEST_LATENCY
    const dlLatencyRes = await request({
      method: 'GET',
      path: `/api/objects/${objectOneId}/download?readPolicy=LOWEST_LATENCY`,
      token,
    });
    assert(dlLatencyRes.statusCode === 200, 'Download with LOWEST_LATENCY policy succeeded');
    assert(dlLatencyRes.headers['x-read-policy'] === 'LOWEST_LATENCY', 'Header confirms LOWEST_LATENCY');
    assert(!!dlLatencyRes.headers['x-served-by-node'], `Served by node: ${dlLatencyRes.headers['x-served-by-node']}`);

    // Download with QUORUM
    const dlQuorumRes = await request({
      method: 'GET',
      path: `/api/objects/${objectOneId}/download?readPolicy=QUORUM`,
      token,
    });
    assert(dlQuorumRes.statusCode === 200, 'Download with QUORUM policy succeeded');
    assert(dlQuorumRes.headers['x-read-policy'] === 'QUORUM', 'Header confirms QUORUM policy');

    // ----------------------------------------------------
    // TEST 7: Background Storage Rebalancing
    // ----------------------------------------------------
    console.log('\n--- 7. STORAGE REBALANCING ---');

    const rebalanceStatusRes = await request({
      method: 'GET',
      path: '/api/rebalance/status',
      token,
    });
    assert(rebalanceStatusRes.statusCode === 200, 'Retrieved storage rebalance status');
    assert(rebalanceStatusRes.body.data.skewAnalysis !== undefined, 'Skew analysis data present');

    const triggerRebalanceRes = await request({
      method: 'POST',
      path: '/api/rebalance/trigger',
      token,
      body: { maxMoves: 3 },
    });
    assert(triggerRebalanceRes.statusCode === 200, 'Triggered rebalance run');
    assert(triggerRebalanceRes.body.data.rebalanced !== undefined, 'Rebalance execution completed cleanly');

    // ----------------------------------------------------
    // TEST 8: Metadata & Replica Consistency Reconciliation
    // ----------------------------------------------------
    console.log('\n--- 8. CONSISTENCY RECONCILIATION ---');

    const scanRes = await request({
      method: 'POST',
      path: '/api/reconciliation/scan',
      token,
    });
    assert(scanRes.statusCode === 200, 'Reconciliation scan executed successfully');
    assert(scanRes.body.data.totalObjectsScanned >= 3, 'Scanned stored objects');

    const reconcileRes = await request({
      method: 'POST',
      path: '/api/reconciliation/reconcile',
      token,
    });
    assert(reconcileRes.statusCode === 200, 'Reconciliation process executed successfully');

    // ----------------------------------------------------
    // TEST 9: Phase 4 Metrics (Overhead, Timing, Partitions)
    // ----------------------------------------------------
    console.log('\n--- 9. PHASE 4 METRICS VERIFICATION ---');

    const metricsRes = await request({
      method: 'GET',
      path: '/api/metrics',
      token,
    });
    assert(metricsRes.statusCode === 200, 'Metrics endpoint returned 200');
    const storageOverhead = metricsRes.body.data.storage.overhead;
    assert(storageOverhead.logicalBytes > 0, `Logical bytes computed: ${storageOverhead.logicalBytes}`);
    assert(storageOverhead.physicalBytes > 0, `Physical bytes computed: ${storageOverhead.physicalBytes}`);
    assert(!!storageOverhead.overheadRatio, `Overhead ratio computed: ${storageOverhead.overheadRatio}`);
    assert(metricsRes.body.data.recovery.timing !== undefined, 'Recovery timing statistics present');
    assert(metricsRes.body.data.networkPartitions !== undefined, 'Network partition metrics present');
    assert(metricsRes.body.data.objects.durabilityDistribution !== undefined, 'Durability distribution present');

    // ----------------------------------------------------
    // TEST 10: VaultOps AI Assistant & Safe Action Proposals
    // ----------------------------------------------------
    console.log('\n--- 10. VAULTOPS AI ASSISTANT ---');

    // 10.1 Diagnostic query
    const chatDiagRes = await request({
      method: 'POST',
      path: '/api/ai/chat',
      token,
      body: { message: 'Diagnose cluster health and storage state' },
    });
    assert(chatDiagRes.statusCode === 200, 'AI chat returned diagnostic response');
    assert(chatDiagRes.body.data.reply.length > 50, 'AI response contains detailed diagnostic report');
    assert(!!chatDiagRes.body.data.clusterContext, 'AI response incorporates real-time cluster telemetry');

    // 10.2 Skew analysis query
    const chatSkewRes = await request({
      method: 'POST',
      path: '/api/ai/chat',
      token,
      body: { message: 'Check storage skew and rebalance status' },
    });
    assert(chatSkewRes.statusCode === 200, 'AI responded to rebalance inquiry');
    assert(chatSkewRes.body.data.proposals.length > 0, 'AI generated structured ACTION_PROPOSAL for operator');
    assert(chatSkewRes.body.data.proposals[0].type === 'ACTION_PROPOSAL', 'Proposal schema verified');

    // 10.3 Confirmed Action Execution
    const executeRes = await request({
      method: 'POST',
      path: '/api/ai/execute-action',
      token,
      body: {
        action: 'TRIGGER_REBALANCE',
        payload: { maxMoves: 2 },
      },
    });
    assert(executeRes.statusCode === 200, 'Confirmed action TRIGGER_REBALANCE executed via API');
    assert(executeRes.body.data.action === 'TRIGGER_REBALANCE', 'Action execution logged and confirmed');

    // 10.4 Action whitelist security check (reject arbitrary actions)
    const rejectRes = await request({
      method: 'POST',
      path: '/api/ai/execute-action',
      token,
      body: { action: 'DROP_DATABASE' },
    });
    assert(rejectRes.statusCode === 400, 'Unapproved action correctly rejected with HTTP 400');

    console.log('\n====================================================');
    console.log(`   PHASE 4 TEST SUITE PASSED: ${passCount}/${testCount} TESTS OK!   `);
    console.log('====================================================\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED WITH ERROR:', error);
    process.exit(1);
  }
}

runPhase4Tests();
