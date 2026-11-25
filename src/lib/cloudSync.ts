'use client';

import { ChartDrawing, UserCloudData, SyncStatus } from '@/types/sync';

const LOCAL_STORAGE_KEY = 'stock_alpha_user_cloud_data_v1';
const PENDING_CHANGES_KEY = 'stock_alpha_pending_sync_v1';

// Default initial state
const defaultCloudData: UserCloudData = {
  userId: 'local_user',
  lastSyncedAt: Date.now(),
  watchlist: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'TATAMOTORS.NS', 'ICICIBANK.NS'],
  drawings: [],
  portfolioHoldings: [],
  customScans: [],
  preferences: {
    theme: 'dark',
    defaultTimeframe: '1d',
    chartType: 'candles',
    showVolume: true,
    showRSI: true,
  }
};

class CloudSyncService {
  private listeners: ((status: SyncStatus) => void)[] = [];
  private dataListeners: ((data: UserCloudData) => void)[] = [];
  private status: SyncStatus = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    lastSynced: null,
    pendingChanges: false,
    error: null,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.status.isOnline = true;
        this.notifyStatus();
        this.syncWithCloud();
      });

      window.addEventListener('offline', () => {
        this.status.isOnline = false;
        this.notifyStatus();
      });
    }
  }

  public getLocalData(): UserCloudData {
    if (typeof window === 'undefined') return defaultCloudData;
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return { ...defaultCloudData, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to read from localStorage:', e);
    }
    return defaultCloudData;
  }

  public saveLocalData(updater: (prev: UserCloudData) => UserCloudData): UserCloudData {
    const prev = this.getLocalData();
    const updated = updater(prev);
    updated.lastSyncedAt = Date.now();

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        localStorage.setItem(PENDING_CHANGES_KEY, 'true');
        this.status.pendingChanges = true;
        this.notifyStatus();
        this.notifyData(updated);
        
        // Trigger background cloud sync
        this.syncWithCloud();
      } catch (e) {
        console.error('Failed to save to localStorage:', e);
      }
    }

    return updated;
  }

  public async syncWithCloud(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!navigator.onLine) {
      this.status.isOnline = false;
      this.notifyStatus();
      return false;
    }

    this.status.isSyncing = true;
    this.status.error = null;
    this.notifyStatus();

    try {
      const localData = this.getLocalData();
      
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localData),
      });

      if (!response.ok) {
        throw new Error(`Sync error: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.data) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(result.data));
        localStorage.removeItem(PENDING_CHANGES_KEY);
        this.status.lastSynced = Date.now();
        this.status.pendingChanges = false;
        this.notifyData(result.data);
      }

      this.status.isSyncing = false;
      this.notifyStatus();
      return true;
    } catch (err: any) {
      // Offline fallback: keep local data safe
      this.status.isSyncing = false;
      this.status.error = err.message || 'Cloud sync offline fallback active';
      this.notifyStatus();
      return false;
    }
  }

  public subscribeStatus(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.status);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public subscribeData(listener: (data: UserCloudData) => void): () => void {
    this.dataListeners.push(listener);
    listener(this.getLocalData());
    return () => {
      this.dataListeners = this.dataListeners.filter(l => l !== listener);
    };
  }

  private notifyStatus() {
    this.listeners.forEach(l => l({ ...this.status }));
  }

  private notifyData(data: UserCloudData) {
    this.dataListeners.forEach(l => l({ ...data }));
  }

  // Helper APIs for Chart Drawings
  public getDrawingsForSymbol(symbol: string): ChartDrawing[] {
    const data = this.getLocalData();
    return data.drawings.filter(d => d.symbol === symbol);
  }

  public saveDrawing(drawing: ChartDrawing): void {
    this.saveLocalData(prev => {
      const existing = prev.drawings.filter(d => d.id !== drawing.id);
      return {
        ...prev,
        drawings: [...existing, drawing]
      };
    });
  }

  public removeDrawing(drawingId: string): void {
    this.saveLocalData(prev => ({
      ...prev,
      drawings: prev.drawings.filter(d => d.id !== drawingId)
    }));
  }

  public clearDrawingsForSymbol(symbol: string): void {
    this.saveLocalData(prev => ({
      ...prev,
      drawings: prev.drawings.filter(d => d.symbol !== symbol)
    }));
  }

  // Watchlist Helpers
  public toggleWatchlist(symbol: string): boolean {
    let isAdded = false;
    this.saveLocalData(prev => {
      const exists = prev.watchlist.includes(symbol);
      isAdded = !exists;
      return {
        ...prev,
        watchlist: exists ? prev.watchlist.filter(s => s !== symbol) : [...prev.watchlist, symbol]
      };
    });
    return isAdded;
  }
}

export const cloudSync = new CloudSyncService();
