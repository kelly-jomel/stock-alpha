'use client';

import React, { useEffect, useState } from 'react';
import { cloudSync } from '@/lib/cloudSync';
import { SyncStatus } from '@/types/sync';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function CloudSyncStatusBadge() {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    lastSynced: null,
    pendingChanges: false
  });

  useEffect(() => {
    return cloudSync.subscribeStatus(setStatus);
  }, []);

  const handleManualSync = () => {
    if (!status.isSyncing) {
      cloudSync.syncWithCloud();
    }
  };

  return (
    <div
      onClick={handleManualSync}
      title={
        !status.isOnline
          ? 'Offline: Changes saved locally'
          : status.isSyncing
          ? 'Syncing with cloud...'
          : status.lastSynced
          ? `Synced: ${new Date(status.lastSynced).toLocaleTimeString()}`
          : 'Click to sync with cloud'
      }
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all border ${
        !status.isOnline
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          : status.isSyncing
          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse'
          : status.pendingChanges
          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
      }`}
    >
      {!status.isOnline ? (
        <>
          <CloudOff className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Offline (Saved)</span>
        </>
      ) : status.isSyncing ? (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
          <span className="hidden sm:inline">Syncing...</span>
        </>
      ) : status.pendingChanges ? (
        <>
          <Cloud className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Sync Pending</span>
        </>
      ) : (
        <>
          <Cloud className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Cloud Synced</span>
        </>
      )}
    </div>
  );
}
