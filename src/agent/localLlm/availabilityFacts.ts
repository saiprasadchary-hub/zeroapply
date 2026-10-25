import type { PersonaData } from '../../types';

export function isValidTimeZone(value: string): boolean {
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
}

/** Explicit shift/overlap choices win; unknown preferences remain unanswered. */
export function resolveAvailabilityFact(question: string, persona: PersonaData): string | undefined {
  const q = question.toLowerCase();
  const settings = persona.availability;
  if (/night\s*shift/.test(q) && settings?.nightShift !== undefined) return settings.nightShift ? 'Yes' : 'No';
  if (/rotating\s*shift/.test(q) && settings?.rotatingShift !== undefined) return settings.rotatingShift ? 'Yes' : 'No';
  if (/pacific|eastern|central|mountain|time\s*zone|\bist\b/.test(q) && settings) {
    const zone = /pacific/.test(q) ? 'pacific' : /eastern/.test(q) ? 'eastern' : /central/.test(q) ? 'central' : /mountain/.test(q) ? 'mountain' : /\bist\b|india/.test(q) ? 'india' : '';
    const answer = zone ? settings.overlap?.[zone] : undefined;
    return answer === undefined ? '' : answer ? 'Yes' : 'No';
  }
  if (/preferred.*(?:working|work).*hours|(?:working|work).*hours.*availab/.test(q) && settings) {
    if (!settings.timeZone || !isValidTimeZone(settings.timeZone) || !settings.start || !settings.end) return '';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(settings.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(settings.end)) return '';
    return `${settings.start}–${settings.end} (${settings.timeZone})`;
  }
  return undefined;
}
