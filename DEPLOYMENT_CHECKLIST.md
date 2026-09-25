# VAULT: Production Deployment Checklist

Use this operational checklist to verify full system readiness before, during, and after deploying VAULT to cloud infrastructure (Vercel, Render/Railway, MongoDB Atlas).

---

## 1. Database Provisioning (MongoDB Atlas)
- [ ] MongoDB Atlas Project and M0/Dedicated Cluster created.
- [ ] Database user created with readWrite role (strong password).
- [ ] Network Access configured: IP Access List configured with allowed IPs or `0.0.0.0/0` (with strict password authentication).
- [ ] Connection string obtained (`mongodb+srv://<username>:<password>@cluster.mongodb.net/vault?retryWrites=true&w=majority`).
- [ ] Verified that real database credentials are NEVER committed to git.

---

## 2. Backend Service Deployment (Render / Railway)
- [ ] Root directory set to `backend` or build command configured as `cd backend && npm install`.
- [ ] Start command configured as `npm start` (which executes `node src/server.js` listening on `0.0.0.0:$PORT`).
- [ ] Environment Variables configured on host:
  - [ ] `PORT`: System assigned or `5000`
  - [ ] `NODE_ENV`: `production`
  - [ ] `MONGODB_URI`: Atlas connection string
  - [ ] `JWT_SECRET`: Random 32+ character high-entropy secret string
  - [ ] `JWT_EXPIRES_IN`: `7d`
  - [ ] `CORS_ORIGIN`: Production frontend origin (e.g. `https://vault-storage.vercel.app`, strictly NO `*`)
  - [ ] `MAX_UPLOAD_SIZE_MB`: `500`
  - [ ] `DEMO_MODE`: `false` (in strict production) or `true` (if running an interactive live hackathon demo)
  - [ ] `AI_PROVIDER`: `gemini`
  - [ ] `AI_MODEL`: `gemini-1.5-flash`
  - [ ] `AI_API_KEY`: Google Gemini API key (or leave empty to trigger safe unconfigured fallback)
- [ ] Health check probe configured to `GET /api/health` or `GET /api/health/live`.
- [ ] Backend deployed and verified via `curl https://<backend-host>/api/health/ready`.

---

## 3. Frontend Service Deployment (Vercel)
- [ ] Root directory set to `frontend` or build command configured as `npm run build`.
- [ ] Node.js runtime set to 18.x or 20.x+.
- [ ] Public Environment Variable configured:
  - [ ] `NEXT_PUBLIC_API_URL`: `https://<backend-host>/api`
- [ ] Verified that no private backend secrets (JWT, Mongo, AI keys) exist in frontend variables.
- [ ] Frontend deployed and verified with clean Next.js static asset serving.

---

## 4. End-to-End Operational Smoke Testing
- [ ] **Health Endpoint:** `GET /api/health` returns `status: "ok"` and `database: { connected: true }`.
- [ ] **Liveness Probe:** `GET /api/health/live` returns HTTP 200.
- [ ] **Readiness Probe:** `GET /api/health/ready` returns HTTP 200.
- [ ] **User Registration:** Created new account on `/register`.
- [ ] **Authentication & JWT:** Logged in on `/login` and acquired valid JWT; password not returned in responses.
- [ ] **Object Upload:** Uploaded test object with 3x replication and QUORUM durability policy on `/dashboard`.
- [ ] **Replica Placement:** Verified 3 distinct storage nodes assigned on `/dashboard/objects`.
- [ ] **Object Download:** Downloaded object with byte-for-byte SHA-256 verification.
- [ ] **Node Failure Injection:** Simulated node failure in Chaos Lab (`/dashboard/chaos`); node marked `OFFLINE`.
- [ ] **Automatic Self-Healing:** Under-replicated object detected; automatic repair job restored 3/3 healthy replicas.
- [ ] **Data Corruption Scrub:** Injected bit-rot into replica volume; cryptographic verification caught mismatch and repaired it.
- [ ] **Network Partition Simulation:** Created partition between node groups; verified quorum failure and clean recovery.
- [ ] **Storage Rebalance:** Checked skew status and verified copy-then-verify safe migration.
- [ ] **VaultOps AI Copilot:** Opened floating assistant drawer, asked for cluster diagnosis, and reviewed structured proposal.
- [ ] **Production Error Masking:** Verified 404 and 500 errors return structured error objects without leaking stack traces or internal paths.
- [ ] **Security Headers:** Verified `X-Content-Type-Options: nosniff` and `X-Request-Id` headers.
- [ ] **Zero Secrets in Repository:** Audited repository files and verified `.env` files are not tracked in git.
