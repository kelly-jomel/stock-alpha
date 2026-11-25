export interface ChartDrawing {
  id: string;
  symbol: string;
  type: 'TRENDLINE' | 'HORIZONTAL_LINE' | 'FIBONACCI' | 'SUPPORT_ZONE' | 'RESISTANCE_ZONE';
  points: { time?: string; price: number; xPercent?: number; yPercent?: number }[];
  color: string;
  label?: string;
  createdAt: number;
}

export interface UserCloudData {
  userId: string;
  email?: string;
  name?: string;
  lastSyncedAt: number;
  watchlist: string[];
  drawings: ChartDrawing[];
  portfolioHoldings: any[];
  customScans: any[];
  preferences: {
    theme?: 'dark' | 'light';
    defaultTimeframe?: string;
    chartType?: 'candles' | 'line';
    showVolume?: boolean;
    showRSI?: boolean;
  };
}

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSynced: number | null;
  pendingChanges: boolean;
  error?: string | null;
}
