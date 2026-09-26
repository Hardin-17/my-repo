'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Server,
  ShieldCheck,
  Zap,
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Sparkles,
  Compass,
  Cpu,
  Terminal,
  Activity,
  ChevronRight,
  Home,
  Check,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/Button';

// Interactive tour steps
const ONBOARDING_STEPS = [
  {
    id: 'architecture',
    stepNumber: 1,
    title: 'Distributed Storage Architecture',
    subtitle: 'Zero-Downtime Autonomous Object Storage',
    badge: 'Core Infrastructure',
    icon: Database,
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'replication',
    stepNumber: 2,
    title: 'Tunable Replication & Quorum Math',
    subtitle: 'Strict Consistency & Durability Guarantees',
    badge: 'Fault Tolerance',
    icon: Layers,
    color: 'from-indigo-500 to-purple-600',
  },
  {
    id: 'self-healing',
    stepNumber: 3,
    title: 'Self-Healing & Bit-Rot Scrubbing',
    subtitle: 'Autonomous SHA-256 Checksum Verification',
    badge: 'Data Integrity',
    icon: ShieldCheck,
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'chaos',
    stepNumber: 4,
    title: 'Chaos Engineering & Partitioning',
    subtitle: 'Simulated Network Partitions & Split-Brain Fencing',
    badge: 'Chaos Lab',
    icon: Zap,
    color: 'from-amber-500 to-orange-600',
  },
  {
    id: 'launch',
    stepNumber: 5,
    title: 'Control Plane Ready',
    subtitle: 'Explore Dashboard, Nodes, Objects & VaultOps AI',
    badge: 'Mission Control',
    icon: Sparkles,
    color: 'from-indigo-600 to-pink-600',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Interactive playground states
  const [replicationFactor, setReplicationFactor] = useState(3);
  const [durabilityPolicy, setDurabilityPolicy] = useState<'ONE' | 'QUORUM' | 'ALL'>('QUORUM');
  const [isSimulatingCorruption, setIsSimulatingCorruption] = useState(false);
  const [simulatedNodeState, setSimulatedNodeState] = useState<'HEALTHY' | 'CORRUPTED' | 'REPAIRING'>('HEALTHY');
  const [activePartitionGroup, setActivePartitionGroup] = useState<'NONE' | 'SPLIT'>('NONE');

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const progressPercent = ((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  const completeOnboarding = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vault_onboarding_completed', 'true');
    }
    router.push('/dashboard');
  }, [router]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentStepIndex < ONBOARDING_STEPS.length - 1) {
        setCurrentStepIndex((prev) => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentStepIndex > 0) {
        setCurrentStepIndex((prev) => prev - 1);
      } else if (e.key === 'Escape') {
        completeOnboarding();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStepIndex, completeOnboarding]);

  const handleNext = () => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  // Quorum calculation helper
  const requiredAcks =
    durabilityPolicy === 'ONE'
      ? 1
      : durabilityPolicy === 'ALL'
      ? replicationFactor
      : Math.floor(replicationFactor / 2) + 1;

  const maxTolerableFailures =
    durabilityPolicy === 'ALL'
      ? 0
      : durabilityPolicy === 'ONE'
      ? replicationFactor - 1
      : Math.floor((replicationFactor - 1) / 2);

  // Trigger interactive self-healing simulation in Step 3
  const triggerSimulatedCorruption = () => {
    setIsSimulatingCorruption(true);
    setSimulatedNodeState('CORRUPTED');

    // Simulate automatic scrubber detection after 1.2s
    setTimeout(() => {
      setSimulatedNodeState('REPAIRING');
      // Simulate repair completion after another 1.8s
      setTimeout(() => {
        setSimulatedNodeState('HEALTHY');
        setIsSimulatingCorruption(false);
      }, 1800);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-grid-pattern relative flex flex-col justify-between p-4 sm:p-8 overflow-x-hidden transition-colors duration-200">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-500/10 dark:bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-20 flex items-center justify-between max-w-5xl mx-auto w-full pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
            <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              VAULT
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
                Interactive Tour
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Distributed Object Storage & Self-Healing Control Plane
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={completeOnboarding}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <span>Skip to Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full py-6 sm:py-10">
        {/* Step progress pills */}
        <div className="w-full max-w-md mb-8">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
              STEP {currentStep.stepNumber} OF {ONBOARDING_STEPS.length}
            </span>
            <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">
              {Math.round(progressPercent)}%
            </span>
          </div>
          {/* Progress track */}
          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>

          {/* Quick step jump indicators */}
          <div className="flex justify-between items-center mt-3 px-1">
            {ONBOARDING_STEPS.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={`group flex items-center gap-1.5 focus:outline-none transition-colors ${
                  idx === currentStepIndex
                    ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                    : idx < currentStepIndex
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'
                }`}
                title={step.title}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono border transition-all ${
                    idx === currentStepIndex
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 scale-110'
                      : idx < currentStepIndex
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800'
                  }`}
                >
                  {idx < currentStepIndex ? <Check className="w-3 h-3" /> : idx + 1}
                </span>
                <span className="text-[11px] hidden md:inline truncate max-w-[80px]">
                  {step.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Animated Card Body */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl dark:shadow-2xl backdrop-blur-md relative overflow-hidden"
          >
            {/* Card badge & icon banner */}
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-indigo-50 dark:bg-indigo-600/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 mb-2">
                  <currentStep.icon className="w-3.5 h-3.5" />
                  {currentStep.badge}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {currentStep.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {currentStep.subtitle}
                </p>
              </div>

              <div
                className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${currentStep.color} p-0.5 shadow-lg hidden sm:block shrink-0`}
              >
                <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[14px] flex items-center justify-center">
                  <currentStep.icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
            </div>

            {/* STEP 1: ARCHITECTURE VISUALIZATION */}
            {currentStep.id === 'architecture' && (
              <div className="space-y-6">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  VAULT is an enterprise-grade distributed object store designed to survive sudden node failures, partial network partitions, and silent bit-rot corruption without human intervention.
                </p>

                {/* Interactive Node Topology Preview */}
                <div className="p-4 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Server className="w-4 h-4 text-indigo-500" />
                      5-Node Distributed Storage Mesh
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Mesh Healthy
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {['node-01', 'node-02', 'node-03', 'node-04', 'node-05'].map((nodeId, idx) => (
                      <motion.div
                        key={nodeId}
                        whileHover={{ y: -4, scale: 1.02 }}
                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-1.5"
                      >
                        <div className="w-7 h-7 mx-auto rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <Server className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 block">
                          {nodeId}
                        </span>
                        <div className="flex items-center justify-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] text-slate-500 font-mono">100 GB</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono">
                    <span>⚡ Heartbeat: Continuous 5s Interval</span>
                    <span>🛡️ Redundancy: Multi-Zone Spread</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: REPLICATION & QUORUM */}
            {currentStep.id === 'replication' && (
              <div className="space-y-6">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Tailor durability and availability to your workload. Adjust the replication factor and durability policy below to see the mathematical quorum calculation change in real time.
                </p>

                <div className="p-4 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-5">
                  {/* Slider Control */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">
                        Replication Factor (RF)
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-300 font-bold">
                        {replicationFactor} Replicas
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={replicationFactor}
                      onChange={(e) => setReplicationFactor(parseInt(e.target.value, 10))}
                      className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Policy Pills */}
                  <div className="space-y-2">
                    <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 block">
                      Durability Policy
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['ONE', 'QUORUM', 'ALL'] as const).map((pol) => (
                        <button
                          key={pol}
                          onClick={() => setDurabilityPolicy(pol)}
                          className={`p-2.5 rounded-xl border text-xs font-mono font-semibold transition-all ${
                            durabilityPolicy === pol
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 scale-[1.02]'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600'
                          }`}
                        >
                          {pol}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Math Calculation Matrix */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Required Acks</span>
                      <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                        {requiredAcks} of {replicationFactor}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Formula</span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {durabilityPolicy === 'QUORUM'
                          ? '⌊RF/2⌋ + 1'
                          : durabilityPolicy === 'ALL'
                          ? 'RF (All Nodes)'
                          : '1 (Fastest)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Fault Tolerance</span>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        Survives {maxTolerableFailures} {maxTolerableFailures === 1 ? 'node' : 'nodes'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: SELF-HEALING & BIT-ROT */}
            {currentStep.id === 'self-healing' && (
              <div className="space-y-6">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Every object stored in VAULT is indexed with a cryptographic SHA-256 hash. Background scrubbers continuously audit storage nodes. If silent bit-rot flips even a single byte, it is instantly healed from healthy quorums.
                </p>

                <div className="p-4 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                      Simulate Silent Bit-Rot Scrubber
                    </span>
                    <Button
                      size="sm"
                      onClick={triggerSimulatedCorruption}
                      disabled={isSimulatingCorruption}
                      className="text-xs"
                    >
                      {isSimulatingCorruption ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          <span>Healing in Progress...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 mr-1.5" />
                          <span>Inject Bit-Rot & Test Healer</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Interactive Status Display */}
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                          simulatedNodeState === 'HEALTHY'
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                            : simulatedNodeState === 'CORRUPTED'
                            ? 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'
                        }`}
                      >
                        {simulatedNodeState === 'HEALTHY' && <CheckCircle2 className="w-5 h-5" />}
                        {simulatedNodeState === 'CORRUPTED' && <AlertTriangle className="w-5 h-5" />}
                        {simulatedNodeState === 'REPAIRING' && <RotateCw className="w-5 h-5 animate-spin" />}
                      </div>

                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block font-mono">
                          Replica State on node-03
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {simulatedNodeState === 'HEALTHY' && 'SHA-256 Validated (100% Integrity)'}
                          {simulatedNodeState === 'CORRUPTED' && 'Checksum Mismatch Detected! Queuing Repair Job...'}
                          {simulatedNodeState === 'REPAIRING' && 'Streaming healthy chunks from node-01...'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                        simulatedNodeState === 'HEALTHY'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                          : simulatedNodeState === 'CORRUPTED'
                          ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {simulatedNodeState}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: CHAOS & PARTITIONS */}
            {currentStep.id === 'chaos' && (
              <div className="space-y-6">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  The integrated Chaos Lab lets operators inject hardware outages and split-brain network partitions to evaluate system resilience under extreme adversarial conditions.
                </p>

                <div className="p-4 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                      Partition Topology Simulator
                    </span>
                    <button
                      onClick={() => setActivePartitionGroup(activePartitionGroup === 'NONE' ? 'SPLIT' : 'NONE')}
                      className="text-xs font-mono font-semibold px-3 py-1.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-indigo-500 transition text-slate-700 dark:text-slate-300"
                    >
                      {activePartitionGroup === 'NONE' ? '⚡ Simulate Split-Brain' : '🔄 Resolve Partition'}
                    </button>
                  </div>

                  {activePartitionGroup === 'NONE' ? (
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center font-mono space-y-1">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Full Mesh Connectivity
                      </span>
                      <p className="text-[11px] text-slate-500">
                        All 5 storage nodes can communicate across intra-cluster routing bridges.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                      <div className="p-3.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 block mb-1">
                          Group A (Quorum Majority)
                        </span>
                        <span className="text-[11px] text-slate-600 dark:text-slate-400">
                          [node-01, node-02, node-03]
                        </span>
                        <span className="mt-2 block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          ✓ Writes Accepted (Quorum = 2)
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-300 block mb-1">
                          Group B (Isolated Minority)
                        </span>
                        <span className="text-[11px] text-slate-600 dark:text-slate-400">
                          [node-04, node-05]
                        </span>
                        <span className="mt-2 block text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                          ✗ Writes Fenced (Prevents Split-Brain)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: MISSION CONTROL LAUNCH */}
            {currentStep.id === 'launch' && (
              <div className="space-y-6">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  You are now fully acquainted with the VAULT control plane. You can explore cluster metrics, inspect storage nodes, upload objects with tunable policies, and run chaos experiments.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Link
                    href="/dashboard"
                    onClick={completeOnboarding}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all group"
                  >
                    <Activity className="w-5 h-5 text-indigo-500 mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">Cluster Dashboard</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Live SLA, storage overhead, capacity metrics & activity stream
                    </p>
                  </Link>

                  <Link
                    href="/dashboard/objects"
                    onClick={completeOnboarding}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all group"
                  >
                    <Database className="w-5 h-5 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">Object Explorer</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Upload, inspect replica placements, verify checksums & download
                    </p>
                  </Link>

                  <Link
                    href="/dashboard/chaos"
                    onClick={completeOnboarding}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all group"
                  >
                    <Zap className="w-5 h-5 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">Chaos Engineering</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Inject node outages, corrupt bytes, and test self-healing
                    </p>
                  </Link>
                </div>
              </div>
            )}

            {/* Bottom Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-200/80 dark:border-slate-800/80">
              <Button
                variant="outline"
                size="md"
                onClick={handlePrev}
                disabled={currentStepIndex === 0}
                className="text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                <span>Previous</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button size="md" onClick={handleNext} className="text-xs px-5">
                  <span>{currentStepIndex === ONBOARDING_STEPS.length - 1 ? 'Launch Control Plane' : 'Next Step'}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer info */}
      <footer className="relative z-20 text-center text-xs text-slate-400 dark:text-slate-500 font-mono py-2">
        <span>Use <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px]">←</kbd> and <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px]">→</kbd> keys to navigate tour • <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px]">Esc</kbd> to exit</span>
      </footer>
    </div>
  );
}
