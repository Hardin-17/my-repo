'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, X, Terminal, ShieldAlert, Cpu } from 'lucide-react';

export const FloatingAssistantButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative group flex items-center gap-2.5 px-4 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 border border-indigo-400/30 transition-all duration-300"
          aria-label="Open VaultOps AI Assistant"
        >
          {/* Subtle pulse aura */}
          <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 opacity-40 blur-sm group-hover:opacity-75 transition duration-500 animate-pulse" />

          <span className="relative flex items-center gap-2 font-medium text-sm">
            <Bot className="w-5 h-5 text-cyan-300" />
            <span className="hidden sm:inline">VaultOps AI</span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </span>
        </motion.button>
      </div>

      {/* Slide-out Preview Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:bg-transparent md:backdrop-blur-none pointer-events-auto md:pointer-events-none"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-20 right-6 z-50 w-[90vw] sm:w-[420px] max-h-[580px] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-900/90">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Sparkles className="w-4 h-4 text-cyan-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                      VaultOps AI
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                        PHASE 4
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">Autonomous Diagnostic Copilot</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4 overflow-y-auto">
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                    <Terminal className="w-3.5 h-3.5" /> Engine Status
                  </div>
                  <p className="text-xs text-slate-200 font-medium leading-relaxed">
                    VaultOps AI will be connected in Phase 4.
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono bg-slate-950/60 p-2 rounded border border-slate-800">
                    Natural language telemetry diagnostics, automated root-cause analysis, and operator copilot workflows will be enabled in Phase 4.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Planned Operations (Preview)
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 text-xs text-slate-300 flex items-center gap-2 hover:border-slate-700 transition cursor-default">
                      <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>&quot;Explain under-replicated chunks in Zone US-East&quot;</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 text-xs text-slate-300 flex items-center gap-2 hover:border-slate-700 transition cursor-default">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>&quot;Diagnose root cause of node failure on 10.0.1.4&quot;</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Safe Mode Active
                </span>
                <span className="font-mono">Vault Kernel v0.1</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
