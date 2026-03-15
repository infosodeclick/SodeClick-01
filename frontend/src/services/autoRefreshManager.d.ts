/**
 * TypeScript declarations for autoRefreshManager
 */

export interface AutoRefreshStats {
  totalRefreshes: number;
  successfulRefreshes: number;
  failedRefreshes: number;
  lastRefreshTime: number | null;
}

export interface AutoRefreshManagerStats {
  isActive: boolean;
  isVisible: boolean;
  lastActivity: string;
  uptime: number;
  activeIntervals: number;
  activeWorkers: number;
  serviceWorkerSupported: boolean;
  serviceWorkerActive: boolean;
  refreshStats: {
    totalRefreshes: number;
    successfulRefreshes: number;
    failedRefreshes: number;
    lastRefreshTime: number | null;
    successRate: number;
    averageRefreshTime: number;
  };
  idleTime: number;
  memoryUsage: {
    used: number;
    total: number;
    limit: number;
  } | null;
  networkInfo: {
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  } | null;
  currentFrequency: string;
}

export interface AutoRefreshManager {
  startChatRefresh(roomId: string, userId: string): Promise<void>;
  stopChatRefresh(): void;
  startRefresh(type: string, callback: () => void, frequency?: string): void;
  stopRefresh(type: string): void;
  refreshNotifications(userId: string): Promise<void>;
  getStats(): AutoRefreshManagerStats;
  resetStats(): void;
}

declare const autoRefreshManager: AutoRefreshManager;
export default autoRefreshManager;
