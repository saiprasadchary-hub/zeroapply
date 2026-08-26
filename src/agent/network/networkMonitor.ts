import type { NetworkConfig, NetworkMetrics, NetworkQuality } from './types';
import { DEFAULT_NETWORK_CONFIG } from './types';

type NetworkListener = (metrics: NetworkMetrics) => void;

export class NetworkMonitor {
  private static instance: NetworkMonitor;
  private config: NetworkConfig;
  private metrics: NetworkMetrics;
  private listeners: Set<NetworkListener> = new Set();
  private pingIntervalTimer: any = null;

  private constructor() {
    this.config = { ...DEFAULT_NETWORK_CONFIG };
    this.metrics = {
      quality: typeof navigator === 'undefined' || navigator.onLine ? 'good' : 'offline',
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      latencyMs: 0,
      consecutiveFailures: 0,
      totalRetries: 0,
      lastChecked: Date.now(),
    };

    this.initBrowserListeners();
    this.startPingLoop();
  }

  public static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  private initBrowserListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.metrics.isOnline = true;
      this.metrics.consecutiveFailures = 0;
      this.evaluateQuality(150);
    });

    window.addEventListener('offline', () => {
      this.metrics.isOnline = false;
      this.metrics.quality = 'offline';
      this.notify();
    });
  }

  private startPingLoop(): void {
    if (this.pingIntervalTimer) clearInterval(this.pingIntervalTimer);

    this.pingIntervalTimer = setInterval(() => {
      this.checkLatency();
    }, this.config.pingIntervalMs);
  }

  public async checkLatency(): Promise<number> {
    if (!this.metrics.isOnline) {
      this.metrics.quality = 'offline';
      this.notify();
      return -1;
    }

    const start = Date.now();
    try {
      // Light-weight ping check (e.g. cloudflare favicon or dns ping)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      await fetch('https://1.1.1.1/cdn-cgi/trace', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      const latency = Date.now() - start;
      this.metrics.latencyMs = latency;
      this.metrics.consecutiveFailures = 0;
      this.evaluateQuality(latency);
      return latency;
    } catch {
      this.metrics.consecutiveFailures++;
      if (this.metrics.consecutiveFailures >= 2) {
        this.metrics.quality = this.metrics.isOnline ? 'unstable' : 'offline';
      }
      this.notify();
      return -1;
    }
  }

  private evaluateQuality(latencyMs: number): void {
    let quality: NetworkQuality = 'good';

    if (!this.metrics.isOnline) {
      quality = 'offline';
    } else if (latencyMs < 250) {
      quality = 'excellent';
    } else if (latencyMs < this.config.slowPingThresholdMs) {
      quality = 'good';
    } else {
      quality = 'slow';
    }

    this.metrics.quality = quality;
    this.metrics.lastChecked = Date.now();
    this.notify();
  }

  public recordRetryAttempt(): void {
    this.metrics.totalRetries++;
    this.notify();
  }

  public getMetrics(): NetworkMetrics {
    return { ...this.metrics };
  }

  public isHealthy(): boolean {
    return this.metrics.isOnline && this.metrics.quality !== 'offline';
  }

  public getAdaptiveTimeout(baseTimeoutMs: number): number {
    if (this.metrics.quality === 'slow' || this.metrics.quality === 'unstable') {
      return Math.round(baseTimeoutMs * this.config.adaptiveTimeoutMultiplier);
    }
    return baseTimeoutMs;
  }

  public subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    listener(this.getMetrics());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const snapshot = this.getMetrics();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('[NetworkMonitor] Listener error:', err);
      }
    });
  }
}

export const networkMonitor = NetworkMonitor.getInstance();
