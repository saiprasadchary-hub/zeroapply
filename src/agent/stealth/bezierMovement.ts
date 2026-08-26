import type { Point, BezierOptions, MovementStep } from './types';

/**
 * Calculates a point on a cubic Bézier curve at parameter t (0 <= t <= 1)
 */
function getCubicBezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const oneMinusT = 1 - t;
  const oneMinusTSq = oneMinusT * oneMinusT;
  const oneMinusTCube = oneMinusTSq * oneMinusT;
  const tSq = t * t;
  const tCube = tSq * t;

  const x =
    oneMinusTCube * p0.x +
    3 * oneMinusTSq * t * p1.x +
    3 * oneMinusT * tSq * p2.x +
    tCube * p3.x;

  const y =
    oneMinusTCube * p0.y +
    3 * oneMinusTSq * t * p1.y +
    3 * oneMinusT * tSq * p2.y +
    tCube * p3.y;

  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

/**
 * Generates natural human-like mouse movement coordinates from start to target.
 * Uses Fitts's Law easing (slow start, fast travel, smooth decelerating target capture),
 * randomized curved control points, micro-jitter, and slight overshoot correction.
 */
export function generateHumanMousePath(
  start: Point,
  target: Point,
  options: BezierOptions = {}
): MovementStep[] {
  const distance = Math.hypot(target.x - start.x, target.y - start.y);
  
  // Calculate dynamic steps based on distance (minimum 12 steps, max ~60 steps)
  const baseSteps = options.steps ?? Math.max(12, Math.min(60, Math.round(distance / 15)));
  const deviation = options.deviation ?? Math.min(distance * 0.35, 120);
  const jitterAmount = options.jitter ?? 1.2;

  // Generate randomized control points with natural human curvature
  const midX = (start.x + target.x) / 2;
  const midY = (start.y + target.y) / 2;

  const angle = Math.atan2(target.y - start.y, target.x - start.x);
  const perpAngle = angle + (Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
  const randomOffset1 = (Math.random() * 0.8 + 0.2) * deviation;
  const randomOffset2 = (Math.random() * 0.8 + 0.2) * (deviation * 0.6);

  const p0: Point = start;
  const p1: Point = {
    x: start.x + (midX - start.x) * 0.6 + Math.cos(perpAngle) * randomOffset1,
    y: start.y + (midY - start.y) * 0.6 + Math.sin(perpAngle) * randomOffset1,
  };
  const p2: Point = {
    x: midX + (target.x - midX) * 0.5 - Math.cos(perpAngle) * randomOffset2,
    y: midY + (target.y - midY) * 0.5 - Math.sin(perpAngle) * randomOffset2,
  };
  const p3: Point = target;

  const steps: MovementStep[] = [];

  for (let i = 1; i <= baseSteps; i++) {
    // Non-linear pacing: Fitts's Law ease-in-out curve
    const linearT = i / baseSteps;
    // Cubic ease-in-out
    const t =
      linearT < 0.5
        ? 4 * linearT * linearT * linearT
        : 1 - Math.pow(-2 * linearT + 2, 3) / 2;

    const pt = getCubicBezierPoint(p0, p1, p2, p3, t);

    // Add subtle human micro-jitter near the middle of movement
    if (jitterAmount > 0 && i > 2 && i < baseSteps - 2) {
      const jitterX = (Math.random() - 0.5) * jitterAmount;
      const jitterY = (Math.random() - 0.5) * jitterAmount;
      pt.x += jitterX;
      pt.y += jitterY;
    }

    // Dynamic delay per frame: faster in the middle, slower approaching the target
    const progress = i / baseSteps;
    const velocityFactor = Math.sin(progress * Math.PI); // 0 -> 1 -> 0
    const delayMs = Math.round(18 - velocityFactor * 10 + (Math.random() * 4 - 2));

    steps.push({
      point: { x: Math.round(pt.x), y: Math.round(pt.y) },
      delayMs: Math.max(5, delayMs),
    });
  }

  // Optional target overshooting correction
  if (options.overshoot && distance > 100 && Math.random() < 0.35) {
    const overshootDist = Math.random() * 6 + 2;
    const overshootX = target.x + Math.cos(angle) * overshootDist;
    const overshootY = target.y + Math.sin(angle) * overshootDist;

    steps.push({
      point: { x: Math.round(overshootX), y: Math.round(overshootY) },
      delayMs: 35,
    });
    // Settle back precisely onto target
    steps.push({
      point: { x: target.x, y: target.y },
      delayMs: 45,
    });
  }

  return steps;
}
