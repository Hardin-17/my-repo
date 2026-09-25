# VAULT: Fault-Tolerant Distributed Object Storage System

> A production-hardened, fault-tolerant distributed object storage engine and control plane featuring quorum-based durability policies, automated replica self-healing, cryptographic SHA-256 integrity verification, network partition resilience, background rebalancing, and an autonomous AI operations co-pilot.

---

## Problem Statement

Modern cloud infrastructure relies on distributed storage layers that must reliably persist and serve mission-critical data over unreliable networks and independently failing hardware. Traditional storage solutions often suffer from:
- **Silent data corruption (bit-rot)** undetected until read time.
- **Node churn and split-brain scenarios** during network partitions.
- **Under-replicated vulnerability windows** when storage drives crash.
- **Uneven disk utilization skew** as objects are written and deleted.
- **Inconsistent replica versions** caused by concurrent writes and partial network failures.

**VAULT** addresses these challenges by implementing an active, self-healing distributed architecture that continuously monitors replica health, mathematically proves payload integrity, enforces configurable durability quorums, automatically rebalances cluster storage, and orchestrates live incident recovery.

---

## System Architecture

```
                       ┌─────────────────────────────────────────┐
                       │          Next.js 14 Frontend            │
                       │   (TailwindCSS, Framer Motion, Lucide)  │
                       │           Deployed on Vercel            │
                       └────────────────────┬────────────────────┘
                                            │ HTTPS / REST
                                            ▼
                       ┌─────────────────────────────────────────┐
                       │        Express.js Backend API           │
                       │  (Helmet, Rate Limits, Strict CORS)     │
                       │      Deployed on Render / Railway       │
                       └───┬───────────────┬─────────────────┬───┘
                           │               │                 │
            Metadata Store │               │ Storage Mesh    │ AI Diagnostics
                           ▼               ▼                 ▼
             ┌───────────────────┐ ┌───────────────┐ ┌───────────────────┐
             │   MongoDB Atlas   │ │ Storage Nodes │ │    VaultOps AI    │
             │ (Objects, Nodes,  │ │ (node-01..05) │ │ (Gemini API with  │
             │  Repairs, Part.)  │ │ Isolated Root │ │ Deterministic     │
             └───────────────────┘ └───────────────┘ │ Fallback Engine)  │
                                                     └───────────────────┘
```

### Core Subsystems:
1. **Object Storage Engine (`objectService.js`):** Coordinates multi-node streaming writes, calculates SHA-256 digests on the fly, checks quorum consensus, and manages optimistic concurrency object versioning.
2. **Cluster Health & Failure Detector (`nodeService.js`, `chaosService.js`):** Continuously monitors node availability, simulates crashes, and isolates offline nodes from the routing mesh.
3. **Cryptographic Integrity Scrubber (`integrityService.js`):** Performs byte-level SHA-256 disk audits, detecting silent data corruption and flagging damaged replicas for quarantine.
4. **Autonomous Self-Healing Pipeline (`repairService.js`):** Background worker pool that detects under-replicated or corrupted objects and orchestrates concurrent repairs from verified healthy peers.
5. **Network Partition Simulator (`networkService.js`):** Simulates datacenter network splits and fiber cuts between arbitrary node groups, testing partition-tolerant quorum behavior.
6. **Storage Rebalancing Engine (`rebalanceService.js`):** Computes cluster-wide utilization skew and executes safe copy-then-verify migrations to level storage distribution.
7. **VaultOps AI Assistant (`assistantService.js`):** Operations co-pilot that ingests sanitized cluster telemetry, diagnoses anomalies, and proposes verified operational actions with mandatory human-in-the-loop confirmation.

---

## Core Features

- **Configurable Write Durability:**
  - `ONE`: Fast acknowledgement upon single replica write ($\ge 1$).
  - `QUORUM`: Majority consensus requiring $\lfloor RF/2 \rfloor + 1$ node acknowledgements with automatic atomic rollback on quorum failure.
  - `ALL`: Strict durability requiring 100% replica writes.
- **Configurable Read Policies:**
  - `ANY_HEALTHY`: Serves from any available healthy replica.
  - `LOWEST_LATENCY`: Routes to the reachable replica with the lowest measured ping latency.
  - `QUORUM`: Confirms version and checksum consensus across majority replicas before streaming.
- **Object Versioning & Optimistic Concurrency:** Atomic version increments (`v1 -> v2`) preventing concurrent overwrite conflicts.
- **Self-Healing & Auto-Repair:** Automatic detection of under-replicated objects upon node failure and autonomous reconstruction on surviving nodes.
- **Bit-Rot Detection & Quarantine:** Real-time SHA-256 scrubber detects injected byte corruption, marks the replica degraded, and initiates healing.
- **Network Partition Tolerance:** Simulates network splits (e.g., Partition Group A vs Group B) and enforces quorum boundaries.
- **Copy-Then-Verify Storage Rebalancing:** Proactively detects disk skew ($> 20\%$) and migrates replicas from overloaded to underloaded nodes without downtime.
- **Production Hardened:** Strict CORS, Helmet security headers, rate limiting on sensitive routes, correlation request IDs (`x-request-id`), structured logging, and Kubernetes-compatible health probes (`/api/health`, `/api/health/live`, `/api/health/ready`).

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Framer Motion, Lucide React |
| **Backend** | Node.js (v18+), Express.js, Helmet, Express Rate Limit, CORS, Multer |
| **Database** | MongoDB Atlas / Local MongoDB, Mongoose ODM |
| **AI Engine** | Google Gemini API (`@google/genai` / REST) with offline deterministic fallback |
| **Testing** | Node.js custom test harness spanning 5 test suites (110+ passing tests) |

---

## Local Setup

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)
- MongoDB instance (local or MongoDB Atlas connection string)

### 1. Clone Repository
```bash
git clone https://github.com/your-username/vault.git
cd vault
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```

Configure `backend/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/vault
JWT_SECRET=your-secure-jwt-secret-min-32-chars
CORS_ORIGIN=http://localhost:3000
DEMO_MODE=true
# Optional: GEMINI_API_KEY=your-api-key
```

Start the backend:
```bash
npm run dev
# Backend runs on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env.local
```

Configure `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Start the frontend:
```bash
npm run dev
# Frontend runs on http://localhost:3000
```

---

## Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Port for the Express backend server |
| `NODE_ENV` | Yes | `development` | Runtime environment (`development`, `production`, `test`) |
| `MONGODB_URI` | Yes | — | MongoDB connection string (Atlas or local) |
| `JWT_SECRET` | Yes | — | Secret key for JWT signing (min 32 characters in production) |
| `CORS_ORIGIN` | Yes | `http://localhost:3000` | Allowed frontend origin for CORS |
| `STORAGE_BASE_PATH`| No | `./storage` | Base path for isolated storage node directories |
| `DEMO_MODE` | No | `false` | Enables demo seeds and the `/api/demo/reset` endpoint |
| `GEMINI_API_KEY` | No | — | Google Gemini API Key for VaultOps AI Assistant |
| `AI_PROVIDER` | No | `gemini` | AI provider identifier |
| `AI_MODEL` | No | `gemini-1.5-flash` | LLM model identifier |

### Frontend (`frontend/.env.local`)
| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:5000/api` | Base URL pointing to the backend API |

---

## Deployment Instructions

### 1. Database: MongoDB Atlas
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a database user with read/write privileges.
3. Whitelist Network Access: Allow access from `0.0.0.0/0` (or your backend provider's IP range).
4. Copy the connection string: `mongodb+srv://<user>:<password>@cluster.mongodb.net/vault?retryWrites=true&w=majority`.

### 2. Backend: Render or Railway
1. **Repository:** Connect your GitHub repository.
2. **Root Directory:** Set to `backend`.
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. **Environment Variables:**
   - `NODE_ENV=production`
   - `PORT=5000` (or leave default assigned by platform)
   - `MONGODB_URI=<your-atlas-uri>`
   - `JWT_SECRET=<generated-secure-random-32-char-string>`
   - `CORS_ORIGIN=https://<your-vercel-domain>.vercel.app`
   - `DEMO_MODE=true` (enables demo reset during hackathon evaluations)
   - `GEMINI_API_KEY=<optional-gemini-key>`

### 3. Frontend: Vercel
1. Import repository into [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. **Framework Preset:** Next.js.
4. **Environment Variables:**
   - `NEXT_PUBLIC_API_URL=https://<your-backend-app>.onrender.com/api`
5. Deploy.
6. Copy the Vercel deployment URL and update `CORS_ORIGIN` in your backend environment variables.

---

## Verification Test Suites

VAULT includes comprehensive, automated test suites verifying distributed system invariants across all phases:

```bash
cd backend

# Phase 1: Authentication & Node Management
node test-backend.js

# Phase 2: Object Placement & Replication (19 tests)
node test-phase2.js

# Phase 3: Fault Tolerance, Corruption & Auto-Repair (14 tests)
node test-phase3.js

# Phase 4: Quorums, Partitions, Rebalancing, AI & Metrics (53 tests)
node test-phase4.js

# Phase 5: Production Hardening, Health Probes & Demo Readiness (25 tests)
node test-phase5.js
```

**Results:** 100% test pass rate across all test suites (>110 passing assertions).

---

## Demonstration Script

For a structured, live 5–7 minute walkthrough covering:
1. Multi-node object upload with quorum durability
2. Simulated node crashes and autonomous replica repair
3. Silent bit-rot corruption detection via SHA-256 scrubbing
4. Datacenter network partition isolation and recovery
5. Storage rebalancing skew leveling
6. VaultOps AI copilot diagnosis and confirmed action execution

👉 Consult the full guide: **[DEMO_SCRIPT.md](DEMO_SCRIPT.md)**

---

## Known Limitations & Architecture Disclosure

- **Simulated Node Storage Disks:** In this implementation, storage nodes (`node-01` through `node-05`) are simulated as isolated directory volumes within the backend host filesystem (`backend/storage/`).
- **Persistence on Ephemeral Cloud Containers:** When deployed to stateless cloud containers (such as standard Render or Railway services without persistent volume attachments), files written to the local disk are ephemeral and reset upon container restarts. In enterprise production, each node would run as an independent microservice container with dedicated Persistent Volume Claims (PVCs) or cloud block storage attachments.
- **Single Backend Control Plane:** The current control plane runs as a unified Node.js process coordinating the nodes. Multi-region masterless clustering would utilize a Raft consensus log across replicated control plane daemons.
