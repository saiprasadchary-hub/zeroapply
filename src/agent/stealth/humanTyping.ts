/**
 * ZeroApply Stealth - Human Typing Simulator
 * Simulates realistic Gaussian keystroke delays (25ms–650ms) with natural
 * punctuation pauses after commas, periods, and sentence breaks.
 */

/**
 * Returns a single realistic human keystroke delay in milliseconds.
 */
export function getHumanKeystrokeDelay(targetWpm = 65): number {
  // Average characters per word ~ 5
  // Mean delay in ms = (60,000 / (targetWpm * 5))
  const meanDelay = 60000 / (targetWpm * 5); // ~184ms for 65 WPM

  // Box-Muller transform for normal distribution
  const u1 = Math.max(Math.random(), 1e-6);
  const u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

  const stdDev = 35;
  const rawDelay = Math.round(meanDelay + z * stdDev);

  // Clamp within realistic human physiological bounds (25ms - 650ms)
  return Math.min(Math.max(rawDelay, 25), 650);
}

/**
 * Generates an array of keystroke delays for an entire string,
 * incorporating realistic human micro-pauses after punctuation and spaces.
 */
export function planKeystrokeTimings(text: string, targetWpm = 65): number[] {
  if (!text) return [];

  const timings: number[] = [];

  for (let i = 0; i < text.length; i++) {
    let delay = getHumanKeystrokeDelay(targetWpm);
    const prevChar = i > 0 ? text[i - 1] : '';

    // Human pause after punctuation
    if (prevChar === ',' || prevChar === ';') {
      delay += Math.round(80 + Math.random() * 90); // 80ms - 170ms pause after comma
    } else if (prevChar === '.' || prevChar === '!' || prevChar === '?') {
      delay += Math.round(140 + Math.random() * 150); // 140ms - 290ms pause after period
    } else if (prevChar === ' ') {
      delay += Math.round(20 + Math.random() * 40); // slight word boundary hesitation
    }

    // Clamp within bounds
    timings.push(Math.min(Math.max(delay, 25), 650));
  }

  return timings;
}
