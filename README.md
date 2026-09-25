# VAULT: Fault-Tolerant Distributed Object Storage System

VAULT is a high-availability, fault-tolerant distributed object storage control plane and engine designed for automated replica self-healing, cryptographic SHA-256 data integrity verification, silent bit-rot detection, and chaos resilience.

---

## Phase 3 Completed: Fault Tolerance, Failure Injection, Integrity Verification & Automatic Repair

Phase 3 transforms VAULT into an autonomous self-healing distributed storage platform: real node failure injection, automated replica health tracking, cryptographic SHA-256 integrity scrubbing, controlled data corruption injection, concurrency-controlled background repair workers, and the interactive **VAULT Chaos Lab**.

### What is Completed in Phase 3:
1. **Node Failure Injection & Recovery (`POST /api/chaos/node-failure`, `/node-recover`):**
   - Real state transitions (`OFFLINE` / `ONLINE`), timestamp tracking (`failedAt`), and failure frequency counts.
   - Automatic identification of affected objects holding replicas on the failed node.
   - Atomic marking of affected replicas as `MISSING` and object degradation (`DEGRADED`).
   - Automated creation of self-healing `RepairJob` records for under-replicated objects.
2. **Background Failure Detection Daemon:**
   - Periodically evaluates node heartbeats against configurable timeouts (`NODE_HEARTBEAT_TIMEOUT_MS=15000`).
   - Automatically declares dead nodes `OFFLINE` and schedules automated repair pipelines.
3. **Automated Replica Self-Healing Engine (`RepairService`):**
   - Strictly enforces healthy source replica selection (never copies from `OFFLINE`, `CORRUPTED`, `INCONSISTENT`, or `REPAIRING` replicas).
   - Capacity-aware target node selection (filters nodes with capacity, avoids duplicate placement, prefers least utilized nodes).
   - Actual binary stream copying between logical node disk directories (`backend/storage/source` -> `backend/storage/target`).
   - Cryptographic SHA-256 verification of the newly copied replica before marking it `HEALTHY`.
   - Dynamic node disk capacity tracking updates (`usedStorage`, `availableStorage`, `replicaCount`).
   - Concurrency-controlled repair worker (`MAX_CONCURRENT_REPAIRS=3`) using atomic database locks (`QUEUED` -> `RUNNING` -> `VERIFYING` -> `COMPLETED`).
4. **Data Corruption & Cryptographic Integrity Scrubber (`IntegrityService`):**
   - Controlled physical byte-level corruption injection (`POST /api/chaos/corrupt-replica`) simulating silent bit-rot.
   - Comprehensive SHA-256 integrity scrubber (`POST /api/integrity/verify/:objectId`) scanning all physical replicas on disk against expected signatures.
   - Automatic detection of corrupted and inconsistent replicas, marking them `CORRUPTED` or `INCONSISTENT` and auto-scheduling repair jobs.
   - Background periodic integrity scan worker (`INTEGRITY_SCAN_INTERVAL_MS=60000`, `INTEGRITY_SCAN_BATCH_SIZE=10`).
5. **Interactive VAULT Chaos Lab (`/dashboard/chaos`):**
   - Dedicated failure testing interface: "Break the cluster. Watch Vault recover."
   - Destructive safety checks with interactive confirmation modals.
   - Storage Node failure injection (`Kill Node` / `Recover Node`).
   - Replica bit-rot corruption injection with immediate scrub verification.
   - Live **Recovery Scorecard** with measured values: Failure type, Affected Objects, Objects Repaired, Data Lost (0 bytes), Replicas Restored, Integrity, and Recovery Time.
   - Real-time **Self-Healing Repair Queue** with progress percentages and source/target node tracking.
   - Event-driven **Fault & Recovery Timeline** displaying journal events.
6. **Object Details & Replica Inspection Enhancements:**
   - Real `Verify Integrity` action on `/dashboard/objects`.
   - Real `Repair Replicas` dispatch button for degraded or corrupted objects.
7. **Cluster Telemetry & Overhead Analytics:**
   - Real-time replication overhead metrics (Logical Bytes vs Replicated Physical Storage Bytes).
   - Active and completed repair counters.
   - Enhanced React Flow topology with dynamic `ONLINE`, `DEGRADED`, `OFFLINE`, and `REPAIRING` visual states.

---

## Directory Structure

```text
VAULT/
├── .gitignore
├── README.md
├── backend/
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   ├── storage/                      # Logical storage node volumes
│   │   ├── node-01/
│   │   ├── node-02/
│   │   ├── node-03/
│   │   ├── node-04/
│   │   └── node-05/
│   ├── test-backend.js
│   ├── test-phase2.js
│   ├── test-phase3.js                # Phase 3 20-point test runner
│   └── src/
│       ├── config/
│       │   ├── db.js
│       │   └── env.js
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── chaosController.js    # Node failure, recovery, and corruption
│       │   ├── healthController.js
│       │   ├── integrityController.js# SHA-256 integrity verification
│       │   ├── metricsController.js  # Telemetry, overhead, and recovery stats
│       │   ├── nodeController.js
│       │   ├── objectController.js
│       │   └── recoveryController.js # Repair queue and manual repair triggers
│       ├── middleware/
│       │   ├── authMiddleware.js
│       │   ├── errorMiddleware.js
│       │   └── validateMiddleware.js
│       ├── models/
│       │   ├── Activity.js           # Event logging model
│       │   ├── Node.js               # Node schema with failure tracking
│       │   ├── RepairJob.js          # Self-healing job tracking model
│       │   ├── User.js
│       │   └── VaultObject.js        # Object & Replica health state schema
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── chaosRoutes.js
│       │   ├── healthRoutes.js
│       │   ├── index.js
│       │   ├── integrityRoutes.js
│       │   ├── metricsRoutes.js
│       │   ├── nodeRoutes.js
│       │   ├── objectRoutes.js
│       │   └── recoveryRoutes.js
│       ├── services/
│       │   ├── activityService.js
│       │   ├── assistantService.js   (Phase 4 Stub)
│       │   ├── authService.js
│       │   ├── chaosService.js       (Active)
│       │   ├── integrityService.js   (Active)
│       │   ├── nodeService.js        (Active with Failure Detector)
│       │   ├── objectService.js
│       │   ├── rebalanceService.js   (Phase 4 Stub)
│       │   ├── repairService.js      (Active Self-Healing Worker)
│       │   ├── replicationService.js
│       │   ├── storageNodeService.js (Disk copying & byte corruption)
│       │   └── storageService.js
│       ├── utils/
│       │   ├── jwt.js
│       │   └── response.js
│       └── server.js
└── frontend/
    ├── .env.example
    ├── .env.local
    ├── next.config.js
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── tsconfig.json
    └── src/
        ├── app/
        │   ├── globals.css
        │   ├── layout.tsx
        │   ├── page.tsx
        │   ├── login/
        │   │   └── page.tsx
        │   ├── register/
        │   │   └── page.tsx
        │   └── dashboard/
        │       ├── page.tsx          # Telemetry & Storage Overhead Dashboard
        │       ├── chaos/
        │       │   └── page.tsx      # VAULT Chaos Lab & Self-Healing Scorecard
        │       ├── nodes/
        │       │   └── page.tsx      # Storage Fleet Page
        │       └── objects/
        │           └── page.tsx      # Object Explorer Page
        ├── components/
        │   ├── auth/
        │   │   └── ProtectedRoute.tsx
        │   ├── dashboard/
        │   │   ├── ClusterHealthCard.tsx
        │   │   ├── IntegrityCard.tsx
        │   │   ├── InteractiveClusterTopology.tsx # React Flow with fault states
        │   │   ├── NodesCard.tsx
        │   │   ├── RecentActivityCard.tsx
        │   │   ├── ReplicationCard.tsx
        │   │   ├── StatusBadge.tsx
        │   │   └── StorageCard.tsx
        │   ├── layout/
        │   │   ├── Header.tsx
        │   │   ├── Shell.tsx
        │   │   └── Sidebar.tsx
        │   ├── objects/
        │   │   ├── ObjectDetailsModal.tsx # Integrity Verify & Repair Actions
        │   │   └── UploadModal.tsx
        │   └── ui/
        │       ├── Button.tsx
        │       ├── FloatingAssistantButton.tsx
        │       └── Input.tsx
        ├── context/
        │   └── AuthContext.tsx
        ├── lib/
        │   ├── api.ts
        │   └── utils.ts
        └── types/
            └── index.ts
```

---

## API Endpoints Added in Phase 3

### Chaos Engineering (`/api/chaos`)
- `POST /api/chaos/node-failure`: Terminate target node, mark affected replicas `MISSING`, degrade objects, and trigger auto-repair.
- `POST /api/chaos/node-recover`: Re-join storage node to cluster mesh and re-verify replica consistency.
- `POST /api/chaos/corrupt-replica`: Invert bytes on physical replica disk volume to test cryptographic bit-rot detection.

### Integrity Verification (`/api/integrity`)
- `POST /api/integrity/verify/:objectId`: Scrub all replicas on disk using SHA-256 checksums, mark corrupted replicas, and auto-dispatch repair.

### Self-Healing Recovery (`/api/recovery` & `/api/repair`)
- `GET /api/recovery/jobs`: List all self-healing repair jobs with progress, source, target, and status.
- `GET /api/recovery/jobs/:jobId`: Get individual repair job status and bytes transferred.
- `GET /api/recovery/metrics`: Aggregate real recovery stats (jobs created, completed, failed, bytes healed, avg repair time).
- `POST /api/repair/object/:objectId`: Manually dispatch self-healing repair for under-replicated or corrupted object.

---

## Automated Verification & Testing

Run the Phase 3 comprehensive test suite:
```bash
cd backend
node test-phase3.js
```

### Verified Test Cases:
1. Operator authentication and token verification.
2. File ingest with 3x replication factor.
3. Node failure injection marking node `OFFLINE`.
4. Degradation of affected objects (`2/3 replicas, DEGRADED`).
5. Background self-healing worker restoring object to `3/3 replicas, HEALTHY`.
6. Physical file copying verified on target node directory.
7. Cryptographic SHA-256 matching on the restored replica.
8. Controlled data corruption injection marking replica `CORRUPTED`.
9. Integrity verification scrub detecting bit-rot mismatch.
10. Automatic repair engine replacing corrupted replica from healthy peer node.
11. Re-verification confirming 100% SHA-256 match.
12. Node recovery endpoint re-joining offline node.
13. Recovery metrics calculating real repair time, bytes healed, and restored counts.
14. Recovery jobs queue listing completed jobs.
15. Rejection of unauthorized chaos requests (HTTP 401).
16. Frontend compilation with 10 routes passing production build (`npm run build`).
