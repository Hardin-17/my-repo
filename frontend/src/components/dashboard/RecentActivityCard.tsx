'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Upload,
  Download,
  Server,
  AlertTriangle,
} from 'lucide-react';
import { ActivityEvent } from '@/types';
import { formatRelativeTime } from '@/lib/utils';

interface RecentActivityCardProps {
  activities?: ActivityEvent[];
}

export const RecentActivityCard: React.FC<RecentActivityCardProps> = ({
  activities = [],
}) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'OBJECT_UPLOADED':
        return {
          icon: Upload,
          color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        };
      case 'OBJECT_DOWNLOADED':
        return {
          icon: Download,
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        };
      case 'REPLICA_CREATED':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        };
      case 'NODE_REGISTERED':
      case 'NODE_HEARTBEAT':
        return {
          icon: Server,
          color: 'text-slate-300 bg-slate-800 border-slate-700',
        };
      case 'OBJECT_VERIFIED':
        return {
          icon: ShieldCheck,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        };
      default:
        return {
          icon: Activity,
          color: 'text-slate-400 bg-slate-800 border-slate-700',
        };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.35 }}
      className="p-6 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/80 transition shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          <h3 className="text-base font-semibold text-white tracking-tight">Recent Activity</h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          REAL-TIME STREAM
        </span>
      </div>

      <div className="divide-y divide-slate-800/70 max-h-[280px] overflow-y-auto pr-1">
        {activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 font-mono">
            No cluster activity events recorded yet.
          </div>
        ) : (
          activities.map((event, index) => {
            const { icon: Icon, color } = getEventIcon(event.eventType);
            return (
              <div
                key={event._id || `act-${index}`}
                className="py-2.5 flex items-start gap-3 first:pt-1 last:pb-0"
              >
                <div
                  className={`p-1.5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${color}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-200 leading-snug">{event.message}</p>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {formatRelativeTime(event.timestamp)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};
