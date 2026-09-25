'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface ClusterHealthCardProps {
  clusterHealth?: string;
  sla?: string;
  healthyNodes?: number;
  totalNodes?: number;
}

export const ClusterHealthCard: React.FC<ClusterHealthCardProps> = ({
  clusterHealth = 'Healthy',
  sla = '100.00%',
  healthyNodes = 5,
  totalNodes = 5,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      className="p-5 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 transition-all shadow-sm flex flex-col justify-between"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Cluster State
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              LIVE TELEMETRY
            </span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            {clusterHealth === 'Healthy'
              ? 'Cluster Operational'
              : clusterHealth === 'Warning'
              ? 'Cluster Degraded'
              : 'Maintenance Mode'}
          </h3>
        </div>
        <StatusBadge status={clusterHealth} />
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-800/70">
        <div>
          <span className="text-[11px] text-slate-400 block font-mono">Calculated SLA</span>
          <span className="text-base font-mono font-semibold text-emerald-400">{sla}</span>
        </div>
        <div>
          <span className="text-[11px] text-slate-400 block font-mono">Quorum Consensus</span>
          <span className="text-base font-mono font-semibold text-slate-200">
            {healthyNodes} / {totalNodes} Online
          </span>
        </div>
      </div>
    </motion.div>
  );
};
