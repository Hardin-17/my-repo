'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Shell } from '@/components/layout/Shell';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { InteractiveClusterTopology } from '@/components/dashboard/InteractiveClusterTopology';
import { Button } from '@/components/ui/Button';
import { StorageNode } from '@/types';
import { api } from '@/lib/api';
import { formatBytes, formatRelativeTime } from '@/lib/utils';
import {
  Server,
  RefreshCw,
  Radio,
  HardDrive,
  Cpu,
  Layers,
  Activity,
  CheckCircle2,
  HeartPulse,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function StorageNodesPage() {
  const [nodes, setNodes] = useState<StorageNode[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pingingNodeId, setPingingNodeId] = useState<string | null>(null);

  const fetchNodes = async () => {
    try {
      const response = await api.get<{ success: boolean; data: StorageNode[] }>('/nodes');
      if (response.data) {
        setNodes(response.data);
      }
    } catch (err) {
      console.error('Failed to load nodes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 6000);
    return () => clearInterval(interval);
  }, []);

  const handlePingHeartbeat = async (nodeId: string) => {
    setPingingNodeId(nodeId);
    try {
      await api.post(`/nodes/${nodeId}/heartbeat`);
      await fetchNodes();
    } catch (err: any) {
      alert(err.message || 'Heartbeat ping failed');
    } finally {
      setPingingNodeId(null);
    }
  };

  return (
    <ProtectedRoute>
      <Shell>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 sm:p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Storage Nodes</h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                {nodes.filter((n) => n.status === 'ONLINE').length} / {nodes.length} ONLINE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Distributed node fleet, disk capacity allocation, heartbeat consensus, and zone latency.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchNodes}
              isLoading={isLoading}
              title="Refresh Nodes"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Interactive React Flow Topology Mesh */}
        <InteractiveClusterTopology nodes={nodes} onRefresh={fetchNodes} />

        {/* Node Cards Grid */}
        <div className="space-y-3 mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" />
              Physical & Logical Storage Fleet
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Total Capacity: {formatBytes(nodes.reduce((acc, n) => acc + (n.capacity || 0), 0))}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {nodes.map((node, index) => {
              const utilPercent =
                node.capacity > 0 ? ((node.usedStorage / node.capacity) * 100).toFixed(1) : '0';

              return (
                <motion.div
                  key={node.nodeId}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-sm space-y-4 flex flex-col justify-between group"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                          {node.nodeId}
                        </span>
                        <StatusBadge status={node.status} size="sm" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-200">{node.name}</h4>
                      <p className="text-[11px] font-mono text-slate-400">
                        {node.zone} · {node.address}
                      </p>
                    </div>

                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition">
                      <Server className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80 font-mono text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Capacity Utilization</span>
                      <span className="text-indigo-300 font-semibold">{utilPercent}%</span>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(2, Number(utilPercent))}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>{formatBytes(node.usedStorage)} used</span>
                      <span>{formatBytes(node.capacity)} total</span>
                    </div>
                  </div>

                  {/* Node Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-center font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Objects</span>
                      <span className="text-slate-200 font-bold">{node.objectCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Replicas</span>
                      <span className="text-indigo-400 font-bold">{node.replicaCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Latency</span>
                      <span className="text-emerald-400 font-bold">{node.latency}ms</span>
                    </div>
                  </div>

                  {/* Card Footer: Heartbeat and Manual Ping */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-mono text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      <span>{formatRelativeTime(node.lastHeartbeat)}</span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      isLoading={pingingNodeId === node.nodeId}
                      onClick={() => handlePingHeartbeat(node.nodeId)}
                      className="text-[11px] py-1 px-2.5"
                    >
                      <HeartPulse className="w-3 h-3 mr-1 text-rose-400" />
                      <span>Ping</span>
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </Shell>
    </ProtectedRoute>
  );
}
