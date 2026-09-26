'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Sparkles,
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Scale,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { api } from '@/lib/api';
import { AIChatMessage, ActionProposal } from '@/types';

export const FloatingAssistantButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content:
        'Hello Operator! I am **VaultOps AI**, your autonomous co-pilot for the distributed storage mesh. I monitor cluster health, analyze storage skew, detect network partitions, and recommend validated self-healing actions.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isTyping) return;

    const userMsg: AIChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsTyping(true);

    try {
      // Build conversation history for API
      const history = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.post<{
        data: {
          reply: string;
          proposals?: ActionProposal[];
          modelUsed?: string;
        };
      }>('/ai/chat', {
        message: text,
        conversationHistory: history,
      });

      const aiMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.data?.reply || 'Cluster analysis completed.',
        proposals: res.data?.proposals || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errMsg: AIChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Telemetry error: ${err.message || 'Unable to connect to VaultOps engine'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleExecuteProposal = async (proposal: ActionProposal) => {
    setExecutingAction(proposal.action);
    try {
      const res = await api.post<{
        success: boolean;
        data: {
          result: { message: string };
        };
      }>('/ai/execute-action', {
        action: proposal.action,
        payload: proposal.payload || {},
      });

      const confirmationMsg: AIChatMessage = {
        id: `act-${Date.now()}`,
        role: 'assistant',
        content: `✅ **Action Confirmed & Executed:** \`${proposal.action}\`\n\n${
          res.data?.result?.message || 'Operation executed successfully against the distributed cluster.'
        }`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, confirmationMsg]);
    } catch (err: any) {
      const failMsg: AIChatMessage = {
        id: `act-fail-${Date.now()}`,
        role: 'assistant',
        content: `❌ **Action Execution Failed:** ${err.message || 'Operation error'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, failMsg]);
    } finally {
      setExecutingAction(null);
    }
  };

  const quickPrompts = [
    { label: 'Diagnose Health', prompt: 'Diagnose cluster health and storage state' },
    { label: 'Check Skew', prompt: 'Check storage skew and rebalance status' },
    { label: 'Check Partitions', prompt: 'Check network partitions status' },
    { label: 'Reconciliation', prompt: 'Check repair and reconciliation status' },
  ];

  return (
    <>
      {/* Floating Action Button with Framer Motion hover & pulse */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
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

      {/* Slide-out Interactive Chat Drawer with Framer Motion */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 md:bg-transparent md:backdrop-blur-none pointer-events-auto md:pointer-events-none"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="fixed bottom-20 right-4 sm:right-6 z-50 w-[95vw] sm:w-[460px] h-[640px] max-h-[85vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      VaultOps AI
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-mono">
                        COPILOT
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Real-Time Autonomous Storage Assistant</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Actions Bar */}
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto shrink-0">
                {quickPrompts.map((qp) => (
                  <motion.button
                    key={qp.label}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSendMessage(qp.prompt)}
                    disabled={isTyping}
                    className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800/80 hover:bg-indigo-50 dark:hover:bg-indigo-600/30 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 text-[11px] font-mono text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-200 transition shrink-0 shadow-sm"
                  >
                    {qp.label}
                  </motion.button>
                ))}
              </div>

              {/* Message History */}
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed space-y-2 ${
                        m.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20'
                          : 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 rounded-bl-none shadow-sm'
                      }`}
                    >
                      <div className="whitespace-pre-wrap font-sans">
                        {m.content}
                      </div>

                      {/* Render Action Proposals if present */}
                      {m.proposals && m.proposals.length > 0 && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-2">
                          <span className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-300 font-bold block">
                            Operational Action Proposal:
                          </span>
                          {m.proposals.map((prop, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl bg-white dark:bg-slate-950/80 border border-amber-300 dark:border-amber-500/30 space-y-2 shadow-sm"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300">
                                  {prop.action}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-500/20">
                                  REQUIRES CONFIRMATION
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300">{prop.description}</p>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleExecuteProposal(prop)}
                                disabled={executingAction === prop.action}
                                className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 transition shadow-sm"
                              >
                                {executingAction === prop.action ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                )}
                                <span>Confirm & Execute</span>
                              </motion.button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-1 px-1">
                      {m.timestamp}
                    </span>
                  </motion.div>
                ))}

                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono"
                  >
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                    <span>VaultOps AI is analyzing cluster telemetry...</span>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 bg-slate-50/90 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask VaultOps AI (e.g. 'Diagnose health', 'Check skew')..."
                    className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
                  />
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={!inputMessage.trim() || isTyping}
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition shadow-sm"
                    aria-label="Send query"
                  >
                    <Send className="w-4 h-4" />
                  </motion.button>
                </form>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-2 px-1">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Read-Only Telemetry Guards Active
                  </span>
                  <span>VaultOps v4</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
