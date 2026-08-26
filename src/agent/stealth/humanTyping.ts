/**
 * Box-Muller transform for generating standard normally distributed random numbers
 */
function randomGaussian(mean: number, stdDev: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * stdDev + mean;
}

/**
 * Calculates a realistic human inter-keystroke delay based on target Words Per Minute (WPM)
 * and character context (punctuation, spaces, uppercase letters).
 */
export function getHumanKeystrokeDelay(
  char: string,
  prevChar: string,
  targetWPM: number = 70
): number {
  // Average characters per word ~ 5
  // Mean milliseconds per character = (60,000 ms) / (WPM * 5)
  const baseMeanDelay = 60000 / (targetWPM * 5);
  const stdDev = baseMeanDelay * 0.28;

  let rawDelay = randomGaussian(baseMeanDelay, stdDev);

  // Natural human pauses:
  // 1. Longer pause after sentence-ending punctuation (. ? !)
  if (['.', '?', '!'].includes(prevChar)) {
    rawDelay += randomGaussian(280, 60);
  }
  // 2. Medium pause after commas, semicolons, dashes
  else if ([',', ';', '-', ':'].includes(prevChar)) {
    rawDelay += randomGaussian(140, 40);
  }
  // 3. Natural inter-word spacing pause
  else if (prevChar === ' ') {
    rawDelay += randomGaussian(75, 25);
  }

  // 4. Uppercase characters require shift modifier (adds ~40ms)
  if (char !== char.toLowerCase() && char.match(/[A-Z]/)) {
    rawDelay += randomGaussian(45, 15);
  }

  // 5. Special characters / numbers switch hand posture
  if (char.match(/[@#$%^&*()_+{}:"<>?~`]/)) {
    rawDelay += randomGaussian(60, 20);
  }

  // Clamp within realistic human bounds (minimum 25ms, maximum 650ms)
  return Math.max(25, Math.min(650, Math.round(rawDelay)));
}

/**
 * Generates an array of keystroke timing delays for a given text string.
 */
export function planKeystrokeTimings(text: string, targetWPM: number = 70): number[] {
  const delays: number[] = [];
  let prevChar = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const delay = getHumanKeystrokeDelay(char, prevChar, targetWPM);
    delays.push(delay);
    prevChar = char;
  }

  return delays;
}
