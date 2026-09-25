'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
        {/* Top Control Plane Banner / Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 sm:p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Cluster Telemetry</h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                ACTIVE CLUSTER ENGINE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Distributed object storage control plane with automated replica placement & SHA-256 integrity verification.
            </p>
          </div>

          {/* Quick Actions & Live Backend Handshake */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-mono">
              <Wifi
                className={`w-3.5 h-3.5 ${
                  backendHealth ? 'text-emerald-400' : 'text-amber-400 animate-pulse'
                }`}
              />
              <span className="text-slate-400">API:</span>
              {backendHealth ? (
                <span className="text-emerald-400 font-semibold">
                  Online (v{backendHealth.version})
                </span>
              ) : (
                <span className="text-amber-400 font-semibold">Connecting...</span>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchClusterData}
              title="Refresh Telemetry"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Object</span>
            </Button>
          </div>
        </div>

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

        {/* Storage Overhead & Self-Healing Telemetry Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 font-mono text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400">Replication Overhead</span>
            <span className="text-indigo-300 font-bold">
              {metrics?.storage?.overhead?.overheadPercentage || '200.0%'}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400">Active Self-Healing</span>
            <span className={metrics?.recovery?.activeRepairs ? 'text-cyan-400 font-bold animate-pulse' : 'text-slate-300'}>
              {metrics?.recovery?.activeRepairs || 0} active jobs
            </span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-slate-400">Completed Repairs</span>
            <span className="text-emerald-400 font-bold">
              {metrics?.recovery?.completedRepairs || 0} healed
            </span>
          </div>
        </div>

        {/* Live Interactive React Flow Topology Mesh */}
        <div className="mt-6">
          <InteractiveClusterTopology nodes={nodes} onRefresh={fetchClusterData} />
        </div>

        {/* Quick Links Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
          <Link
            href="/dashboard/objects"
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center group-hover:scale-105 transition">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition">
                  Object Explorer
                </h4>
                <p className="text-xs text-slate-400">
                  Inspect {metrics?.objects?.total || 0} objects
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition" />
          </Link>

          <Link
            href="/dashboard/nodes"
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center group-hover:scale-105 transition">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-emerald-300 transition">
                  Storage Fleet
                </h4>
                <p className="text-xs text-slate-400">
                  {metrics?.nodes?.healthy || 5} nodes online
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition" />
          </Link>

          <Link
            href="/dashboard/chaos"
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 transition group flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center group-hover:scale-105 transition">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white group-hover:text-rose-300 transition">
                  VAULT Chaos Lab
                </h4>
                <p className="text-xs text-slate-400">
                  Inject faults & watch auto-repair
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 group-hover:translate-x-1 transition" />
          </Link>
        </div>

        {/* Upload Modal */}
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUploadSuccess={() => {
            fetchClusterData();
          }}
        />
      </Shell>
    </ProtectedRoute>
  );
}
