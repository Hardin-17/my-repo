'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';

interface ReplicationCardProps {
  totalReplicas?: number;
  degradedObjects?: number;
  totalObjects?: number;
}

export const ReplicationCard: React.FC<ReplicationCardProps> = ({
  totalReplicas = 0,
  degradedObjects = 0,
  totalObjects = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="p-5 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 transition-all shadow-sm flex flex-col justify-between"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Replication
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              POLICY ACTIVE
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold font-mono text-white">{totalReplicas}</h3>
            <span className="text-xs text-slate-400">active replicas across nodes</span>
          </div>
        </div>
        <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
          <Layers className="w-5 h-5" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800/70 text-xs font-mono">
        <div>
          <span className="text-slate-400 text-[11px] block">Degraded Objects</span>
          <span
            className={`font-semibold ${
              degradedObjects > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {degradedObjects} objects
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-[11px] block">Rebalancing Engine</span>
          <span className="text-slate-300">Phase 3 Ready</span>
        </div>
      </div>
    </motion.div>
  );
};
