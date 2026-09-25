'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { HardDrive } from 'lucide-react';
import { formatBytes } from '@/lib/utils';

interface StorageCardProps {
  usedBytes?: number;
  totalBytes?: number;
  utilizationPercentage?: number | string;
}

export const StorageCard: React.FC<StorageCardProps> = ({
  usedBytes = 0,
  totalBytes = 500 * 1024 * 1024 * 1024,
  utilizationPercentage = '0',
}) => {
  const percentNum = typeof utilizationPercentage === 'string' ? parseFloat(utilizationPercentage) : utilizationPercentage;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className="p-5 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 transition-all shadow-sm flex flex-col justify-between"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Storage Capacity
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              CLUSTER POOL
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold font-mono text-white">{formatBytes(usedBytes)}</h3>
            <span className="text-xs text-slate-400">/ {formatBytes(totalBytes)}</span>
          </div>
        </div>
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
          <HardDrive className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800/70 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">Total Utilization</span>
          <span className="text-slate-200">{utilizationPercentage}%</span>
        </div>
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-indigo-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(1, percentNum))}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
};
