# VAULT: Fault-Tolerant Distributed Object Storage System

VAULT is a high-availability, fault-tolerant distributed object storage control plane and engine designed for automated replica self-healing, cryptographic SHA-256 data integrity verification, silent bit-rot detection, and chaos resilience.

---

## Phase 2 Completed: Object Storage & Storage Node Foundation

Phase 2 introduces the distributed storage engine foundation: multi-node file ingest, SHA-256 checksum generation, replica distribution, streaming downloads, logical node storage directories, React Flow topology visualization, and real-time dashboard telemetry.

### What is Completed in Phase 2:
1. **Object Storage Engine (`POST /api/objects`):**
   - Authenticated file ingest with configurable file size limits (`MAX_UPLOAD_SIZE_MB=500`).
   - Bit-level cryptographic SHA-256 checksum calculation on write.
   - Isolated replica placement engine that filters online nodes, avoids duplicate nodes, and selects nodes with the most available capacity.
   - Configurable replication factor (1x to 5x, validated on backend, default 3x).
   - Atomic storage of binary replicas in dedicated logical node directories.
   - Comprehensive metadata persistence in MongoDB (`objectId`, `storageKey`, `mimeType`, `size`, `checksum`, `version`, `replicationFactor`, `replicas`, `status`).
2. **Object Retrieval & Streaming (`GET /api/objects/:id/download`):**
   - Authenticated stream retrieval with ownership validation (multi-tenant tenant isolation).
   - Replica health selection and stream-piping directly to client without buffering entire large files in memory.
   - Returns proper `Content-Disposition`, `Content-Length`, and `ETag` headers.
3. **Storage Node Management & Heartbeat Daemon (`/api/nodes`):**
   - Independent logical storage nodes represented under `backend/storage/node-01` through `node-05`.
   - Node initialization auto-seeds 5 demo storage nodes (100 GB capacity each across distinct simulated zones: `us-east-1a`, `us-east-1b`, `us-west-2a`, `eu-west-1a`, `ap-south-1a`).
   - Dynamic node capacity tracking (`usedStorage`, `availableStorage`, `objectCount`, `replicaCount`).
   - Heartbeat signaling endpoint (`POST /api/nodes/:id/heartbeat`) and non-blocking background heartbeat simulation with latency jitter.
4. **Interactive Topology Mesh with React Flow:**
   - Visual control-plane canvas on `/dashboard` and `/dashboard/nodes` showing VAULT Consensus Coordinator connected to storage nodes.
   - Live visual statuses (`ONLINE`, `DEGRADED`, `OFFLINE`), live latency, capacity badges, and interactive click-to-inspect drawer.
5. **Object Explorer UI (`/dashboard/objects`):**
   - Real-time search across object names, keys, and SHA-256 checksums.
   - Interactive Upload Experience with drag-and-drop, replication factor picker (1x-5x), and visual multi-step pipeline (`Streaming` -> `SHA-256` -> `Selecting Nodes` -> `Replicating` -> `Verifying`).
   - Object Details Modal displaying full checksum, version, size, and replica breakdown per storage node with download and integrity verification triggers.
6. **Storage Nodes UI (`/dashboard/nodes`):**
   - Node fleet cards with capacity utilization progress bars, stored objects, replica count, latency, and manual heartbeat ping.
7. **Cluster Metrics Telemetry (`GET /api/metrics`):**
   - Real-time aggregation of cluster state, SLA, capacity used/total, replica health, and activity event stream.
8. **Activity / Event Logging:**
   - Tracks `OBJECT_UPLOADED`, `OBJECT_DOWNLOADED`, `REPLICA_CREATED`, `NODE_REGISTERED`, `NODE_HEARTBEAT`, and `OBJECT_VERIFIED`.
9. **Embedded Zero-Config Database Fallback:**
   - Seamlessly uses external MongoDB or MongoDB Atlas when configured, and falls back to an embedded in-memory MongoDB engine in development mode so evaluators can run the full suite immediately without installing MongoDB.

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
│   └── src/
│       ├── config/
│       │   ├── db.js
│       │   └── env.js
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── healthController.js
│       │   ├── metricsController.js
│       │   ├── nodeController.js
│       │   └── objectController.js
│       ├── middleware/
│       │   ├── authMiddleware.js
│       │   ├── errorMiddleware.js
│       │   └── validateMiddleware.js
│       ├── models/
│       │   ├── Activity.js
│       │   ├── Node.js
│       │   ├── User.js
│       │   └── VaultObject.js
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── healthRoutes.js
│       │   ├── index.js
│       │   ├── metricsRoutes.js
│       │   ├── nodeRoutes.js
│       │   └── objectRoutes.js
│       ├── services/
│       │   ├── activityService.js
│       │   ├── assistantService.js   (Phase 4 Stub)
│       │   ├── authService.js
│       │   ├── chaosService.js       (Phase 4 Stub)
│       │   ├── integrityService.js   (Phase 3 Stub)
│       │   ├── nodeService.js
│       │   ├── rebalanceService.js   (Phase 3 Stub)
│       │   ├── repairService.js      (Phase 3 Stub)
│       │   ├── replicationService.js (Phase 3 Stub)
│       │   ├── storageNodeService.js
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
        │       ├── page.tsx
        │       ├── nodes/
        │       │   └── page.tsx
        │       └── objects/
        │           └── page.tsx
        ├── components/
        │   ├── auth/
        │   │   └── ProtectedRoute.tsx
        │   ├── dashboard/
        │   │   ├── ClusterHealthCard.tsx
        │   │   ├── IntegrityCard.tsx
        │   │   ├── InteractiveClusterTopology.tsx (React Flow)
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
        │   │   ├── ObjectDetailsModal.tsx
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

## Environment Variables

### Backend (`backend/.env`)
```bash
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/vault   # Local MongoDB or MongoDB Atlas URI (falls back to memory engine if offline)
JWT_SECRET=vault_dev_super_secret_jwt_key_983742918237498234
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
MAX_UPLOAD_SIZE_MB=500
```

### Frontend (`frontend/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## How to Run the Application

### 1. Run Backend Server
```bash
cd backend
npm install
npm run dev
```
The server starts on port `5000` and automatically initializes `node-01` through `node-05` in `backend/storage/`.

### 2. Run Frontend Application
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## API Overview

### Authentication
- `POST /api/auth/register`: Create a new user account.
- `POST /api/auth/login`: Authenticate and receive a JWT Bearer token.
- `GET /api/auth/me`: Retrieve authenticated user profile (protected).
- `POST /api/auth/logout`: Invalidate client session.

### Object Storage (`/api/objects`)
- `POST /api/objects`: Upload a file (`multipart/form-data`) with `replicationFactor` (1-5). Calculates SHA-256 and writes to distinct nodes.
- `GET /api/objects`: List all objects belonging to the authenticated user.
- `GET /api/objects/:id`: Retrieve object metadata and replica state.
- `GET /api/objects/:id/replicas`: Inspect replica distribution across storage nodes with live node latencies.
- `GET /api/objects/:id/download`: Stream download a file from a healthy node replica.

### Storage Nodes (`/api/nodes`)
- `GET /api/nodes`: List all storage nodes with capacity and health stats.
- `GET /api/nodes/:id`: Get detailed status for an individual node.
- `POST /api/nodes`: Register a dynamic storage node.
- `POST /api/nodes/:id/heartbeat`: Signal heartbeat and acknowledge node is online.

### Cluster Telemetry (`/api/metrics`)
- `GET /api/metrics`: Retrieve calculated cluster health, SLA percentage, node breakdown, disk pool utilization, replica counts, and recent activity logs.

---

## Automated Verification & Testing

Run the Phase 2 end-to-end test suite:
```bash
cd backend
node test-phase2.js
```

### Verified Test Cases:
1. `GET /api/health`: Service health response verification.
2. `POST /api/auth/register`: User 1 account creation and JWT issuance.
3. `POST /api/auth/register`: User 2 account creation for multi-tenant isolation testing.
4. `GET /api/nodes`: 5 default storage nodes initialized with 100 GB capacity each.
5. `POST /api/objects`: File upload with 3x replication factor.
6. SHA-256 cryptographic checksum matching.
7. Verification of physical binary files in `backend/storage/node-0X/`.
8. `GET /api/objects`: Object listing and metadata retrieval.
9. `GET /api/objects/:id`: Detailed object inspection.
10. `GET /api/objects/:id/replicas`: Replica status, version, and latency check.
11. `GET /api/objects/:id/download`: Stream download bit-for-bit SHA-256 verification.
12. Capacity tracking: `usedStorage`, `availableStorage`, and `replicaCount` updates.
13. `POST /api/nodes/:id/heartbeat`: Heartbeat timestamp acknowledgement.
14. Multi-tenant security: User 2 forbidden from accessing User 1 object (HTTP 403).
15. Multi-tenant download: User 2 forbidden from downloading User 1 object (HTTP 403).
16. Unauthenticated rejection: Requests without token rejected (HTTP 401).
17. Replication factor bounds: Values $> 5$ rejected with HTTP 400 Bad Request.
18. Path traversal defense: Malicious relative keys (`../../secret.env`) blocked.
19. `GET /api/metrics`: Dynamic calculation of real cluster metrics.
20. Frontend production build: Compiled with 0 TypeScript and JSX errors.

---

## Storage Node Simulation Limitations

1. **Simulated Nodes:** Storage nodes run on the local filesystem in dedicated folders (`backend/storage/node-01` .. `node-05`) abstracted behind `StorageNodeService`. They are not separate physical servers.
2. **Network Partitions:** Network delays and heartbeats are currently simulated; true distributed socket communication will be introduced in future phases.
3. **No Automatic Repair Yet:** Under-replicated or corrupted chunks will be repaired by the background repair engine in Phase 3.

---

## Phase 3 Scope (Upcoming)

1. **Automated Replica Self-Healing:** Background repair daemon detecting under-replicated chunks and re-replicating from surviving nodes.
2. **Cryptographic Integrity Scrubber:** Background SHA-256 verification scanning for silent bit-rot and replica corruption.
3. **Background Rebalancing Engine:** Balancing disk utilization uniformly across nodes.
4. **Replica Inconsistency Resolution:** Read-repair and quorum-based reconciliation.
