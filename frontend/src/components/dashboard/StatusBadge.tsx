'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
  size = 'md',
}) => {
  const normalized = (status || '').toUpperCase();

  const config = (() => {
    switch (normalized) {
      case 'ONLINE':
      case 'HEALTHY':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
          dot: 'bg-emerald-500 dark:bg-emerald-400',
          ping: 'bg-emerald-400',
          label: status,
        };
      case 'WARNING':
      case 'DEGRADED':
        return {
          bg: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20',
          dot: 'bg-amber-500 dark:bg-amber-400',
          ping: 'bg-amber-400',
          label: status,
        };
      case 'OFFLINE':
      case 'FAILED':
      case 'CORRUPTED':
        return {
          bg: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
          dot: 'bg-rose-500 dark:bg-rose-400',
          ping: 'bg-rose-400',
          label: status,
        };
      case 'REPAIRING':
      case 'REBALANCING':
        return {
          bg: 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20',
          dot: 'bg-cyan-500 dark:bg-cyan-400',
          ping: 'bg-cyan-400',
          label: status,
        };
      default:
        return {
          bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700',
          dot: 'bg-slate-400',
          ping: 'bg-slate-400',
          label: status || 'UNKNOWN',
        };
    }
  })();

  const isSmall = size === 'sm';

  return (
    <motion.span
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'inline-flex items-center font-mono font-medium rounded-full border transition-all select-none',
        isSmall ? 'px-2 py-0.5 text-[10px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5',
        config.bg,
        className
      )}
    >
      <span className="relative flex h-2 w-2">
        <motion.span
          animate={{ scale: [1, 1.8, 1], opacity: [0.75, 0, 0.75] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className={cn('absolute inline-flex h-full w-full rounded-full', config.ping)}
        />
        <span className={cn('relative inline-flex rounded-full h-2 w-2', config.dot)} />
      </span>
      <span className="capitalize">{config.label}</span>
    </motion.span>
  );
};
