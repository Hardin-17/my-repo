'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  X,
  Download,
  ShieldCheck,
  Server,
  Layers,
  Copy,
  Check,
  AlertTriangle,
  RotateCw,
  Wrench,
  Loader2,
} from 'lucide-react';
import { StatusBadge } from '../dashboard/StatusBadge';
import { Button } from '../ui/Button';
import { VaultObject, Replica } from '@/types';
import { formatBytes, formatRelativeTime, truncateHash } from '@/lib/utils';
import { api } from '@/lib/api';

interface ObjectDetailsModalProps {
  object: VaultObject | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (object: VaultObject) => void;
}

export const ObjectDetailsModal: React.FC<ObjectDetailsModalProps> = ({
  object,
  isOpen,
  onClose,
  onDownload,
}) => {
  const [copiedChecksum, setCopiedChecksum] = useState(false);
  const [replicas, setReplicas] = useState<Replica[]>([]);
  const [currentObject, setCurrentObject] = useState<VaultObject | null>(object);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: 'success' | 'warning' | 'error';
  } | null>(null);

  const fetchLatestDetails = useCallback(async () => {
    if (!object) return;
    try {
      const res = await api.get<{ data: { replicas: Replica[] } }>(
        `/objects/${object.objectId}`
      );
      if (res.data?.replicas) {
        setReplicas(res.data.replicas);
      }
    } catch (err) {
      console.error('Failed to fetch updated replicas:', err);
    }
  }, [object]);

  useEffect(() => {
    if (object && isOpen) {
      setCurrentObject(object);
      setReplicas(object.replicas || []);
      setFeedbackMessage(null);
      fetchLatestDetails();
    }
  }, [object, isOpen, fetchLatestDetails]);

  const handleCopyHash = () => {
    if (currentObject?.checksum) {
      navigator.clipboard.writeText(currentObject.checksum);
      setCopiedChecksum(true);
      setTimeout(() => setCopiedChecksum(false), 2000);
    }
  };

  const handleVerifyIntegrity = async () => {
    if (!currentObject) return;
    setIsVerifying(true);
    setFeedbackMessage(null);
    try {
      const res = await api.post<{
        data: {
          hasCorruptedReplica: boolean;
          repairJobCreated: boolean;
          replicas: Replica[];
        };
      }>(`/integrity/verify/${currentObject.objectId}`);

      if (res.data?.hasCorruptedReplica) {
        setFeedbackMessage({
          text: 'Integrity Scrub: Corrupted replica detected! Automatic repair job scheduled.',
          type: 'warning',
        });
      } else {
        setFeedbackMessage({
          text: 'Integrity Scrub: 100% SHA-256 match across all active replicas.',
          type: 'success',
        });
      }
      await fetchLatestDetails();
    } catch (err: any) {
      setFeedbackMessage({
        text: err.message || 'Verification failed',
        type: 'error',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualRepair = async () => {
    if (!currentObject) return;
    setIsRepairing(true);
    setFeedbackMessage(null);
    try {
      const res = await api.post(`/repair/object/${currentObject.objectId}`);
      setFeedbackMessage({
        text: 'Self-healing repair job dispatched to background worker.',
        type: 'success',
      });
      await fetchLatestDetails();
    } catch (err: any) {
      setFeedbackMessage({
        text: err.message || 'Repair dispatch failed',
        type: 'error',
      });
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && currentObject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/75 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="object-details-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400" aria-hidden="true">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 id="object-details-title" className="text-base font-bold text-slate-900 dark:text-white truncate max-w-md">
                      {currentObject.originalName}
                    </h3>
                    <StatusBadge status={currentObject.status} size="sm" />
                  </div>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">Key: {currentObject.storageKey}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close object details modal"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase">Object Size</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">{formatBytes(currentObject.size)}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase">Version</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">v{currentObject.version}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase">Replication Factor</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                    {currentObject.replicationFactor}x Target
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase">Created</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">
                    {formatRelativeTime(currentObject.createdAt)}
                  </span>
                </div>
              </div>

              {/* SHA-256 Checksum Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    Expected SHA-256 Checksum
                  </span>
                  <button
                    onClick={handleCopyHash}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-mono"
                  >
                    {copiedChecksum ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Hash</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-xs text-emerald-700 dark:text-emerald-300 break-all select-all">
                  {currentObject.checksum}
                </div>
              </div>

              {/* Replicas Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    Distributed Replicas ({replicas.filter((r) => r.status === 'HEALTHY').length} /{' '}
                    {currentObject.replicationFactor})
                  </h4>
                  <button
                    onClick={fetchLatestDetails}
                    className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Refresh</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {replicas.map((rep, idx) => (
                    <div
                      key={`${rep.nodeId}-${idx}`}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                          <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">{rep.nodeName || rep.nodeId}</span>
                            <StatusBadge status={rep.status} size="sm" />
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Node ID: {rep.nodeId} · Zone: {rep.zone || 'us-east-1'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 text-[11px]">
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 block text-[9px]">CHECKSUM</span>
                          <span
                            className={
                              rep.status === 'CORRUPTED'
                                ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                : 'text-slate-700 dark:text-slate-300'
                            }
                          >
                            {truncateHash(rep.checksum, 6, 6)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 block text-[9px]">VERSION</span>
                          <span className="text-slate-700 dark:text-slate-300">v{rep.version}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 block text-[9px]">LATENCY</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{rep.nodeLatency || 18}ms</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback banner */}
              {feedbackMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                    feedbackMessage.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                      : feedbackMessage.type === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300'
                      : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{feedbackMessage.text}</span>
                </motion.div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={isVerifying}
                  onClick={handleVerifyIntegrity}
                >
                  <ShieldCheck className="w-4 h-4 mr-1 text-emerald-500 dark:text-emerald-400" />
                  <span>Verify Integrity</span>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={isRepairing}
                  onClick={handleManualRepair}
                >
                  <Wrench className="w-4 h-4 mr-1 text-cyan-600 dark:text-cyan-400" />
                  <span>Repair Replicas</span>
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={onClose}>
                  Close
                </Button>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button variant="primary" size="sm" onClick={() => onDownload(currentObject)}>
                    <Download className="w-4 h-4 mr-1.5" />
                    <span>Download Stream</span>
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
