'use client';

import React, { useState } from 'react';
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
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Sparkles,
  Compass,
  Cpu,
  Activity,
  HardDrive,
  Check,
  Lock,
  ChevronRight,
  ExternalLink,
  Code2,
  Terminal,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

export default function LandingPage() {
  const router = useRouter();
  const { loginAsDemo } = useAuth();

  // Interactive Live Math Playground State
  const [rf, setRf] = useState(3);
  const [durability, setDurability] = useState<'ONE' | 'QUORUM' | 'ALL'>('QUORUM');
  const [isSimulatingWrite, setIsSimulatingWrite] = useState(false);
  const [activeNodesWritten, setActiveNodesWritten] = useState<number[]>([]);

  const quorumRequired =
    durability === 'ONE'
      ? 1
      : durability === 'ALL'
      ? rf
      : Math.floor(rf / 2) + 1;

  const maxFailures =
    durability === 'ALL'
      ? 0
      : durability === 'ONE'
      ? rf - 1
      : Math.floor((rf - 1) / 2);

  const simulateWriteFlow = () => {
    setIsSimulatingWrite(true);
    setActiveNodesWritten([]);

    // Animate write reaching each node sequentially or concurrently
    const nodes = [1, 2, 3, 4, 5].slice(0, rf);
    nodes.forEach((nodeNum, i) => {
      setTimeout(() => {
        setActiveNodesWritten((prev) => [...prev, nodeNum]);
        if (i === nodes.length - 1) {
          setTimeout(() => setIsSimulatingWrite(false), 1200);
        }
      }, (i + 1) * 280);
    });
  };

  const handle1ClickDemo = () => {
    loginAsDemo();
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 bg-grid-pattern relative flex flex-col justify-between overflow-x-hidden transition-colors duration-300">
      {/* Dynamic Animated Ambient Glow Orbs */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] sm:w-[900px] h-[450px] bg-gradient-to-b from-indigo-500/15 via-purple-500/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.12, 0.22, 0.12],
          x: [0, 25, 0],
          y: [0, -20, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/3 left-[-150px] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[130px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.18, 0.1],
          x: [0, -30, 0],
          y: [0, 25, 0],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-2/3 right-[-150px] w-[550px] h-[550px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none"
      />

      {/* Global Navigation Header */}
      <header className="relative z-30 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md sticky top-0 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.05 }}
              className="w-9 h-9 rounded-xl bg-indigo-600/10 dark:bg-indigo-600/25 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600/20 shadow-sm"
            >
              <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
            </motion.div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">VAULT</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 font-semibold">
                Control Plane
              </span>
            </div>
          </Link>

          {/* Quick Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-300 font-mono">
            <a href="#architecture" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Architecture</a>
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Pillars</a>
            <a href="#playground" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Quorum Math</a>
            <Link href="/onboarding" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interactive Tour</span>
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />

            <Link
              href="/login"
              className="hidden sm:inline-flex items-center text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Sign In
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 rounded-lg shadow-sm shadow-indigo-500/20 transition"
            >
              <span>Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-12 sm:pt-20 pb-16 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-6">
          {/* Eyebrow Pill */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-medium shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Autonomous Fault-Tolerant Distributed Object Storage</span>
          </motion.div>

          {/* Hero Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]"
          >
            Mission-Critical Storage That{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500">
              Heals Itself.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal"
          >
            VAULT provides shardless replication across independent storage nodes, continuous SHA-256 bit-rot scrubbing, automated quorum reconciliation, and split-brain fencing under harsh network partitions.
          </motion.p>

          {/* CTA Group */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-3 pt-2"
          >
            <Link href="/dashboard">
              <Button size="lg" className="px-6 text-sm font-semibold shadow-lg shadow-indigo-500/25">
                <span>Enter Control Plane</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>

            <Link href="/onboarding">
              <Button variant="outline" size="lg" className="px-5 text-sm font-semibold gap-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Interactive 2-Min Tour</span>
              </Button>
            </Link>

            <button
              onClick={handle1ClickDemo}
              className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>1-Click Hackathon Demo</span>
            </button>
          </motion.div>

          {/* Live Telemetry Summary Chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="pt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs font-mono text-slate-500 dark:text-slate-400"
          >
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>SLA: 99.99% Availability</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <Server className="w-3.5 h-3.5 text-indigo-500" />
              <span>5 Active Storage Nodes</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
              <span>SHA-256 Bit-Rot Scrubbing</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Zero Split-Brain Quorum Fencing</span>
            </div>
          </motion.div>
        </section>

        {/* SECTION 2: INTERACTIVE LIVE CLUSTER VISUALIZER */}
        <section id="architecture" className="py-12 px-4 sm:px-6 max-w-5xl mx-auto">
          <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl backdrop-blur-md relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-semibold block mb-1">
                  Cluster Mesh Visualizer
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  5-Node Storage Topology & Live Replicas
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Test payload distribution with configurable durability across multi-zone storage nodes
                </p>
              </div>

              <Button
                size="sm"
                onClick={simulateWriteFlow}
                disabled={isSimulatingWrite}
                className="self-start sm:self-auto text-xs"
              >
                {isSimulatingWrite ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    <span>Streaming Payload Across Nodes...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 mr-1.5" />
                    <span>Simulate Quorum Write Flow</span>
                  </>
                )}
              </Button>
            </div>

            {/* Nodes Visual Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 my-6">
              {['node-01', 'node-02', 'node-03', 'node-04', 'node-05'].map((id, idx) => {
                const nodeNumber = idx + 1;
                const isSelectedForWrite = activeNodesWritten.includes(nodeNumber);

                return (
                  <motion.div
                    key={id}
                    whileHover={{ y: -4 }}
                    className={`p-4 rounded-2xl border text-center transition-all ${
                      isSelectedForWrite
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500/80 shadow-md shadow-emerald-500/20 scale-105'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 mx-auto rounded-xl flex items-center justify-center mb-2 transition-colors ${
                        isSelectedForWrite
                          ? 'bg-emerald-500 text-white'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                      }`}
                    >
                      <Server className="w-4 h-4" />
                    </div>

                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 block">
                      {id}
                    </span>

                    <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                      Zone: us-east-{nodeNumber}
                    </span>

                    <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isSelectedForWrite ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'
                        }`}
                      />
                      <span className="text-[10px] font-mono text-slate-500">
                        {isSelectedForWrite ? 'ACK RECEIVED' : 'ONLINE'}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Visualizer Status Bar */}
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Durability Quorum: <strong>{activeNodesWritten.length} / {quorumRequired}</strong> Required Acknowledgements</span>
              </span>
              <span className="text-slate-400">Status: {isSimulatingWrite ? 'In Flight' : 'Ready'}</span>
            </div>
          </div>
        </section>

        {/* SECTION 3: 6 CORE DISTRIBUTED PILLARS */}
        <section id="features" className="py-16 px-4 sm:px-6 max-w-6xl mx-auto">
          <div className="text-center space-y-2 mb-12">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Engineered For Extremes
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              6 Core Distributed Pillars
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Addressing every challenge from the hackathon problem statement with resilient mathematical models.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Layers,
                color: 'text-indigo-500',
                title: 'Tunable Quorum Durability',
                desc: 'Support for ONE, QUORUM, or ALL write acknowledgement policies with strict consistency guarantees (⌊RF/2⌋ + 1).',
              },
              {
                icon: ShieldCheck,
                color: 'text-teal-500',
                title: 'Autonomous Bit-Rot Scrubbing',
                desc: 'Continuous background workers hash replica payloads with SHA-256, detecting bit-level corruptions and rebuilding from healthy quorums.',
              },
              {
                icon: Zap,
                color: 'text-amber-500',
                title: 'Split-Brain Partition Fencing',
                desc: 'Simulated network splits enforce partition quorum rules—isolated minority nodes reject writes to prevent split-brain dirty states.',
              },
              {
                icon: RotateCw,
                color: 'text-emerald-500',
                title: 'Zero-Downtime Rebalancing',
                desc: 'Dynamic background replica redistributor reallocates object placement when storage nodes join, fail, or recover.',
              },
              {
                icon: Lock,
                color: 'text-rose-500',
                title: 'Optimistic Concurrency Control',
                desc: 'Atomic Compare-And-Swap (CAS) version checks on objects prevent simultaneous write overwrites under heavy concurrent traffic.',
              },
              {
                icon: Sparkles,
                color: 'text-purple-500',
                title: 'VaultOps AI Copilot',
                desc: 'Real-time floating assistant capable of inspecting cluster health, running chaos scenarios, and reporting recovery metrics via natural language.',
              },
            ].map((pillar, idx) => (
              <motion.div
                key={pillar.title}
                whileHover={{ y: -4, scale: 1.01 }}
                className="p-6 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <pillar.icon className={`w-5 h-5 ${pillar.color}`} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {pillar.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {pillar.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* SECTION 4: INTERACTIVE QUORUM MATH PLAYGROUND */}
        <section id="playground" className="py-12 px-4 sm:px-6 max-w-4xl mx-auto">
          <div className="p-6 sm:p-10 rounded-3xl bg-gradient-to-br from-indigo-50/70 via-purple-50/50 to-white dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 shadow-xl space-y-6">
            <div>
              <span className="text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                Interactive Playground
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Live Durability & Fault Tolerance Calculator
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Move the sliders to inspect mathematical quorum guarantees and node loss resilience.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">
                    Replication Factor: {rf} Replicas
                  </span>
                  <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold">
                    RF = {rf}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={rf}
                  onChange={(e) => setRf(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 block">
                  Durability Policy
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['ONE', 'QUORUM', 'ALL'] as const).map((pol) => (
                    <button
                      key={pol}
                      onClick={() => setDurability(pol)}
                      className={`p-2.5 rounded-xl border text-xs font-mono font-semibold transition-all ${
                        durability === pol
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 scale-[1.02]'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {pol}
                    </button>
                  ))}
                </div>
              </div>

              {/* Math Results Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-center font-mono">
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block uppercase">Required Acknowledgements</span>
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{quorumRequired} of {rf}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block uppercase">Mathematical Model</span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 block">
                    {durability === 'QUORUM' ? '⌊RF/2⌋ + 1' : durability === 'ALL' ? 'RF (Total)' : '1 (Single Ack)'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block uppercase">Fault Tolerance</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    Survives {maxFailures} {maxFailures === 1 ? 'failure' : 'failures'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: READY TO OPERATE CTA */}
        <section className="py-16 px-4 sm:px-6 max-w-4xl mx-auto text-center space-y-6">
          <div className="p-8 sm:p-12 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Ready to Explore the VAULT Control Plane?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
              Inspect live cluster telemetry, upload and download versioned objects, or inject chaos simulations with instant self-healing recovery.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href="/dashboard">
                <Button size="lg" className="px-6 text-sm font-semibold">
                  <span>Open Control Plane</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
              <Link href="/onboarding">
                <Button variant="outline" size="lg" className="text-sm font-semibold gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>Start Architecture Tour</span>
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Global Footer */}
      <footer className="relative z-20 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md py-6 px-4 sm:px-6 text-xs text-slate-500 dark:text-slate-400 font-mono transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-500" />
            <span className="font-bold text-slate-800 dark:text-slate-200">VAULT Object Storage</span>
            <span>• Built for PromptWars Hackathon</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/onboarding" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              Tour
            </Link>
            <Link href="/dashboard/nodes" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              Nodes
            </Link>
            <Link href="/dashboard/chaos" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              Chaos Lab
            </Link>
            <Link href="/dashboard/objects" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              Objects
            </Link>
            <Link href="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
