'use client';

import React, { useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { StorageNode } from '@/types';
import { StatusBadge } from './StatusBadge';
import { formatBytes, formatRelativeTime } from '@/lib/utils';
import { Database, Server, Radio, X, AlertTriangle, ShieldCheck } from 'lucide-react';

interface InteractiveClusterTopologyProps {
  nodes: StorageNode[];
  onRefresh?: () => void;
}

export const InteractiveClusterTopology: React.FC<InteractiveClusterTopologyProps> = ({
  nodes,
}) => {
  const [selectedNode, setSelectedNode] = useState<StorageNode | null>(null);

  // Construct React Flow Nodes and Edges dynamically from real cluster nodes
  const { flowNodes, flowEdges } = useMemo(() => {
    const fNodes: Node[] = [];
    const fEdges: Edge[] = [];

    const hasOffline = nodes.some((n) => n.status === 'OFFLINE');
    const hasRepairing = nodes.some((n) => n.status === 'REPAIRING');

    // Central Coordinator Node
    fNodes.push({
      id: 'vault-coordinator',
      type: 'default',
      position: { x: 340, y: 30 },
      data: {
        label: (
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border-2 border-indigo-500 shadow-xl shadow-indigo-500/20 text-center min-w-[200px]">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-600/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Database className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-xs text-slate-900 dark:text-white tracking-wide">VAULT Coordinator</span>
            </div>
            <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              {hasRepairing
                ? 'Repair Coordinator Active'
                : hasOffline
                ? 'Consensus Handling Node Fault'
                : 'Consensus Quorum Active'}
            </div>
          </div>
        ),
      },
      style: { background: 'transparent', border: 'none', padding: 0 },
    });

    // Distribute storage nodes horizontally
    const count = nodes.length;
    const spacing = 190;
    const startX = 340 - ((count - 1) * spacing) / 2;

    nodes.forEach((node, index) => {
      const x = startX + index * spacing;
      const y = 190;

      const isOnline = node.status === 'ONLINE';
      const isOffline = node.status === 'OFFLINE';
      const isRepairing = node.status === 'REPAIRING';
      const isDegraded = node.status === 'DEGRADED';

      const borderStyle = isOffline
        ? 'border-rose-500 bg-rose-50/90 dark:bg-rose-950/40 shadow-rose-500/20'
        : isRepairing
        ? 'border-cyan-400 bg-cyan-50/90 dark:bg-cyan-950/30 shadow-cyan-400/20 animate-pulse'
        : isDegraded
        ? 'border-amber-400 bg-amber-50/90 dark:bg-amber-950/30'
        : 'border-slate-200 dark:border-slate-700/80 hover:border-indigo-500';

      const strokeColor = isOffline
        ? '#f43f5e'
        : isRepairing
        ? '#06b6d4'
        : isDegraded
        ? '#f59e0b'
        : '#6366f1';

      fNodes.push({
        id: node.nodeId,
        type: 'default',
        position: { x, y },
        data: {
          label: (
            <div
              onClick={() => setSelectedNode(node)}
              className={`p-3 rounded-xl bg-white/95 dark:bg-slate-900/95 border-2 transition-all cursor-pointer hover:scale-105 shadow-lg min-w-[165px] ${borderStyle}`}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Server
                    className={`w-3.5 h-3.5 ${
                      isOffline
                        ? 'text-rose-500 dark:text-rose-400'
                        : isRepairing
                        ? 'text-cyan-500 dark:text-cyan-400'
                        : 'text-indigo-600 dark:text-indigo-400'
                    }`}
                  />
                  <span className="font-semibold font-mono text-xs text-slate-800 dark:text-slate-100">
                    {node.nodeId}
                  </span>
                </div>
                <StatusBadge status={node.status} size="sm" />
              </div>

              <div className="space-y-1 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Latency:</span>
                  <span className="text-slate-700 dark:text-slate-200 font-bold">{node.latency}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Storage:</span>
                  <span className="text-slate-700 dark:text-slate-200">
                    {formatBytes(node.usedStorage)} / {formatBytes(node.capacity)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Replicas:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{node.replicaCount}</span>
                </div>
              </div>
            </div>
          ),
        },
        style: { background: 'transparent', border: 'none', padding: 0 },
      });

      // Edge from coordinator to node
      fEdges.push({
        id: `edge-coord-${node.nodeId}`,
        source: 'vault-coordinator',
        target: node.nodeId,
        animated: isOnline || isRepairing,
        style: {
          stroke: strokeColor,
          strokeWidth: isOffline ? 1 : 2,
          strokeDasharray: isOffline ? '4 4' : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 14,
          height: 14,
        },
      });
    });

    // Mesh edges between adjacent storage nodes to represent peer-to-peer gossip
    for (let i = 0; i < nodes.length - 1; i++) {
      const src = nodes[i];
      const dst = nodes[i + 1];
      const isMeshActive = src.status === 'ONLINE' && dst.status === 'ONLINE';

      fEdges.push({
        id: `peer-${src.nodeId}-${dst.nodeId}`,
        source: src.nodeId,
        target: dst.nodeId,
        animated: false,
        style: {
          stroke: isMeshActive ? '#475569' : '#334155',
          strokeWidth: 1,
          strokeDasharray: '2 2',
          opacity: 0.5,
        },
      });
    }

    return { flowNodes: fNodes, flowEdges: fEdges };
  }, [nodes]);

  return (
    <div className="space-y-3">
      {/* Title & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Active Topology & Heartbeat Mesh
          </h3>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
            INTERACTIVE
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 animate-pulse" />
            Consensus: Active
          </span>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div className="h-[360px] w-full rounded-xl bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 relative shadow-inner">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#94a3b8" gap={20} size={1} variant={BackgroundVariant.Dots} className="dark:opacity-30 opacity-40" />
          <Controls className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg shadow-lg fill-slate-900 dark:fill-white" />
        </ReactFlow>
      </div>

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-indigo-200 dark:border-indigo-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{selectedNode.name}</h4>
                <StatusBadge status={selectedNode.status} size="sm" />
              </div>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {selectedNode.nodeId} · Zone: {selectedNode.zone} · IP: {selectedNode.address}
              </p>
              {selectedNode.failureReason && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-mono mt-0.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Fault: {selectedNode.failureReason}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Used / Capacity</span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">
                {formatBytes(selectedNode.usedStorage)} / {formatBytes(selectedNode.capacity)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Latency</span>
              <span className={selectedNode.status === 'OFFLINE' ? 'text-rose-500 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                {selectedNode.status === 'OFFLINE' ? 'N/A' : `${selectedNode.latency}ms`}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Stored Replicas</span>
              <span className="text-indigo-600 dark:text-indigo-300 font-semibold">{selectedNode.replicaCount}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Heartbeat</span>
              <span className="text-slate-700 dark:text-slate-300">{formatRelativeTime(selectedNode.lastHeartbeat)}</span>
            </div>

            <button
              onClick={() => setSelectedNode(null)}
              className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
