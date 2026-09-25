'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Server, Database, Radio, ArrowRight, Zap } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export const ClusterTopologyPlaceholder: React.FC = () => {
  const nodes = [
    { id: 'node-us-east-01', ip: '10.240.0.11', zone: 'us-east-1a', status: 'Healthy' as const, storage: '32.1 GB' },
    { id: 'node-us-east-02', ip: '10.240.0.12', zone: 'us-east-1b', status: 'Healthy' as const, storage: '31.8 GB' },
    { id: 'node-us-west-01', ip: '10.240.1.21', zone: 'us-west-2a', status: 'Healthy' as const, storage: '32.3 GB' },
    { id: 'node-eu-west-01', ip: '10.240.2.31', zone: 'eu-west-1a', status: 'Healthy' as const, storage: '32.2 GB' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="p-6 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 transition shadow-sm space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white tracking-tight">
              Live Cluster Topology Mesh
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
              PLACEHOLDER VISUALIZATION (PHASE 1)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Distributed node mesh, real-time heartbeats, and peer synchronization routes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Coordinator:</span>
          <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            Leader (vault-primary)
          </span>
        </div>
      </div>

      {/* Visual node mesh representation */}
      <div className="relative py-6 px-4 bg-slate-950/60 rounded-xl border border-slate-800/80 overflow-hidden">
        {/* Central Coordinator Indicator */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 shadow-lg shadow-indigo-500/20">
              <Database className="w-6 h-6" />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-slate-950 animate-pulse" />
          </div>
          <span className="text-xs font-mono font-medium text-slate-200 mt-2">
            VAULT Control Plane
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Consensus Coordinator</span>
        </div>

        {/* Node Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {nodes.map((node) => (
            <div
              key={node.id}
              className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-2.5 relative group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                  <span className="text-xs font-mono font-semibold text-slate-200">{node.id}</span>
                </div>
                <StatusBadge status={node.status} size="sm" />
              </div>

              <div className="space-y-1 text-[11px] font-mono text-slate-400">
                <div className="flex justify-between">
                  <span>Zone:</span>
                  <span className="text-slate-300">{node.zone}</span>
                </div>
                <div className="flex justify-between">
                  <span>IPv4:</span>
                  <span className="text-slate-300">{node.ip}</span>
                </div>
                <div className="flex justify-between">
                  <span>Chunk Vol:</span>
                  <span className="text-indigo-300">{node.storage}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Architecture note callout */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-mono text-[11px]">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            Heartbeat Interval: 1000ms · Mesh Protocol: TCP Gossip (Simulated Phase 1)
          </span>
          <span className="text-[11px] text-slate-400 font-mono hidden md:inline">
            Interactive React Flow canvas to be connected in Phase 2
          </span>
        </div>
      </div>
    </motion.div>
  );
};
