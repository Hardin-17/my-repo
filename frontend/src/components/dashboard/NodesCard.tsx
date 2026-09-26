'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Server } from 'lucide-react';

interface NodesCardProps {
  total?: number;
  healthy?: number;
  degraded?: number;
  offline?: number;
}

export const NodesCard: React.FC<NodesCardProps> = ({
  total = 5,
  healthy = 5,
  degraded = 0,
  offline = 0,
}) => {
  const healthyPercent = total > 0 ? (healthy / total) * 100 : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="p-5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700/80 transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Storage Nodes
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
              DISCOVERED
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold font-mono text-slate-900 dark:text-white">{total}</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">active instances</span>
          </div>
        </div>
        <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
          <Server className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/70 space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-500 dark:text-slate-400">Node Breakdown</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            {healthy} Online · {offline} Offline
          </span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${healthyPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="bg-emerald-500 h-full rounded-full"
            title={`${healthy} Healthy Nodes`}
          />
        </div>
      </div>
    </motion.div>
  );
};
