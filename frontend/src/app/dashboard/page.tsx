'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Shell } from '@/components/layout/Shell';
import { ClusterHealthCard } from '@/components/dashboard/ClusterHealthCard';
import { NodesCard } from '@/components/dashboard/NodesCard';
import { StorageCard } from '@/components/dashboard/StorageCard';
import { ReplicationCard } from '@/components/dashboard/ReplicationCard';
import { IntegrityCard } from '@/components/dashboard/IntegrityCard';
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard';
import { InteractiveClusterTopology } from '@/components/dashboard/InteractiveClusterTopology';
import { UploadModal } from '@/components/objects/UploadModal';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { ClusterMetricsPayload, StorageNode, VaultObject } from '@/types';
import {
  Wifi,
  Upload,
  ArrowRight,
  HardDrive,
  Server,
  Layers,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Flame,
} from 'lucide-react';

interface BackendHealth {
  status: string;
  service: string;
  version: string;
  environment: string;
  database?: {
    connected: boolean;
    state: string;
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<ClusterMetricsPayload | null>(null);
  const [nodes, setNodes] = useState<StorageNode[]>([]);
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const fetchClusterData = async () => {
    try {
      const [healthRes, metricsRes, nodesRes] = await Promise.allSettled([
        api.get<BackendHealth>('/health'),
        api.get<{ success: boolean; data: ClusterMetricsPayload }>('/metrics'),
        api.get<{ success: boolean; data: StorageNode[] }>('/nodes'),
      ]);

      if (healthRes.status === 'fulfilled') {
        setBackendHealth(healthRes.value);
      }
      if (metricsRes.status === 'fulfilled' && metricsRes.value?.data) {
        setMetrics(metricsRes.value.data);
      }
      if (nodesRes.status === 'fulfilled' && nodesRes.value?.data) {
        setNodes(nodesRes.value.data);
      }
    } catch (err) {
      console.error('Error polling dashboard cluster telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClusterData();
    const interval = setInterval(fetchClusterData, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ProtectedRoute>
      <Shell>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Top Control Plane Banner / Status */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 sm:p-5 shadow-sm"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Cluster Telemetry</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">
                  ACTIVE CLUSTER ENGINE
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Distributed object storage control plane with automated replica placement & SHA-256 integrity verification.
              </p>
            </div>

            {/* Quick Actions & Live Backend Handshake */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                <Wifi
                  className={`w-3.5 h-3.5 ${
                    backendHealth ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500 animate-pulse'
                  }`}
                />
                <span className="text-slate-500 dark:text-slate-400">API:</span>
                {backendHealth ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Online (v{backendHealth.version})
                  </span>
                ) : (
                  <span className="text-amber-500 font-semibold">Connecting...</span>
                )}
              </div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchClusterData}
                  title="Refresh Telemetry"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsUploadModalOpen(true)}
                  className="gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Object</span>
                </Button>
              </motion.div>
            </div>
          </motion.div>

          {/* Core Control-Plane Metric Cards with Live Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <ClusterHealthCard
              clusterHealth={metrics?.clusterHealth || 'Healthy'}
              sla={metrics?.sla || '100.00%'}
              healthyNodes={metrics?.nodes?.healthy ?? 5}
              totalNodes={metrics?.nodes?.total ?? 5}
            />
            <NodesCard
              total={metrics?.nodes?.total ?? 5}
              healthy={metrics?.nodes?.healthy ?? 5}
              degraded={metrics?.nodes?.degraded ?? 0}
              offline={metrics?.nodes?.offline ?? 0}
            />
            <StorageCard
              usedBytes={metrics?.storage?.usedBytes ?? 0}
              totalBytes={metrics?.storage?.totalBytes ?? 500 * 1024 * 1024 * 1024}
              utilizationPercentage={metrics?.storage?.utilizationPercentage ?? '0'}
            />
            <ReplicationCard
              totalReplicas={metrics?.objects?.totalReplicas ?? 0}
              degradedObjects={metrics?.objects?.degraded ?? 0}
              totalObjects={metrics?.objects?.total ?? 0}
            />
            <IntegrityCard
              corruptedObjects={metrics?.objects?.corrupted ?? 0}
              totalObjects={metrics?.objects?.total ?? 0}
            />
            <RecentActivityCard activities={metrics?.recentActivity ?? []} />
          </div>

          {/* Phase 4 Distributed Systems Telemetry Strip */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 font-mono text-xs shadow-sm"
          >
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">STORAGE OVERHEAD</span>
                <span className="text-indigo-600 dark:text-indigo-300 font-bold">
                  {metrics?.storage?.overhead?.overheadRatio || '3.00x'} ({metrics?.storage?.overhead?.overheadPercentage || '200.0%'})
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">AVG RECOVERY TIME</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-bold">
                  {metrics?.recovery?.timing?.averageRecoveryMs
                    ? `${metrics.recovery.timing.averageRecoveryMs} ms`
                    : 'Sub-second (<1s)'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">NETWORK PARTITIONS</span>
                <span className={metrics?.networkPartitions?.activeCount ? 'text-rose-600 dark:text-rose-400 font-bold animate-pulse' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                  {metrics?.networkPartitions?.activeCount
                    ? `${metrics.networkPartitions.activeCount} active split(s)`
                    : '0 (Full Mesh)'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">WRITE POLICIES</span>
                <span className="text-amber-600 dark:text-amber-300 font-bold">
                  Q:{metrics?.objects?.durabilityDistribution?.QUORUM || 0} · A:{metrics?.objects?.durabilityDistribution?.ALL || 0} · 1:{metrics?.objects?.durabilityDistribution?.ONE || 0}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Live Interactive React Flow Topology Mesh */}
          <motion.div variants={itemVariants} className="mt-6">
            <InteractiveClusterTopology nodes={nodes} onRefresh={fetchClusterData} />
          </motion.div>

          {/* Quick Links Section */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }}>
              <Link
                href="/dashboard/objects"
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition group flex items-center justify-between shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center group-hover:scale-110 transition">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition">
                      Object Explorer
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Inspect {metrics?.objects?.total || 0} objects
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-1 transition" />
              </Link>
            </motion.div>

            <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }}>
              <Link
                href="/dashboard/nodes"
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-500/50 transition group flex items-center justify-between shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition">
                      Storage Fleet
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {metrics?.nodes?.healthy || 5} nodes online
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
              </Link>
            </motion.div>

            <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }}>
              <Link
                href="/dashboard/chaos"
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-500/50 dark:hover:border-rose-500/50 transition group flex items-center justify-between shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-600/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center group-hover:scale-110 transition">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-300 transition">
                      VAULT Chaos Lab
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Inject faults & watch auto-repair
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 group-hover:translate-x-1 transition" />
              </Link>
            </motion.div>
          </motion.div>

          {/* Upload Modal */}
          <UploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            onUploadSuccess={() => {
              fetchClusterData();
            }}
          />
        </motion.div>
      </Shell>
    </ProtectedRoute>
  );
}
