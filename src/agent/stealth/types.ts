export type StealthSpeedMode = 'fast' | 'natural' | 'careful';

export interface StealthConfig {
  enabled: boolean;
  mode: StealthSpeedMode;
  showVisualCursor: boolean;
  typingSpeedWPM: number;
  enableOvershoot: boolean;
  enableMicroJitter: boolean;
  readingPauseMinMs: number;
  readingPauseMaxMs: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface BezierOptions {
  steps?: number;
  deviation?: number;
  overshoot?: boolean;
  jitter?: number;
}

export interface MovementStep {
  point: Point;
  delayMs: number;
}

export const DEFAULT_STEALTH_CONFIG: StealthConfig = {
  enabled: true,
  mode: 'natural',
  showVisualCursor: false,
  typingSpeedWPM: 72,
  enableOvershoot: true,
  enableMicroJitter: true,
  readingPauseMinMs: 800,
  readingPauseMaxMs: 2500,
};
