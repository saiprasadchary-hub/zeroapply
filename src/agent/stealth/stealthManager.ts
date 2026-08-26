import type { Point, StealthConfig, StealthSpeedMode } from './types';
import { DEFAULT_STEALTH_CONFIG } from './types';
import { generateHumanMousePath } from './bezierMovement';
import { planKeystrokeTimings } from './humanTyping';
import { generateHumanScrollSteps, getReadingPause } from './stealthScroller';

const STEALTH_STORAGE_KEY = 'zeroapply_stealth_config_v1';

export class StealthManager {
  private static instance: StealthManager;
  private config: StealthConfig;
  private virtualCursor: Point = { x: 400, y: 300 };

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): StealthManager {
    if (!StealthManager.instance) {
      StealthManager.instance = new StealthManager();
    }
    return StealthManager.instance;
  }

  private loadConfig(): StealthConfig {
    try {
      const saved = localStorage.getItem(STEALTH_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_STEALTH_CONFIG, ...JSON.parse(saved) };
      }
    } catch {
      // Fallback
    }
    return { ...DEFAULT_STEALTH_CONFIG };
  }

  public getConfig(): StealthConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<StealthConfig>): StealthConfig {
    this.config = { ...this.config, ...updates };
    try {
      localStorage.setItem(STEALTH_STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      // Ignore
    }
    return this.getConfig();
  }

  public setMode(mode: StealthSpeedMode): StealthConfig {
    let speedWPM = 72;
    let readingMin = 800;
    let readingMax = 2500;

    if (mode === 'fast') {
      speedWPM = 120;
      readingMin = 300;
      readingMax = 900;
    } else if (mode === 'careful') {
      speedWPM = 52;
      readingMin = 1500;
      readingMax = 3800;
    }

    return this.updateConfig({
      mode,
      typingSpeedWPM: speedWPM,
      readingPauseMinMs: readingMin,
      readingPauseMaxMs: readingMax,
    });
  }

  public getVirtualCursor(): Point {
    return { ...this.virtualCursor };
  }

  public setVirtualCursor(point: Point): void {
    this.virtualCursor = { ...point };
  }

  /**
   * Generates realistic Bézier mouse movement steps to target coordinate
   */
  public planMouseMove(target: Point) {
    if (!this.config.enabled) {
      return [{ point: target, delayMs: 0 }];
    }

    const path = generateHumanMousePath(this.virtualCursor, target, {
      overshoot: this.config.enableOvershoot,
      jitter: this.config.enableMicroJitter ? 1.5 : 0,
    });

    this.virtualCursor = { ...target };
    return path;
  }

  /**
   * Generates natural keystroke delay plans
   */
  public planTyping(text: string): number[] {
    if (!this.config.enabled) {
      return text.split('').map(() => 0);
    }
    return planKeystrokeTimings(text, this.config.typingSpeedWPM);
  }

  /**
   * Generates smooth inertial scroll steps
   */
  public planScroll(deltaY: number) {
    if (!this.config.enabled) {
      return [{ deltaY, delayMs: 0 }];
    }
    return generateHumanScrollSteps(deltaY, 350);
  }

  /**
   * Calculates reading pause duration
   */
  public getReadingPause(): number {
    if (!this.config.enabled) return 50;
    return getReadingPause(this.config.readingPauseMinMs, this.config.readingPauseMaxMs);
  }

  /**
   * Helper sleep function
   */
  public async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const stealthEngine = StealthManager.getInstance();
