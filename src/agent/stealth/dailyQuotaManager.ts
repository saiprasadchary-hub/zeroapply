/**
 * ZeroApply Stealth - Daily Quota & Anti-Ban Rate Limit Manager
 * Enforces configurable daily application limits (default 35/day)
 * with automatic midnight resets and persistent storage to prevent platform shadowbans.
 */

export interface DailyQuotaState {
  date: string; // ISO date string 'YYYY-MM-DD'
  count: number;
  maxDaily: number;
  lastAppliedAt: number;
}

export const DAILY_QUOTA_STORAGE_KEY = 'zeroapply_daily_quota_v1';
export const DEFAULT_MAX_DAILY_APPLICATIONS = 35;

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class DailyQuotaManager {
  private static instance: DailyQuotaManager | null = null;
  private state: DailyQuotaState;

  public constructor() {
    this.state = this.loadState();
  }

  public static getInstance(): DailyQuotaManager {
    if (!DailyQuotaManager.instance) {
      DailyQuotaManager.instance = new DailyQuotaManager();
    }
    return DailyQuotaManager.instance;
  }

  private loadState(): DailyQuotaState {
    const today = getTodayString();
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(DAILY_QUOTA_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.count === 'number' && typeof parsed.maxDaily === 'number') {
            // Check if day changed (midnight rollover)
            if (parsed.date === today) {
              return parsed;
            } else {
              // Day rolled over: reset count to 0 while preserving user's configured maxDaily
              return {
                date: today,
                count: 0,
                maxDaily: parsed.maxDaily || DEFAULT_MAX_DAILY_APPLICATIONS,
                lastAppliedAt: parsed.lastAppliedAt || 0,
              };
            }
          }
        }
      }
    } catch {}

    return {
      date: today,
      count: 0,
      maxDaily: DEFAULT_MAX_DAILY_APPLICATIONS,
      lastAppliedAt: 0,
    };
  }

  private saveState(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(DAILY_QUOTA_STORAGE_KEY, JSON.stringify(this.state));
      }
    } catch {}
  }

  private refreshIfDayChanged(): void {
    const today = getTodayString();
    if (this.state.date !== today) {
      this.state.date = today;
      this.state.count = 0;
      this.saveState();
    }
  }

  /**
   * Checks whether the agent is safely allowed to apply to another job today.
   */
  public canApply(): boolean {
    this.refreshIfDayChanged();
    return this.state.count < this.state.maxDaily;
  }

  /**
   * Returns remaining applications available today before safety auto-pause.
   */
  public getRemainingQuota(): number {
    this.refreshIfDayChanged();
    return Math.max(0, this.state.maxDaily - this.state.count);
  }

  /**
   * Records a successfully submitted job application and increments daily count.
   */
  public recordApplication(): DailyQuotaState {
    this.refreshIfDayChanged();
    this.state.count += 1;
    this.state.lastAppliedAt = Date.now();
    this.saveState();
    return { ...this.state };
  }

  /**
   * Returns current daily statistics.
   */
  public getDailyStats(): DailyQuotaState {
    this.refreshIfDayChanged();
    return { ...this.state };
  }

  /**
   * Updates user's preferred daily application cap.
   */
  public setMaxDaily(limit: number): void {
    if (limit > 0 && limit <= 200) {
      this.state.maxDaily = limit;
      this.saveState();
    }
  }

  /**
   * Resets daily application count for testing or manual overrides.
   */
  public resetQuota(): void {
    this.state.count = 0;
    this.state.lastAppliedAt = 0;
    this.saveState();
  }
}

export const dailyQuotaManager = DailyQuotaManager.getInstance();
