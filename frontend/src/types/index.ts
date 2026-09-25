export interface User {
  id: string;
  name: string;
  email: string;
  role: 'operator' | 'admin' | 'viewer';
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
  errors?: string[];
}

export type NodeStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'REPAIRING';
export type ObjectStatus = 'HEALTHY' | 'DEGRADED' | 'CORRUPTED' | 'REPAIRING';
export type ReplicaStatus = 'HEALTHY' | 'MISSING' | 'CORRUPTED' | 'INCONSISTENT' | 'REPAIRING';
export type RepairJobStatus = 'QUEUED' | 'RUNNING' | 'VERIFYING' | 'COMPLETED' | 'FAILED';
export type DurabilityPolicy = 'ONE' | 'QUORUM' | 'ALL';
export type ReadPolicy = 'ANY_HEALTHY' | 'LOWEST_LATENCY' | 'QUORUM';

export interface StorageNode {
  _id?: string;
  nodeId: string;
  name: string;
  status: NodeStatus;
  capacity: number; // in bytes
  usedStorage: number; // in bytes
  availableStorage: number; // in bytes
  objectCount: number;
  replicaCount: number;
  latency: number; // in ms
  zone: string;
  address: string;
  lastHeartbeat: string;
  failedAt?: string | null;
  failureReason?: string | null;
  failureCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Replica {
  nodeId: string;
  version: number;
  checksum: string;
  size: number;
  status: ReplicaStatus;
  createdAt: string;
  nodeName?: string;
  nodeStatus?: NodeStatus;
  nodeLatency?: number;
  zone?: string;
  reachable?: boolean;
}

export interface VaultObject {
  _id?: string;
  objectId: string;
  ownerId: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
  size: number;
  checksum: string;
  version: number;
  replicationFactor: number;
  durabilityPolicy?: DurabilityPolicy;
  readPolicy?: ReadPolicy;
  replicas: Replica[];
  status: ObjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RepairJob {
  _id?: string;
  jobId: string;
  objectId: string;
  sourceNodeId?: string | null;
  targetNodeId?: string | null;
  reason: 'NODE_FAILURE' | 'CORRUPTION' | 'INCONSISTENCY' | 'MANUAL_REPAIR' | 'RECONCILIATION_REPAIR';
  status: RepairJobStatus;
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  startedAt?: string | null;
  completedAt?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryMetrics {
  repairJobsCreated: number;
  repairJobsCompleted: number;
  repairJobsFailed: number;
  activeRepairs: number;
  totalBytesRepaired: number;
  averageRepairTimeSeconds: number;
  lastRepairTime?: string | null;
  objectsCurrentlyDegraded: number;
  objectsCurrentlyHealthy: number;
  objectsCurrentlyCorrupted: number;
  replicasRestored: number;
}

export interface NetworkPartition {
  _id?: string;
  partitionId: string;
  groups: string[][];
  blockedPairs: { from: string; to: string }[];
  status: 'ACTIVE' | 'RESOLVED';
  reason: string;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface ActionProposal {
  type: 'ACTION_PROPOSAL';
  action:
    | 'TRIGGER_REBALANCE'
    | 'RECOVER_NODE'
    | 'TRIGGER_INTEGRITY_SCAN'
    | 'RECOVER_PARTITION'
    | 'RUN_RECONCILIATION';
  payload: Record<string, any>;
  description: string;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  proposals?: ActionProposal[];
  timestamp: string;
  modelUsed?: string;
}

export interface ActivityEvent {
  _id?: string;
  eventType:
    | 'OBJECT_UPLOADED'
    | 'OBJECT_DOWNLOADED'
    | 'REPLICA_CREATED'
    | 'NODE_REGISTERED'
    | 'NODE_HEARTBEAT'
    | 'OBJECT_VERIFIED'
    | 'NODE_FAILURE_DETECTED'
    | 'NODE_RECOVERED'
    | 'REPLICA_MARKED_MISSING'
    | 'REPLICA_MARKED_CORRUPTED'
    | 'INTEGRITY_CHECK_STARTED'
    | 'INTEGRITY_CHECK_COMPLETED'
    | 'REPAIR_JOB_CREATED'
    | 'REPAIR_STARTED'
    | 'REPAIR_COMPLETED'
    | 'REPAIR_FAILED'
    | 'REPLICA_VERIFIED'
    | 'REPLICA_INCONSISTENT'
    | 'CORRUPTION_INJECTED'
    | 'CHAOS_INJECTED'
    | 'CHAOS_RESOLVED'
    | 'OBJECT_UPDATED'
    | 'REBALANCE_COMPLETED'
    | 'SYSTEM_MAINTENANCE'
    | 'AI_QUERY'
    | 'NETWORK_PARTITION_CREATED'
    | 'NETWORK_PARTITION_RESOLVED';
  message: string;
  userId?: { name: string; email: string; role: string } | string;
  objectId?: string;
  nodeId?: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  timestamp: string;
}

export interface ClusterMetricsPayload {
  clusterHealth: 'Healthy' | 'Warning' | 'Repairing';
  sla: string;
  replicationHealth: string;
  nodes: {
    total: number;
    healthy: number;
    degraded: number;
    offline: number;
    repairing: number;
  };
  storage: {
    totalBytes: number;
    usedBytes: number;
    availableBytes: number;
    utilizationPercentage: string | number;
    overhead?: {
      logicalBytes: number;
      physicalBytes: number;
      overheadPercentage: string;
      overheadRatio?: string;
    };
  };
  objects: {
    total: number;
    healthy: number;
    degraded: number;
    corrupted: number;
    totalReplicas: number;
    corruptedReplicas?: number;
    durabilityDistribution?: {
      ONE: number;
      QUORUM: number;
      ALL: number;
    };
  };
  recovery?: {
    activeRepairs: number;
    completedRepairs: number;
    timing?: {
      fastestRecoveryMs: number;
      slowestRecoveryMs: number;
      averageRecoveryMs: number;
      totalMeasuredRepairs: number;
    };
  };
  networkPartitions?: {
    activeCount: number;
    partitions: {
      partitionId: string;
      groups: string[][];
      blockedPairsCount: number;
      createdAt: string;
    }[];
  };
  recentActivity: ActivityEvent[];
}
