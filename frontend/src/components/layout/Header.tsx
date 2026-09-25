'use client';

import React from 'react';
import { Menu, Activity, ShieldCheck, Cpu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Mobile menu toggle + breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-mono">VAULT-CLUSTER-PRIMARY</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-200 font-medium">Control Plane</span>
        </div>
      </div>

      {/* Right: Cluster Quick Status + User Action */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Global Cluster State Pill */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700/60 text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-slate-300 font-mono text-[11px]">System Online</span>
        </div>

        {/* Auth Role Tag */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-mono uppercase">
          <Cpu className="w-3 h-3" />
          <span>{user?.role || 'Operator'}</span>
        </div>

        {/* Sign out */}
        <button
          onClick={() => logout()}
          className="text-xs text-slate-400 hover:text-slate-100 transition px-2.5 py-1.5 rounded-lg hover:bg-slate-800 border border-transparent hover:border-slate-700/80"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
};
