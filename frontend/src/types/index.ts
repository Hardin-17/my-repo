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
  createdAt?: string;
  updatedAt?: string;
}

export interface Replica {
  nodeId: string;
  version: number;
  checksum: string;
  size: number;
  status: 'HEALTHY' | 'CORRUPTED' | 'DEGRADED' | 'REPAIRING';
  createdAt: string;
  nodeName?: string;
  nodeStatus?: NodeStatus;
  nodeLatency?: number;
  zone?: string;
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
  replicas: Replica[];
  status: ObjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEvent {
  _id?: string;
  eventType:
    | 'OBJECT_UPLOADED'
    | 'OBJECT_DOWNLOADED'
    | 'REPLICA_CREATED'
    | 'NODE_REGISTERED'
    | 'NODE_HEARTBEAT'
    | 'OBJECT_VERIFIED';
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
  };
  objects: {
    total: number;
    healthy: number;
    degraded: number;
    corrupted: number;
    totalReplicas: number;
  };
  recentActivity: ActivityEvent[];
}
