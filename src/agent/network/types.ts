export type NetworkQuality = 'excellent' | 'good' | 'slow' | 'offline' | 'unstable';

export interface NetworkConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialFactor: number;
  adaptiveTimeoutMultiplier: number;
  pingIntervalMs: number;
  slowPingThresholdMs: number;
}

export interface NetworkMetrics {
  quality: NetworkQuality;
  isOnline: boolean;
  latencyMs: number;
  consecutiveFailures: number;
  totalRetries: number;
  lastChecked: number;
}

export interface PageWaitOptions {
  timeoutMs?: number;
  waitForNetworkIdle?: boolean;
  networkIdleTimeMs?: number;
  essentialSelectors?: string[];
  pollIntervalMs?: number;
}

export interface PageWaitResult {
  success: boolean;
  status: 'ready' | 'essential_elements_found' | 'timed_out' | 'offline';
  elapsedMs: number;
  error?: string;
}

export const DEFAULT_NETWORK_CONFIG: NetworkConfig = {
  maxRetries: 4,
  baseDelayMs: 1200,
  maxDelayMs: 15000,
  exponentialFactor: 2,
  adaptiveTimeoutMultiplier: 1.8,
  pingIntervalMs: 8000,
  slowPingThresholdMs: 900,
};
