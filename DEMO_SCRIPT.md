# VAULT: 5–7 Minute Live Demo Script

This deterministic walk-through demonstrates all distributed storage, fault tolerance, self-healing, network partition, and AI capabilities of VAULT.

---

### Prerequisites
1. Backend running: `cd backend && npm start` (or `npm run dev`)
2. Frontend running: `cd frontend && npm run dev`
3. Browser open to: `http://localhost:3000`

---

### Step 1: Authentication & Control Plane Entry (30s)
1. Navigate to `/login`.
2. Enter operator credentials (or register a fresh account at `/register`).
3. Point out JWT authentication, route protection, and instant control plane telemetry handshake.

### Step 2: Dashboard Overview & Topology Mesh (30s)
1. Review the top telemetry cards:
   - **Cluster Health** (`Healthy`), **SLA** (`100%`), and **Storage Node Mesh** (`5/5 Online`).
2. Point out the **Phase 4 Distributed Telemetry Strip**:
   - **Storage Overhead Ratio** (`3.00x`), **Average Recovery Time** (`<1s`), **Network Partitions** (`0 Full Mesh`), and **Write Policies Distribution**.
3. Scroll to the interactive **React Flow Cluster Topology**:
   - Highlight 5 storage nodes distributed across simulated geographic zones (`us-east`, `us-west`, `eu-central`).

### Step 3: Multi-Node Replicated Object Ingest (45s)
1. Click **Upload Object** on the dashboard.
2. Select a file (e.g. `demo.zip` or any sample document).
3. Set **Replication Factor** to `3x`.
4. Highlight the **Write Durability Policy** selector:
   - Select `QUORUM` ($\lfloor 3/2 \rfloor + 1 = 2$ acks required).
5. Highlight the **Read / Retrieval Policy** selector (`ANY_HEALTHY` or `LOWEST_LATENCY`).
6. Click **Upload & Replicate**.
7. Watch the live 5-stage ingestion pipeline:
   - Streaming File $\rightarrow$ SHA-256 Computation $\rightarrow$ Node Selection $\rightarrow$ Replica Placement $\rightarrow$ Storage Verification.

### Step 4: Replica Inspection & Cryptographic Fingerprinting (30s)
1. Navigate to **Object Explorer** (`/dashboard/objects`).
2. Click on the uploaded object to open the **Replica Detail Modal**.
3. Point out:
   - Cryptographic SHA-256 signature calculated on raw binary stream.
   - 3 distinct physical replica locations (e.g., `node-01`, `node-02`, `node-03`).
   - Object version: `v1`.

### Step 5: Storage Node Outage & Automatic Self-Healing (60s)
1. Navigate to **Chaos Lab** (`/dashboard/chaos`).
2. In the **Node Failure Injection** card, select `node-01`.
3. Click **Kill Node** and confirm the prompt.
4. Observe immediate reactions:
   - Node status transitions to `OFFLINE`.
   - Affected object transitions to `DEGRADED` (only 2 healthy replicas remain).
   - A `NODE_FAILURE` self-healing job is automatically dispatched to the **Repair Queue**.
5. Within 1–2 seconds, watch the background worker complete:
   - Replicas restored from 2 back to 3 by copying from a healthy peer to an underutilized node (`node-04` or `node-05`).
   - Object status automatically restores to `HEALTHY`.
6. Highlight the **Fault Recovery Scorecard**:
   - Zero bytes data lost, 100% SHA-256 integrity preserved.
7. Click **Recover Node** on `node-01` to bring it back online.

### Step 6: Silent Bit-Rot Corruption & Cryptographic Scrubbing (45s)
1. In the **Data Corruption (Bit-Rot)** card:
   - Select the test object and target replica on `node-02`.
2. Click **Corrupt Replica & Verify**.
3. Explain what just happened:
   - The backend directly modified physical bytes on disk to simulate magnetic media bit-rot.
   - The SHA-256 integrity scrubber detected the signature mismatch.
   - The corrupted replica was flagged `CORRUPTED`, and a self-healing pipeline pulled a verified bit-for-bit copy from a healthy peer, restoring health.

### Step 7: Partial Network Partition Simulation & Quorum Write Rejection (60s)
1. In the **Network Partition Lab** card:
   - Assign nodes into two isolated groups:
     - **Group A:** `[node-01, node-02]`
     - **Group B:** `[node-03, node-04, node-05]`
2. Click **Sever Mesh Link** and confirm.
3. Observe:
   - All 5 nodes remain `ONLINE` (not falsely marked dead).
   - An active partition banner appears: `[node-01, node-02] ⚡ [BLOCKED] ⚡ [node-03, node-04, node-05]`.
4. Attempt a write with `ALL` durability policy across the cluster:
   - The write is rejected with `503 Service Unavailable: Write durability policy "ALL" failed`.
   - Partial writes are rolled back from disk, preserving consistency without ghost replicas!
5. Click **Heal All Links** in the Chaos Lab:
   - Full mesh connectivity is restored immediately.

### Step 8: Background Storage Rebalancing (30s)
1. Explain storage rebalancing:
   - VAULT continuously tracks disk skew across all storage nodes.
   - If a node exceeds the 20% skew threshold, background migration moves chunks.
2. In the AI copilot or dashboard, observe that migrations follow **Copy-Then-Verify Safety**:
   - Target checksum is strictly verified before source chunks are deleted.

### Step 9: VaultOps AI Copilot (45s)
1. Click the floating **VaultOps AI** button in the bottom right.
2. Click the quick prompt: **"Diagnose Health"**.
3. Review the AI's diagnostic breakdown:
   - Live cluster status, node latency overview, degraded objects count.
4. Click **"Check Skew"**:
   - The AI inspects disk utilization and returns a structured **Action Proposal**:
     `TRIGGER_REBALANCE (Copy-then-verify background migration)`.
5. Point out the **Confirm & Execute** button:
   - The operator remains in full control; destructive operations can never be run autonomously by the AI without operator approval.

### Step 10: Conclusion & Architecture Summary (30s)
1. Conclude the demo:
   - Reiterate that VAULT implements real distributed-systems primitives:
     - Quorum durability & read policies
     - Bit-rot self-healing
     - Real network partition reachability
     - Optimistic concurrency versioning
     - Autonomous operational copilot
2. Note on deployment:
   - Container-ready, 0.0.0.0 host binding, Next.js production verified, and prepared for MongoDB Atlas, Render/Railway, and Vercel.
