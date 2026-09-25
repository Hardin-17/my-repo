'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  File,
  X,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  ShieldCheck,
  Server,
  Loader2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '@/lib/api';
import { formatBytes } from '@/lib/utils';
import { VaultObject } from '@/types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newObject: VaultObject) => void;
}

type UploadStep =
  | 'idle'
  | 'uploading'
  | 'checksum'
  | 'selecting_nodes'
  | 'creating_replicas'
  | 'verifying'
  | 'completed'
  | 'error';

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [replicationFactor, setReplicationFactor] = useState<number>(3);
  const [currentStep, setCurrentStep] = useState<UploadStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setReplicationFactor(3);
    setCurrentStep('idle');
    setErrorMessage(null);
  };

  const handleClose = () => {
    if (currentStep === 'idle' || currentStep === 'completed' || currentStep === 'error') {
      resetState();
      onClose();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleStartUpload = async () => {
    if (!selectedFile) return;

    setErrorMessage(null);
    setCurrentStep('uploading');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('replicationFactor', replicationFactor.toString());

    // Progress pipeline visualizer
    const stepTimer = (step: UploadStep, delayMs: number) =>
      new Promise<void>((resolve) =>
        setTimeout(() => {
          setCurrentStep(step);
          resolve();
        }, delayMs)
      );

    try {
      // Transition through pipeline stages during the upload lifecycle
      const uploadPromise = api.post<{ success: boolean; data: VaultObject }>('/objects', formData);

      await stepTimer('checksum', 450);
      await stepTimer('selecting_nodes', 450);
      await stepTimer('creating_replicas', 500);

      const response = await uploadPromise;

      await stepTimer('verifying', 400);
      setCurrentStep('completed');

      setTimeout(() => {
        onUploadSuccess(response.data);
        handleClose();
      }, 1000);
    } catch (err: any) {
      setCurrentStep('error');
      setErrorMessage(err.message || 'Object upload failed');
    }
  };

  const stepsList = [
    { id: 'uploading', label: 'Streaming File' },
    { id: 'checksum', label: 'Computing SHA-256' },
    { id: 'selecting_nodes', label: 'Selecting Nodes' },
    { id: 'creating_replicas', label: `${replicationFactor}x Replicas` },
    { id: 'verifying', label: 'Verifying Storage' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <UploadCloud className="w-4 h-4 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Upload New Object</h3>
              <p className="text-xs text-slate-400">Multi-node replicated distributed object ingest</p>
            </div>
          </div>
          {currentStep === 'idle' && (
            <button
              onClick={handleClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {currentStep === 'idle' ? (
            <>
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-3 ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : selectedFile
                    ? 'border-emerald-500/50 bg-slate-950/60'
                    : 'border-slate-700/80 bg-slate-950/40 hover:border-slate-600 hover:bg-slate-950/80'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <File className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white truncate max-w-[280px]">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">
                        {formatBytes(selectedFile.size)} · {selectedFile.type || 'Binary stream'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                      <UploadCloud className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">
                        Drag and drop your file here, or{' '}
                        <span className="text-indigo-400 hover:underline">browse files</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Max upload size: 500 MB · SHA-256 calculated on ingest
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Replication Factor Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Replication Factor
                  </label>
                  <span className="text-xs font-mono text-indigo-300">
                    {replicationFactor} distinct storage {replicationFactor === 1 ? 'node' : 'nodes'}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((factor) => (
                    <button
                      key={factor}
                      type="button"
                      onClick={() => setReplicationFactor(factor)}
                      className={`py-2 px-3 rounded-lg border font-mono text-xs font-bold transition-all ${
                        replicationFactor === factor
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {factor}x
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  Default: 3x. Each replica will be placed across distinct healthy storage nodes.
                </p>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <Button variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  disabled={!selectedFile}
                  onClick={handleStartUpload}
                >
                  <span>Upload & Replicate</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </>
          ) : currentStep === 'error' ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Upload Failed</h4>
                <p className="text-xs text-rose-300 max-w-sm mx-auto">{errorMessage}</p>
              </div>
              <Button variant="secondary" onClick={() => setCurrentStep('idle')}>
                Try Again
              </Button>
            </div>
          ) : currentStep === 'completed' ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Object Stored & Replicated</h4>
              <p className="text-xs text-slate-400">
                Metadata persisted and {replicationFactor} replicas confirmed healthy.
              </p>
            </div>
          ) : (
            /* Upload in-flight step pipeline */
            <div className="py-6 space-y-5">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                <h4 className="text-sm font-semibold text-white tracking-wide">
                  Ingesting Distributed Object...
                </h4>
              </div>

              <div className="space-y-2 max-w-xs mx-auto">
                {stepsList.map((step) => {
                  const isActive = currentStep === step.id;
                  const isPast =
                    stepsList.findIndex((s) => s.id === currentStep) >
                    stepsList.findIndex((s) => s.id === step.id);

                  return (
                    <div
                      key={step.id}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs font-mono transition-colors ${
                        isActive
                          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                          : isPast
                          ? 'text-emerald-400 bg-emerald-950/20'
                          : 'text-slate-400'
                      }`}
                    >
                      <span>{step.label}</span>
                      {isPast ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-slate-700" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
