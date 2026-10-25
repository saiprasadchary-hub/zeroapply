import type { PersonaData } from '../../types';

export function isGenderQuestion(text: string): boolean {
  return /\b(?:gender|sex)\b/i.test(text) && !/sexual|opposite\s+sex|same\s+sex/i.test(text);
}

function normalizeGender(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[._-]+/g, ' ').replace(/\s+/g, ' ');
  if (/^(male|man|m)$/.test(normalized)) return 'male';
  if (/^(female|woman|f)$/.test(normalized)) return 'female';
  if (/^(non binary|nonbinary)$/.test(normalized)) return 'non-binary';
  if (/decline|prefer not|choose not|do not wish/.test(normalized)) return 'decline';
  return normalized;
}

/** Only use self-reported gender; never derive it from names or shared answer memory. */
export function resolveGenderAnswer(persona?: PersonaData, options?: string[]): string {
  const saved = persona?.gender?.trim() || '';
  if (!options?.length) return saved || 'Decline to self-identify';
  if (saved) {
    const match = options.find((option) => normalizeGender(option) === normalizeGender(saved));
    if (match) return match;
  }
  return options.find((option) => normalizeGender(option) === 'decline') || '';
}
