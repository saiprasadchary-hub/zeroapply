/**
 * ZeroApply Stealth - Stealth Engine
 * Controls anti-bot detection pacing, human typing cadence (WPM),
 * and mouse movement behavior across browser sessions.
 */

export type StealthSpeedMode = 'natural' | 'careful' | 'fast';

export interface StealthConfig {
  enabled: boolean;
  mode: StealthSpeedMode;
  typingSpeedWPM: number;
}

const STORAGE_KEY = 'zeroapply_stealth_config';

const SPEED_PRESETS: Record<StealthSpeedMode, number> = {
  careful: 55,
  natural: 75,
  fast: 110,
};

export class StealthEngine {
  private config: StealthConfig;

  public constructor() {
    this.config = this.loadInitialConfig();
  }

  private loadInitialConfig(): StealthConfig {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.enabled === 'boolean') {
            return {
              enabled: parsed.enabled,
              mode: parsed.mode || 'natural',
              typingSpeedWPM: parsed.typingSpeedWPM || SPEED_PRESETS[parsed.mode as StealthSpeedMode] || 75,
            };
          }
        }
      }
    } catch {}

    return {
      enabled: true,
      mode: 'natural',
      typingSpeedWPM: 75,
    };
  }

  public getConfig(): StealthConfig {
    return { ...this.config };
  }

  public updateConfig(partial: Partial<StealthConfig>): StealthConfig {
    this.config = {
      ...this.config,
      ...partial,
    };

    // If mode updated without explicit WPM, synchronize WPM preset
    if (partial.mode && !partial.typingSpeedWPM) {
      this.config.typingSpeedWPM = SPEED_PRESETS[partial.mode] || 75;
    }

    this.saveConfig();
    return this.getConfig();
  }

  public setMode(mode: StealthSpeedMode): StealthConfig {
    return this.updateConfig({
      mode,
      typingSpeedWPM: SPEED_PRESETS[mode] || 75,
    });
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public getTargetWPM(): number {
    return this.config.enabled ? this.config.typingSpeedWPM : 250;
  }

  /**
   * Generates a realistic Gaussian-distributed humanized delay between job applications
   * (default 4,500ms - 11,000ms) to avoid robotic cadence detection.
   */
  public getHumanInterApplicationDelay(minMs = 4500, maxMs = 11000): number {
    if (!this.config.enabled) return 1000;

    // Adjust range based on speed mode
    let actualMin = minMs;
    let actualMax = maxMs;
    if (this.config.mode === 'fast') {
      actualMin = 3000;
      actualMax = 6500;
    } else if (this.config.mode === 'careful') {
      actualMin = 6000;
      actualMax = 15000;
    }

    // Box-Muller transform for true Gaussian bell curve distribution
    const u1 = Math.random() || 0.001;
    const u2 = Math.random();
    const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

    const mean = (actualMin + actualMax) / 2;
    const stdDev = (actualMax - actualMin) / 5;
    const delay = Math.round(mean + randStdNormal * stdDev);

    return Math.max(actualMin, Math.min(actualMax, delay));
  }

  /**
   * Generates a micro-delay mimicking human eye saccades or field transitions.
   */
  public getMicroDelay(minMs = 180, maxMs = 450): number {
    if (!this.config.enabled) return 50;
    return Math.floor(minMs + Math.random() * (maxMs - minMs));
  }

  private saveConfig(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
      }
    } catch {}
  }
}

export const stealthEngine = new StealthEngine();
