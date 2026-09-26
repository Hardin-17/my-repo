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
          color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20',
        };
      case 'OBJECT_DOWNLOADED':
        return {
          icon: Download,
          color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20',
        };
      case 'REPLICA_CREATED':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
        };
      case 'NODE_REGISTERED':
      case 'NODE_HEARTBEAT':
        return {
          icon: Server,
          color: 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
        };
      case 'OBJECT_VERIFIED':
        return {
          icon: ShieldCheck,
          color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
        };
      default:
        return {
          icon: Activity,
          color: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
        };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="p-5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700/80 transition-all shadow-sm hover:shadow-md flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Audit Stream
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
              IMMUTABLE JOURNAL
            </span>
          </div>
          <Activity className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        </div>

        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 font-mono">
              No recent activity recorded
            </div>
          ) : (
            activities.slice(0, 5).map((act, index) => {
              const { icon: Icon, color } = getEventIcon(act.eventType);

              return (
                <motion.div
                  key={act._id || index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-800/60"
                >
                  <div className={`p-1.5 rounded-md border shrink-0 ${color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-xs text-slate-700 dark:text-slate-300 truncate font-mono">
                      {act.message}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(act.timestamp)}
                      </span>
                      {act.nodeId && <span>· Node: {act.nodeId}</span>}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/70 text-right">
        <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 cursor-pointer">
          View full audit log →
        </span>
      </div>
    </motion.div>
  );
};
