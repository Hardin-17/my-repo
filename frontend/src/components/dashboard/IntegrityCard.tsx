'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

interface IntegrityCardProps {
  corruptedObjects?: number;
  totalObjects?: number;
}

export const IntegrityCard: React.FC<IntegrityCardProps> = ({
  corruptedObjects = 0,
  totalObjects = 0,
}) => {
  const isAllIntact = corruptedObjects === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, delay: 0.25 }}
      className="p-5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700/80 transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Data Integrity
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">
              SHA-256
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h3
              className={`text-xl font-bold font-mono ${
                isAllIntact ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {isAllIntact ? '100% Cryptographically Intact' : `${corruptedObjects} Corrupted`}
            </h3>
          </div>
        </div>
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/70 text-xs font-mono">
        <div>
          <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Cryptographic Hash</span>
          <span className="text-slate-800 dark:text-slate-200">SHA-256 Verified</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 text-[11px] block">Silent Bit-Rot</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{corruptedObjects} Detected</span>
        </div>
      </div>
    </motion.div>
  );
};
