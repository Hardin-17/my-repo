'use client';

import React from 'react';
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
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          dot: 'bg-emerald-400',
          ping: 'bg-emerald-400',
          label: status,
        };
      case 'WARNING':
      case 'DEGRADED':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          dot: 'bg-amber-400',
          ping: 'bg-amber-400',
          label: status,
        };
      case 'OFFLINE':
      case 'FAILED':
      case 'CORRUPTED':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          dot: 'bg-rose-400',
          ping: 'bg-rose-400',
          label: status,
        };
      case 'REPAIRING':
        return {
          bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          dot: 'bg-cyan-400',
          ping: 'bg-cyan-400',
          label: status,
        };
      default:
        return {
          bg: 'bg-slate-800 text-slate-300 border-slate-700',
          dot: 'bg-slate-400',
          ping: '',
          label: status || 'UNKNOWN',
        };
    }
  })();

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full border font-mono tracking-tight select-none',
        config.bg,
        sizeClasses,
        className
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {config.ping && (
          <span
            className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              config.ping
            )}
          />
        )}
        <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', config.dot)} />
      </span>
      <span>{config.label}</span>
    </span>
  );
};
