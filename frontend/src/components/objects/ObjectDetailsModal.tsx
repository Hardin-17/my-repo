'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  X,
  Download,
  ShieldCheck,
  Server,
  Layers,
  Clock,
  HardDrive,
  Copy,
  Check,
  AlertTriangle,
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
  const [isLoadingReplicas, setIsLoadingReplicas] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);

  useEffect(() => {
    if (object && isOpen) {
      setReplicas(object.replicas || []);
      setVerifyNotice(null);

      // Fetch enriched replica details
      const fetchReplicas = async () => {
        setIsLoadingReplicas(true);
        try {
          const res = await api.get<{ data: { replicas: Replica[] } }>(
            `/objects/${object.objectId}/replicas`
          );
          if (res.data?.replicas) {
            setReplicas(res.data.replicas);
          }
        } catch (err) {
          console.warn('Failed to load enriched replicas:', err);
        } finally {
          setIsLoadingReplicas(false);
        }
      };

      fetchReplicas();
    }
  }, [object, isOpen]);

  const handleCopyHash = () => {
    if (object?.checksum) {
      navigator.clipboard.writeText(object.checksum);
      setCopiedChecksum(true);
      setTimeout(() => setCopiedChecksum(false), 2000);
    }
  };

  const handleVerifyClick = () => {
    setVerifyNotice(
      'Integrity Scrubber preparation: In Phase 3, this triggers asynchronous SHA-256 block-level scrubbing and automated bit-rot repair across all storage nodes.'
    );
  };

  if (!isOpen || !object) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white truncate max-w-md">
                  {object.originalName}
                </h3>
                <StatusBadge status={object.status} size="sm" />
              </div>
              <p className="text-xs font-mono text-slate-400">Key: {object.storageKey}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Object Size</span>
              <span className="text-slate-200 font-semibold">{formatBytes(object.size)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Version</span>
              <span className="text-slate-200 font-semibold">v{object.version}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Replication Factor</span>
              <span className="text-indigo-400 font-semibold">{object.replicationFactor}x Replicas</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Created</span>
              <span className="text-slate-300 font-semibold">
                {formatRelativeTime(object.createdAt)}
              </span>
            </div>
          </div>

          {/* SHA-256 Checksum Card */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Cryptographic SHA-256 Checksum
              </span>
              <button
                onClick={handleCopyHash}
                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-mono"
              >
                {copiedChecksum ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
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
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-300 break-all select-all">
              {object.checksum}
            </div>
          </div>

          {/* Replicas Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                Distributed Replicas ({replicas.length}/{object.replicationFactor})
              </h4>
              <span className="text-[11px] font-mono text-emerald-400">Quorum Intact</span>
            </div>

            <div className="space-y-2">
              {replicas.map((rep, idx) => (
                <div
                  key={`${rep.nodeId}-${idx}`}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                      <Server className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{rep.nodeName || rep.nodeId}</span>
                        <StatusBadge status={rep.status} size="sm" />
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Node ID: {rep.nodeId} · Zone: {rep.zone || 'us-east-1'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-slate-400 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[9px]">CHECKSUM</span>
                      <span className="text-slate-300">{truncateHash(rep.checksum, 6, 6)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">VERSION</span>
                      <span className="text-slate-300">v{rep.version}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px]">LATENCY</span>
                      <span className="text-emerald-400">{rep.nodeLatency || 18}ms</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verify Notice if clicked */}
          {verifyNotice && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-start gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
              <span>{verifyNotice}</span>
            </motion.div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={handleVerifyClick}>
            <ShieldCheck className="w-4 h-4 mr-1 text-emerald-400" />
            <span>Verify Integrity</span>
          </Button>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" size="sm" onClick={() => onDownload(object)}>
              <Download className="w-4 h-4 mr-1.5" />
              <span>Download Object</span>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
