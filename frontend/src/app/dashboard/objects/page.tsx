'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Shell } from '@/components/layout/Shell';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { Button } from '@/components/ui/Button';
import { UploadModal } from '@/components/objects/UploadModal';
import { ObjectDetailsModal } from '@/components/objects/ObjectDetailsModal';
import { VaultObject } from '@/types';
import { api } from '@/lib/api';
import { formatBytes, formatRelativeTime, truncateHash } from '@/lib/utils';
import {
  HardDrive,
  Upload,
  Search,
  Download,
  Info,
  Layers,
  FileText,
  Clock,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';

export default function ObjectExplorerPage() {
  const [objects, setObjects] = useState<VaultObject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [selectedObject, setSelectedObject] = useState<VaultObject | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchObjects = async () => {
    setIsLoading(true);
    try {
      const response = await api.get<{ success: boolean; data: VaultObject[] }>('/objects');
      if (response.data) {
        setObjects(response.data);
      }
    } catch (err) {
      console.error('Failed to load objects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchObjects();
  }, []);

  const handleDownload = async (object: VaultObject) => {
    setDownloadingId(object.objectId);
    try {
      await api.download(`/objects/${object.objectId}/download`, object.originalName);
    } catch (err: any) {
      alert(err.message || 'Failed to download object');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleInspect = (object: VaultObject) => {
    setSelectedObject(object);
    setIsDetailsOpen(true);
  };

  const filteredObjects = objects.filter(
    (obj) =>
      obj.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obj.objectId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obj.checksum.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <Shell>
        {/* Top Header Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-xl p-4 sm:p-5 shadow-sm"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Object Explorer</h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 font-semibold">
                {objects.length} OBJECTS STORED
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Distributed object ingest, replica inspection, and SHA-256 verifiable object retrieval.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchObjects}
                isLoading={isLoading}
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsUploadModalOpen(true)}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Object</span>
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by object name, key, or SHA-256 checksum..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
            />
          </div>
        </div>

        {/* Object Table */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 overflow-hidden shadow-sm"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 font-mono uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Name / ID</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Replicas</th>
                  <th className="py-3 px-4">SHA-256 Checksum</th>
                  <th className="py-3 px-4">Health</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 font-mono">
                {filteredObjects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
                      <FolderOpen className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-500" />
                      <p className="text-sm font-sans font-medium text-slate-800 dark:text-slate-300">
                        {searchQuery ? 'No matching objects found' : 'No distributed objects uploaded yet'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-sans max-w-sm mx-auto">
                        Upload your first file to initiate multi-node placement and cryptographic replica sync.
                      </p>
                      {!searchQuery && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsUploadModalOpen(true)}
                          className="mt-2"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          <span>Upload File Now</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredObjects.map((obj, idx) => (
                    <motion.tr
                      key={obj.objectId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-slate-200 block text-xs truncate max-w-[200px] sm:max-w-xs">
                              {obj.originalName}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                              {obj.objectId}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{formatBytes(obj.size)}</td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20 text-[11px]">
                          <Layers className="w-3 h-3" />
                          {obj.replicas?.length || 0} / {obj.replicationFactor}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                        {truncateHash(obj.checksum, 6, 6)}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={obj.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                        {formatRelativeTime(obj.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <motion.button
                            onClick={() => handleInspect(obj)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title="Inspect Object Replicas"
                          >
                            <Info className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            onClick={() => handleDownload(obj)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={downloadingId === obj.objectId}
                            className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition"
                            title="Download Verified Object"
                          >
                            <Download className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Upload Modal */}
        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUploadSuccess={() => {
            fetchObjects();
          }}
        />

        {/* Object Replicas Details Modal */}
        <ObjectDetailsModal
          object={selectedObject}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          onDownload={handleDownload}
        />
      </Shell>
    </ProtectedRoute>
  );
}
