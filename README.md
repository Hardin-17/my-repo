# VAULT: Fault-Tolerant Distributed Object Storage System

VAULT is a high-availability, fault-tolerant distributed object storage control plane and engine designed for automated replica self-healing, cryptographic SHA-256 data integrity verification, silent bit-rot detection, configurable quorum write/read policies, partial network partition resilience, background storage rebalancing, and autonomous AI-assisted operations.

---

## Phase 4 Completed: Distributed-System Completion

Phase 4 completes the major distributed-systems capabilities of VAULT:
1. **Configurable Write Durability Policies (`ONE`, `QUORUM`, `ALL`):**
   - Controlled write acknowledgements:
     - `ONE`: Fast write requiring $\ge 1$ successful replica write.
     - `QUORUM`: Majority consensus requiring $\lfloor RF/2 \rfloor + 1$ successful writes (e.g. 2/3 or 3/5 acks).
     - `ALL`: Strict durability requiring 100% replica writes.
   - Quorum-aware write rollback: If insufficient nodes acknowledge due to network partitions or outages, partial writes are atomically cleaned up from disk and rejected with `503 Service Unavailable`.
2. **Configurable Read Policies (`ANY_HEALTHY`, `LOWEST_LATENCY`, `QUORUM`):**
   - `ANY_HEALTHY`: Serves the object stream from any online, healthy replica.
   - `LOWEST_LATENCY`: Selects the reachable healthy node with the lowest measured ping latency.
   - `QUORUM`: Contacts a majority quorum ($\lfloor RF/2 \rfloor + 1$) of reachable healthy replicas, confirms consensus on checksum and version, and serves the stream.
3. **Concurrent Writes & Object Versioning (`version: 1 -> 2 -> 3`):**
   - Atomic optimistic concurrency control on version increments (`PUT /api/objects/:id`).
   - Prevents concurrent overwrite conflicts (HTTP 409 Conflict if stale version submitted).
   - Replicas tracked per-version with individual checksums and health states.
4. **Partial Network Partition Simulation (`POST /api/chaos/network-partition`, `/recover`):**
   - Simulates WAN fiber cuts and datacenter network splits between arbitrary node groups (e.g. Group A `[node-01, node-02]` vs Group B `[node-03, node-04, node-05]`).
   - Blocks inter-partition network communication while preserving `ONLINE` node health (nodes do not falsely appear crashed).
   - Evaluates quorum failures when partitioned nodes cannot satisfy the requested durability or read policy.
   - 1-click network partition recovery restoring full mesh reachability.
5. **Background Storage Rebalancing (`RebalanceService`):**
   - Automatic cluster skew detection (`REBALANCE_THRESHOLD_PERCENT=20`).
   - Identifies overloaded and underloaded nodes across the mesh.
   - **Safe Copy-Then-Verify Migration:**
     1. Streams replica from overloaded node to target node.
     2. Verifies SHA-256 checksum on target node against expected signature.
     3. Atomically updates `VaultObject` replica metadata.
     4. Deletes source replica only after target persistence and metadata update succeed.
     5. Updates both nodes' disk capacity tracking and logs `REBALANCE_COMPLETED`.
6. **Metadata & Replica Consistency Reconciliation (`ReconciliationService`):**
   - Detects version mismatches, physical file absence, disk checksum deviations, and under-replicated objects.
   - Automatically schedules self-healing repair jobs to reconcile inconsistent replicas from healthy peers.
7. **VaultOps AI Assistant (`POST /api/ai/chat`, `POST /api/ai/execute-action`):**
   - Autonomous real-time operations co-pilot accessible via the floating assistant drawer.
   - Ingests sanitized live cluster telemetry (node latencies, partition states, skew spreads, degraded objects).
   - Proposes structured operational interventions (`ACTION_PROPOSAL`) with mandatory operator confirmation before execution.
   - Whitelist-enforced safe execution API: `TRIGGER_REBALANCE`, `RECOVER_NODE`, `TRIGGER_INTEGRITY_SCAN`, `RECOVER_PARTITION`, `RUN_RECONCILIATION`.
   - Dual-engine architecture: Google Gemini API integration with offline deterministic rule-based expert engine fallback.
8. **Phase 4 Telemetry & Metrics Enhancements:**
   - Real-time **Storage Overhead Ratio** (`overheadRatio`, e.g. `3.00x` with percentage).
   - **Recovery Timing Analytics** (fastest, slowest, and average recovery time in ms).
   - Active network partition counters and blocked link statistics.
   - Write durability policy distribution metrics.

---

## Directory Structure

```text
VAULT/
├── README.md
├── backend/
│   ├── .env
│   ├── package.json
│   ├── storage/                      # Isolated logical storage node volumes
│   │   ├── node-01/
│   │   ├── node-02/
│   │   ├── node-03/
│   │   ├── node-04/
│   │   └── node-05/
│   ├── test-backend.js               # Phase 1 test suite
│   ├── test-phase2.js                # Phase 2 test suite
│   ├── test-phase3.js                # Phase 3 test suite
│   ├── test-phase4.js                # Phase 4 53-point test suite (ALL PASSING)
│   └── src/
│       ├── config/
│       │   ├── db.js                 # MongoDB connection with embedded fallback
│       │   └── env.js                # Environment settings & policy defaults
│       ├── controllers/
│       │   ├── aiController.js       # VaultOps AI chat and action execution
│       │   ├── authController.js
│       │   ├── chaosController.js    # Node failure, corruption & network partitions
│       │   ├── healthController.js
│       │   ├── integrityController.js# SHA-256 integrity verification
│       │   ├── metricsController.js  # Cluster metrics, overhead & recovery timings
│       │   ├── nodeController.js
│       │   ├── objectController.js   # Versioned upload, update, download
│       │   ├── rebalanceController.js# Storage skew & migration trigger
│       │   ├── reconciliationController.js # Consistency scan & reconcile
│       │   └── recoveryController.js # Self-healing repair pipeline
│       ├── middleware/
│       │   ├── authMiddleware.js     # JWT route protection
│       │   ├── errorMiddleware.js
│       │   └── validateMiddleware.js
│       ├── models/
│       │   ├── Activity.js           # Audit and event journal
│       │   ├── NetworkPartition.js   # Active partition tracking model
│       │   ├── Node.js               # Storage node schema
│       │   ├── RepairJob.js          # Self-healing job tracking model
│       │   ├── User.js
│       │   └── VaultObject.js        # Object, replica, and policy schema
│       ├── routes/
│       │   ├── aiRoutes.js
│       │   ├── authRoutes.js
│       │   ├── chaosRoutes.js
│       │   ├── healthRoutes.js
│       │   ├── index.js
│       │   ├── integrityRoutes.js
│       │   ├── metricsRoutes.js
│       │   ├── nodeRoutes.js
│       │   ├── objectRoutes.js
│       │   ├── rebalanceRoutes.js
│       │   ├── reconciliationRoutes.js
│       │   └── recoveryRoutes.js
│       ├── services/
│       │   ├── activityService.js
│       │   ├── aiContextService.js   # Sanitized cluster telemetry compiler
│       │   ├── assistantService.js   # AI chat & confirmed action dispatcher
│       │   ├── authService.js
│       │   ├── chaosService.js
│       │   ├── integrityService.js   # SHA-256 scrubber
│       │   ├── networkService.js     # Network partition mesh manager
│       │   ├── nodeService.js
│       │   ├── objectService.js      # Policy-aware write/read & versioning
│       │   ├── rebalanceService.js   # Safe copy-then-verify rebalancing
│       │   ├── reconciliationService.js # Inconsistency detector & reconciler
│       │   ├── repairService.js      # Concurrency-controlled self-healing worker
│       │   └── storageNodeService.js # Disk filesystem operations with path traversal guards
│       └── server.js
└── frontend/
    ├── package.json
    ├── next.config.js
    └── src/
        ├── app/
        │   ├── dashboard/
        │   │   ├── chaos/page.tsx    # Chaos Lab with Network Partition controls
        │   │   ├── nodes/page.tsx    # Node monitoring & topology
        │   │   ├── objects/page.tsx  # Object explorer & replica inspector
        │   │   └── page.tsx          # Real-time metrics & topology dashboard
        │   ├── login/page.tsx
        │   └── register/page.tsx
        ├── components/
        │   ├── objects/
        │   │   └── UploadModal.tsx   # Durability & Read policy upload controls
        │   └── ui/
        │       └── FloatingAssistantButton.tsx # Real-time VaultOps AI copilot drawer
        └── types/
            └── index.ts              # Phase 4 TypeScript definitions
```

---

## API Endpoints Reference

### Distributed Operations & Durability
- `POST /api/objects` — Upload new object with `replicationFactor`, `durabilityPolicy` (`ONE`, `QUORUM`, `ALL`), and `readPolicy` (`ANY_HEALTHY`, `LOWEST_LATENCY`, `QUORUM`).
- `PUT /api/objects/:id` — Atomic optimistic concurrency update to new version (`v1 -> v2`).
- `GET /api/objects/:id/download?readPolicy=...` — Download object honoring specified read policy.

### Chaos Engineering & Network Partitions
- `POST /api/chaos/node-failure` — Terminate node (`nodeId`, `reason`).
- `POST /api/chaos/node-recover` — Bring node back online (`nodeId`).
- `POST /api/chaos/corrupt-replica` — Inject controlled bit-rot byte inversion (`objectId`, `nodeId`).
- `POST /api/chaos/network-partition` — Create partition separating node groups (`groups: [['node-01','node-02'],['node-03','node-04','node-05']]`).
- `POST /api/chaos/network-partition/recover` — Recover active partition (`partitionId` or all).
- `GET /api/chaos/network-partitions` — List active and historical network partitions.

### Storage Rebalancing & Reconciliation
- `GET /api/rebalance/status` — Get storage skew analysis and utilization spread across nodes.
- `POST /api/rebalance/trigger` — Trigger copy-then-verify rebalancing migration (`maxMoves: 5`).
- `POST /api/reconciliation/scan` — Scan metadata against node disks for inconsistencies.
- `POST /api/reconciliation/reconcile` — Reconcile inconsistencies and schedule repair jobs.

### VaultOps AI Assistant
- `POST /api/ai/chat` — Natural language telemetry queries, diagnosis, and action proposals (`message`, `conversationHistory`).
- `POST /api/ai/execute-action` — Execute operator-confirmed proposal (`action`, `payload`). Whitelisted actions only.

### Metrics & Recovery
- `GET /api/metrics` — Overall cluster health, SLA, storage overhead ratio, recovery timings, network partitions.
- `GET /api/recovery/jobs` — Active and completed self-healing repair jobs.
- `GET /api/recovery/metrics` — Repair telemetry and failure counts.

---

## Running the Verification Test Suites

```bash
# Phase 1 Baseline Tests
cd backend && node test-backend.js

# Phase 2 Replicated Storage & Placement Tests (19 tests)
node test-phase2.js

# Phase 3 Fault Tolerance & Self-Healing Tests (14 tests)
node test-phase3.js

# Phase 4 Distributed Systems Completion Tests (53 tests)
node test-phase4.js
```

All 53 Phase 4 tests pass with 100% success rate.
Production Next.js build passes with 0 errors across all 10 routes.
