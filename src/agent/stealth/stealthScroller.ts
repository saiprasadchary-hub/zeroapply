/**
 * Generates smooth human inertial scroll steps with ease-out friction.
 */
export interface ScrollStep {
  deltaY: number;
  delayMs: number;
}

export function generateHumanScrollSteps(totalDeltaY: number, durationMs: number = 400): ScrollStep[] {
  const stepsCount = Math.max(6, Math.round(durationMs / 30));
  const steps: ScrollStep[] = [];
  let remainingDelta = totalDeltaY;

  for (let i = 1; i <= stepsCount; i++) {
    // Ease-out quadratic profile
    const progress = i / stepsCount;
    const factor = 1 - progress;
    const stepDelta = Math.round((totalDeltaY / stepsCount) * (1 + factor * 0.8));

    steps.push({
      deltaY: stepDelta,
      delayMs: Math.round(durationMs / stepsCount + (Math.random() * 8 - 4)),
    });
    remainingDelta -= stepDelta;
  }

  // Adjust any rounding difference on the final step
  if (remainingDelta !== 0 && steps.length > 0) {
    steps[steps.length - 1].deltaY += remainingDelta;
  }

  return steps;
}

/**
 * Returns a randomized natural reading pause duration between min and max.
 */
export function getReadingPause(minMs: number = 800, maxMs: number = 2200): number {
  return Math.round(minMs + Math.random() * (maxMs - minMs));
}
