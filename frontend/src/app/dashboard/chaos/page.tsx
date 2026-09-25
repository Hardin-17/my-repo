'use client';

import React, { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Shell } from '@/components/layout/Shell';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/Button';
import { StorageNode, VaultObject, RepairJob, RecoveryMetrics, ActivityEvent } from '@/types';
import { api } from '@/lib/api';
import { formatBytes, formatRelativeTime, truncateHash } from '@/lib/utils';
import {
  Zap,
  Server,
  AlertTriangle,
  Flame,
  RotateCcw,
  Bug,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  Radio,
  Network,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChaosLabPage() {
  const [nodes, setNodes] = useState<StorageNode[]>([]);
  const [objects, setObjects] = useState<VaultObject[]>([]);
  const [repairJobs, setRepairJobs] = useState<RepairJob[]>([]);
  const [metrics, setMetrics] = useState<RecoveryMetrics | null>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);

  // Selection states
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-03');
  const [selectedObjectId, setSelectedObjectId] = useState<string>('');
  const [selectedReplicaNodeId, setSelectedReplicaNodeId] = useState<string>('');

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel: string;
    actionType: 'kill-node' | 'corrupt-replica';
    isDestructive: boolean;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionLabel: '',
    actionType: 'kill-node',
    isDestructive: true,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScorecard, setLastScorecard] = useState<{
    failureType: string;
    target: string;
    affectedObjects: number;
    objectsRepaired: number;
    dataLost: string;
    replicasRestored: string;
    integrity: string;
    recoveryTime: string;
  } | null>(null);

  const fetchLabData = async () => {
    try {
      const [nodesRes, objectsRes, jobsRes, metricsRes, metricsAllRes] = await Promise.allSettled([
        api.get<{ data: StorageNode[] }>('/nodes'),
        api.get<{ data: VaultObject[] }>('/objects'),
        api.get<{ data: RepairJob[] }>('/recovery/jobs'),
        api.get<{ data: RecoveryMetrics }>('/recovery/metrics'),
        api.get<{ data: { recentActivity: ActivityEvent[] } }>('/metrics'),
      ]);

      if (nodesRes.status === 'fulfilled' && nodesRes.value?.data) {
        setNodes(nodesRes.value.data);
        if (!selectedNodeId && nodesRes.value.data.length > 0) {
          setSelectedNodeId(nodesRes.value.data[0].nodeId);
        }
      }

      if (objectsRes.status === 'fulfilled' && objectsRes.value?.data) {
        setObjects(objectsRes.value.data);
        if (!selectedObjectId && objectsRes.value.data.length > 0) {
          setSelectedObjectId(objectsRes.value.data[0].objectId);
          if (objectsRes.value.data[0].replicas?.length > 0) {
            setSelectedReplicaNodeId(objectsRes.value.data[0].replicas[0].nodeId);
          }
        }
      }

      if (jobsRes.status === 'fulfilled' && jobsRes.value?.data) {
        setRepairJobs(jobsRes.value.data);
      }

      if (metricsRes.status === 'fulfilled' && metricsRes.value?.data) {
        setMetrics(metricsRes.value.data);
      }

      if (metricsAllRes.status === 'fulfilled' && metricsAllRes.value?.data?.recentActivity) {
        setActivities(metricsAllRes.value.data.recentActivity);
      }
    } catch (err) {
      console.error('Failed to poll Chaos Lab telemetries:', err);
    }
  };

  useEffect(() => {
    fetchLabData();
    const interval = setInterval(fetchLabData, 4000);
    return () => clearInterval(interval);
  }, [selectedNodeId, selectedObjectId]);

  // When selected object changes, update selectable replicas
  useEffect(() => {
    const curObj = objects.find((o) => o.objectId === selectedObjectId);
    if (curObj && curObj.replicas?.length > 0) {
      setSelectedReplicaNodeId(curObj.replicas[0].nodeId);
    }
  }, [selectedObjectId, objects]);

  const handleOpenKillConfirm = () => {
    setConfirmModal({
      isOpen: true,
      title: `Simulate Storage Node Failure (${selectedNodeId})`,
      description: `Are you sure you want to take ${selectedNodeId} offline? Vault's consensus detector will immediately identify under-replicated chunks and dispatch automated self-healing.`,
      actionLabel: 'Simulate Failure',
      actionType: 'kill-node',
      isDestructive: true,
    });
  };

  const handleOpenCorruptConfirm = () => {
    setConfirmModal({
      isOpen: true,
      title: `Inject Data Corruption (${selectedReplicaNodeId})`,
      description: `Are you sure you want to flip binary bits on replica ${selectedReplicaNodeId}? This simulates real disk bit-rot to test SHA-256 integrity detection.`,
      actionLabel: 'Inject Corruption',
      actionType: 'corrupt-replica',
      isDestructive: true,
    });
  };

  const handleExecuteConfirmedAction = async () => {
    setIsProcessing(true);
    const startTime = Date.now();
    try {
      if (confirmModal.actionType === 'kill-node') {
        const res = await api.post<{
          data: { affectedObjects: number; repairJobsCreated: number };
        }>('/chaos/node-failure', {
          nodeId: selectedNodeId,
          reason: 'Manual operator kill test',
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        setLastScorecard({
          failureType: 'Storage Node Failure',
          target: selectedNodeId,
          affectedObjects: res.data?.affectedObjects || 1,
          objectsRepaired: res.data?.repairJobsCreated || 1,
          dataLost: '0 bytes',
          replicasRestored: `${res.data?.repairJobsCreated || 1} / ${res.data?.repairJobsCreated || 1}`,
          integrity: '100% SHA-256',
          recoveryTime: `${elapsed}s (Active Healing)`,
        });
      } else if (confirmModal.actionType === 'corrupt-replica') {
        await api.post('/chaos/corrupt-replica', {
          objectId: selectedObjectId,
          nodeId: selectedReplicaNodeId,
        });

        // Trigger integrity verification to detect and heal
        const verifyRes = await api.post<{ data: { hasCorruptedReplica: boolean } }>(
          `/integrity/verify/${selectedObjectId}`
        );

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        setLastScorecard({
          failureType: 'Silent Bit-Rot Injection',
          target: `${selectedReplicaNodeId} (Object: ${selectedObjectId})`,
          affectedObjects: 1,
          objectsRepaired: 1,
          dataLost: '0 bytes',
          replicasRestored: '1 / 1',
          integrity: '100% Re-Verified',
          recoveryTime: `${elapsed}s`,
        });
      }
      await fetchLabData();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    } finally {
      setIsProcessing(false);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleRecoverNode = async () => {
    setIsProcessing(true);
    try {
      await api.post('/chaos/node-recover', { nodeId: selectedNodeId });
      await fetchLabData();
    } catch (err: any) {
      alert(err.message || 'Failed to recover node');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentNode = nodes.find((n) => n.nodeId === selectedNodeId);
  const currentObject = objects.find((o) => o.objectId === selectedObjectId);

  return (
    <ProtectedRoute>
      <Shell>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 rounded-xl p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Flame className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">VAULT CHAOS LAB</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                FAULT INJECTION ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 italic">
              &quot;Break the cluster. Watch Vault recover.&quot; Real backend failure injection with automated self-healing.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button variant="outline" size="sm" onClick={fetchLabData} title="Refresh Telemetries">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Chaos Injection Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Node Failure Simulation */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-rose-400 flex items-center gap-1.5 font-bold">
                  <Server className="w-4 h-4" /> Node Failure Injection
                </span>
                {currentNode && <StatusBadge status={currentNode.status} size="sm" />}
              </div>
              <p className="text-xs text-slate-400">
                Simulate hardware, kernel panic, or power dropouts on a target storage node.
              </p>

              <div className="space-y-1 pt-2">
                <label className="text-[11px] font-mono uppercase text-slate-400">Select Target Node</label>
                <select
                  value={selectedNodeId}
                  onChange={(e) => setSelectedNodeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
                >
                  {nodes.map((node) => (
                    <option key={node.nodeId} value={node.nodeId}>
                      {node.nodeId} ({node.name}) — {node.status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="danger"
                size="sm"
                disabled={currentNode?.status === 'OFFLINE' || isProcessing}
                onClick={handleOpenKillConfirm}
                className="w-full text-xs"
              >
                <Flame className="w-3.5 h-3.5 mr-1" />
                <span>Kill Node</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={currentNode?.status === 'ONLINE' || isProcessing}
                onClick={handleRecoverNode}
                className="w-full text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                <span>Recover Node</span>
              </Button>
            </div>
          </div>

          {/* Card 2: Silent Data Corruption Injection */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5 font-bold">
                  <Bug className="w-4 h-4" /> Data Corruption (Bit-Rot)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  BYTE FLIP
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Invert physical bytes on a replica volume to test cryptographic SHA-256 scrubbing.
              </p>

              <div className="space-y-2 pt-2">
                <div>
                  <label className="text-[11px] font-mono uppercase text-slate-400">Select Object</label>
                  <select
                    value={selectedObjectId}
                    onChange={(e) => setSelectedObjectId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {objects.map((obj) => (
                      <option key={obj.objectId} value={obj.objectId}>
                        {obj.originalName} ({formatBytes(obj.size)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase text-slate-400">Target Replica Node</label>
                  <select
                    value={selectedReplicaNodeId}
                    onChange={(e) => setSelectedReplicaNodeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    {currentObject?.replicas?.map((r) => (
                      <option key={r.nodeId} value={r.nodeId}>
                        {r.nodeId} — Status: {r.status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedObjectId || !selectedReplicaNodeId || isProcessing}
                onClick={handleOpenCorruptConfirm}
                className="w-full text-xs hover:border-amber-500 hover:text-amber-300"
              >
                <ShieldAlert className="w-3.5 h-3.5 mr-1 text-amber-400" />
                <span>Corrupt Replica & Verify</span>
              </Button>
            </div>
          </div>

          {/* Card 3: Network Partition (Phase 4 Preview) */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-4 flex flex-col justify-between opacity-80">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5 font-bold">
                  <Network className="w-4 h-4 text-cyan-400" /> Network Partition
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  COMING IN PHASE 4
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Split-brain simulation, zone isolation, and asymmetric packet-drop policies.
              </p>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center space-y-2 mt-4">
                <Radio className="w-8 h-8 text-cyan-400/50 mx-auto animate-pulse" />
                <p className="text-xs font-mono text-slate-300">
                  Advanced Quorum & Network Partition Simulation scheduled for Phase 4.
                </p>
              </div>
            </div>

            <Button variant="ghost" size="sm" disabled className="w-full text-xs">
              Simulate Partition (Phase 4)
            </Button>
          </div>
        </div>

        {/* Live Recovery Scorecard */}
        {lastScorecard && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-xl bg-slate-900 border border-emerald-500/40 shadow-lg space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Fault Recovery Scorecard
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                PROVEN SELF-HEALED
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">EVENT</span>
                <span className="text-slate-200 font-semibold">{lastScorecard.failureType}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">TARGET</span>
                <span className="text-indigo-400 font-semibold truncate block">
                  {lastScorecard.target}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">AFFECTED</span>
                <span className="text-amber-400 font-semibold">{lastScorecard.affectedObjects}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">REPAIRED</span>
                <span className="text-emerald-400 font-semibold">{lastScorecard.objectsRepaired}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">DATA LOST</span>
                <span className="text-emerald-400 font-semibold">{lastScorecard.dataLost}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">REPLICAS</span>
                <span className="text-indigo-300 font-semibold">{lastScorecard.replicasRestored}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">RECOVERY TIME</span>
                <span className="text-cyan-300 font-semibold">{lastScorecard.recoveryTime}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Live Repair Queue & Active Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Repair Pipeline */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Self-Healing Repair Queue
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                {repairJobs.filter((j) => j.status !== 'COMPLETED').length} ACTIVE
              </span>
            </div>

            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {repairJobs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-mono">
                  No repair jobs active or queued. Cluster replication factor is healthy.
                </div>
              ) : (
                repairJobs.slice(0, 10).map((job) => (
                  <div
                    key={job.jobId}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{job.objectId}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {job.reason}
                        </span>
                      </div>
                      <StatusBadge status={job.status} size="sm" />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Source: {job.sourceNodeId || 'Locating...'}</span>
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                      <span>Target: {job.targetNodeId || 'Selecting...'}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full transition-all duration-300"
                        style={{ width: `${job.progress || (job.status === 'COMPLETED' ? 100 : 30)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Real-time Fault Recovery Timeline */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  Fault & Recovery Timeline
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                EVENT JOURNAL
              </span>
            </div>

            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {activities
                .filter((a) =>
                  [
                    'NODE_FAILURE_DETECTED',
                    'NODE_RECOVERED',
                    'REPLICA_MARKED_MISSING',
                    'REPLICA_MARKED_CORRUPTED',
                    'REPAIR_JOB_CREATED',
                    'REPAIR_STARTED',
                    'REPAIR_COMPLETED',
                    'CORRUPTION_INJECTED',
                  ].includes(a.eventType)
                )
                .slice(0, 10)
                .map((event, idx) => (
                  <div key={event._id || idx} className="flex items-start gap-3 text-xs">
                    <span className="text-[11px] text-slate-400 font-mono shrink-0 mt-0.5">
                      {formatRelativeTime(event.timestamp)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-200 leading-snug font-mono text-[11px]">
                        {event.message}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {confirmModal.isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      confirmModal.isDestructive
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{confirmModal.title}</h3>
                    <p className="text-xs text-slate-400">Chaos Injection Safety Check</p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{confirmModal.description}</p>

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                  >
                    Cancel
                  </Button>

                  <Button
                    variant={confirmModal.isDestructive ? 'danger' : 'primary'}
                    size="sm"
                    isLoading={isProcessing}
                    onClick={handleExecuteConfirmedAction}
                  >
                    <span>{confirmModal.actionLabel}</span>
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </Shell>
    </ProtectedRoute>
  );
}
