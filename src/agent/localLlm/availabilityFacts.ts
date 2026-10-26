import type { PersonaData } from '../../types';

export function isValidTimeZone(value: string): boolean {
  try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
}

export function validProfileDate(value?: string): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : undefined;
}

export function joiningAvailabilityDays(persona: PersonaData, now: Date = new Date()): number | undefined {
  const notice = persona.employmentStatus === 'fresher' || persona.noticeStatus === 'relieved' ? 0 : persona.noticePeriodDays;
  if (persona.joiningDate) {
    const joining = validProfileDate(persona.joiningDate);
    if (!joining) return undefined;
    const zone = persona.availability?.timeZone;
    const parts = new Intl.DateTimeFormat('en', { timeZone: zone && isValidTimeZone(zone) ? zone : undefined, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const part = (type: string): string => parts.find(item => item.type === type)?.value || '';
    const today = `${part('year')}-${part('month')}-${part('day')}`;
    const days = Math.max(0, Math.ceil((Date.parse(`${joining}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000));
    return Math.max(days, notice !== undefined && Number.isFinite(notice) && notice >= 0 ? notice : 0);
  }
  return notice !== undefined && Number.isFinite(notice) && notice >= 0 ? notice : undefined;
}

/** Explicit shift/overlap choices win; unknown preferences remain unanswered. */
export function resolveAvailabilityFact(question: string, persona: PersonaData): string | undefined {
  const q = question.toLowerCase();
  const settings = persona.availability;
  if (/night\s*shift/.test(q) && settings?.nightShift !== undefined) return settings.nightShift ? 'Yes' : 'No';
  if (/rotating\s*shift/.test(q) && settings?.rotatingShift !== undefined) return settings.rotatingShift ? 'Yes' : 'No';
  if (/pacific|eastern|central|mountain|time\s*zone|\bist\b|(?:working[ -]?hours?|overlap).*\bindia\b/.test(q) && settings) {
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

/** Overlap preferences are interpreted by local AI before a control is filled. */
export function needsAvailabilityInterpretation(question: string): boolean {
  return /overlap|night[ -]?shift|rotating[ -]?shift/i.test(question);
}
